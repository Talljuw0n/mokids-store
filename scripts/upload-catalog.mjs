/**
 * Bulk upload product images to Cloudinary and upsert products in Supabase.
 * Run from project root: node --use-system-ca scripts/upload-catalog.mjs
 *
 * Scans BOYS_NEW/BOYS and GIRLS_NEW/GIRLS for SKU-named folders,
 * uploads all images to Cloudinary, then upserts the product in Supabase.
 * Existing products (matched by SKU + gender) get new images merged in.
 * New products are created as inactive (price = 0) until set in admin.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname, basename } from 'path'
import { createClient } from '@supabase/supabase-js'
import { v2 as cloudinary } from 'cloudinary'

// ── Load .env.local ─────────────────────────────────────────────────────────
const envFile = readFileSync('C:/Users/Superuser/mokids-store/.env.local', 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

cloudinary.config({
  cloud_name: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

// Scan both new catalog folders
const ROOTS = [
  'C:/Users/Superuser/Downloads/BOYS_NEW2/BOYS',
  'C:/Users/Superuser/Downloads/GIRLS_NEW2/GIRLS',
]

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.heic', '.heif'])

// ── SKU normalisation ────────────────────────────────────────────────────────
function normaliseSku(folderName) {
  // Strip parenthesised suffixes like (1), remove spaces, then uppercase
  let sku = folderName.replace(/\([^)]*\)/g, '').trim().replace(/\s+/g, '').toUpperCase()
  // Fix known mis-spellings in folder names
  sku = sku.replace(/^MOKIDBSET/, 'MOKIDSBSET')   // MOKIDBSET → MOKIDSBSET
  return sku
}

// ── Category / gender inference from path ───────────────────────────────────
function inferMeta(folderPath) {
  const p = folderPath.toLowerCase().replace(/\\/g, '/')
  const gender = p.includes('/boys/') || p.includes('/boys_new/') ? 'boys' : 'girls'

  // Birthday tees — must come before general graphic-tees check
  if (p.includes('/birthday tees/'))   return { gender, category: 'birthday-tees' }

  // Girls clothing
  if (p.includes('/dresses/'))         return { gender: 'girls', category: 'girls-dresses' }
  if (p.includes('/jumpsuit/'))        return { gender: 'girls', category: 'girls-jumpsuits' }
  if (p.includes('/legging'))          return { gender: 'girls', category: 'girls-leggings' }
  if (p.includes('/tops/'))            return { gender: 'girls', category: 'girls-tops' }
  if (p.includes('/underwear'))        return { gender, category: `${gender}-underwear` }
  if (p.includes('/pajamas') || p.includes('/night gown') || p.includes('/2-piece set'))
                                       return { gender, category: `${gender}-pyjamas` }

  // Graphic tees (after birthday check)
  if (p.includes('/graphic tees/'))    return { gender, category: gender === 'boys' ? 'boys-shirts' : 'girls-graphic-tees' }

  // Boys clothing
  if (p.includes('/shirt/'))           return { gender: 'boys', category: 'boys-shirts' }
  if (p.includes('/polo/'))            return { gender: 'boys', category: 'boys-polo' }
  if (p.includes('/2pcs set/'))        return { gender: 'boys', category: 'boys-sets' }
  if (p.includes('/trousers/'))        return { gender: 'boys', category: 'boys-trousers' }

  // Shorts (girls or boys depending on path gender)
  if (p.includes('/shorts/'))          return { gender, category: `${gender}-shorts` }

  // Jeans & chinos — girls only (boys jeans are in /trousers/ or /shorts/)
  if (p.includes('/jeans') || p.includes('/chinos'))
                                       return { gender: 'girls', category: 'girls-jeans' }

  // Shoes — all types map to shoes category
  if (p.includes('/dress shoe/') || p.includes('/sandals/') || p.includes('/school shoe') ||
      p.includes('/sneakers') || p.includes('/slippers') || p.includes('/slides') ||
      p.includes('/outing') || p.includes('/casual') || p.includes('/shoes/'))
                                       return { gender, category: `${gender}-shoes` }

  // Backpacks → back-to-school (no leading-slash check — folder names have spaces before "backpack")
  if (p.includes('backpack') || p.includes('trolley') || p.includes('school bag'))
                                       return { gender, category: gender === 'boys' ? 'back-to-school-boys' : 'back-to-school-girls' }

  return { gender, category: `${gender}-misc` }
}

// ── Human-readable name from SKU ─────────────────────────────────────────────
function skuToName(sku, category) {
  const num = sku.match(/\d+$/)?.[0] || sku.match(/\d+/)?.[0] || '000'
  const n = parseInt(num, 10).toString().padStart(3, '0')
  const u = sku.toUpperCase()

  const map = {
    'girls-dresses':      `Girls Dress ${n}`,
    'girls-graphic-tees': u.includes('BD') ? `Girls Birthday Tee ${n}` : `Girls Graphic Tee ${n}`,
    'birthday-tees':      u.includes('BD') ? `Girls Birthday Tee ${n}` : `Boys Birthday Tee ${n}`,
    'girls-jumpsuits':    `Girls Jumpsuit ${n}`,
    'girls-leggings':     `Girls Leggings ${n}`,
    'girls-shorts':       `Girls Shorts ${n}`,
    'girls-jeans':        `Girls Jeans ${n}`,
    'back-to-school-girls': `Girls School Bag ${n}`,
    'girls-tops':         u.includes('MOKIDLS') ? `Girls Long Sleeve Top ${n}` :
                          u.includes('MOKIDSSL') ? `Girls Short Sleeve Top ${n}` :
                          u.includes('MOKIDSTC') ? `Girls Camisole ${n}` :
                          u.includes('MOKIDSSS') ? `Girls Sweatshirt ${n}` :
                          `Girls Top ${n}`,
    'girls-shoes':        u.includes('DRESSSHOE') ? `Girls Dress Shoe ${n}` :
                          u.includes('SANDALS')   ? `Girls Sandals ${n}` :
                          u.includes('SC')        ? `Girls School Shoe ${n}` :
                          `Girls Shoes ${n}`,
    'girls-underwear':    `Girls Underwear ${n}`,
    'girls-pyjamas':      `Girls Pyjamas ${n}`,
    'boys-shirts':        u.includes('LS') ? `Boys Long Sleeve Shirt ${n}` : `Boys Short Sleeve Shirt ${n}`,
    'boys-polo':          `Boys Polo ${n}`,
    'boys-sets':          `Boys 2PCS Set ${n}`,
    'boys-pyjamas':       `Boys Pyjamas ${n}`,
    'boys-shoes':         u.includes('SC') ? `Boys School Shoe ${n}` : `Boys Shoes ${n}`,
    'boys-shorts':        `Boys Shorts ${n}`,
    'boys-trousers':      `Boys Trousers ${n}`,
    'back-to-school-boys': `Boys School Bag ${n}`,
    'boys-underwear':     `Boys Underwear ${n}`,
  }
  return map[category] || `${sku} Product`
}

// ── Walk directory for SKU folders ──────────────────────────────────────────
function findSkuFolders(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (/^mokids?/i.test(entry)) {
        results.push(full)
      }
      // Always recurse — Mokids folders may contain nested SKU sub-folders
      findSkuFolders(full, results)
    }
  }
  return results
}

// ── Upload one file to Cloudinary ────────────────────────────────────────────
async function uploadImage(filePath, sku) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `mokids/${sku.toLowerCase()}`,
    use_filename: false,
    unique_filename: true,
    resource_type: 'image',
  })
  return result.secure_url
}

// ── Main ─────────────────────────────────────────────────────────────────────
const skuFolders = []
for (const root of ROOTS) {
  findSkuFolders(root, skuFolders)
}
console.log(`Found ${skuFolders.length} SKU folders across both catalogs\n`)

let seeded = 0, updated = 0, skipped = 0, errors = 0

for (const folder of skuFolders) {
  const sku = normaliseSku(basename(folder))
  const { gender, category } = inferMeta(folder)

  const files = readdirSync(folder)
    .filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()) && !f.startsWith('.'))
    .map(f => join(folder, f))

  if (files.length === 0) {
    console.log(`  ⚠ ${sku} — no images, skipping`)
    skipped++
    continue
  }

  process.stdout.write(`  ${sku} (${gender}/${category}) — uploading ${files.length} image(s)...`)

  try {
    const urls = []
    for (const file of files) {
      const url = await uploadImage(file, sku)
      urls.push(url)
    }

    // Look up by SKU + gender to avoid conflicts where same SKU exists for boys and girls
    const { data: existing } = await supabase
      .from('products')
      .select('id, images')
      .ilike('sku', sku)
      .eq('gender', gender)
      .maybeSingle()

    if (existing) {
      const merged = [...new Set([...(existing.images || []), ...urls])]
      await supabase.from('products').update({ images: merged }).eq('id', existing.id)
      console.log(` updated (${merged.length} images total)`)
      updated++
    } else {
      const name = skuToName(sku, category)
      const { error } = await supabase.from('products').insert({
        sku,
        name,
        description: name,
        price: 0,
        category,
        gender,
        colour: '',
        images: urls,
        is_active: false,
      })
      if (error) throw error
      console.log(` created "${name}" (inactive)`)
      seeded++
    }
  } catch (err) {
    console.log(` ERROR: ${err?.message || err?.error || JSON.stringify(err)}`)
    errors++
  }
}

console.log(`\nDone. Created: ${seeded}  Updated: ${updated}  Skipped (no images): ${skipped}  Errors: ${errors}`)
