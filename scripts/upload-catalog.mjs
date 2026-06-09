/**
 * Bulk upload product images to Cloudinary and upsert products in Supabase.
 * Run: node scripts/upload-catalog.mjs
 *
 * Scans C:\Users\Superuser\Downloads\mokids-images for SKU-named folders,
 * uploads all images inside each to Cloudinary, then upserts the product
 * in Supabase with the resulting image URLs.
 */

// Required on this machine due to corporate SSL certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname, basename, dirname } from 'path'
import { createClient } from '@supabase/supabase-js'
import { v2 as cloudinary } from 'cloudinary'

// ── Load .env.local ─────────────────────────────────────────────────────────
const envFile = readFileSync('C:/Users/Superuser/Momo/mokids-store/.env.local', 'utf8')
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

const IMAGES_ROOT = 'C:/Users/Superuser/Downloads/mokids-images'
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'])

// ── Category / gender inference from path ───────────────────────────────────
function inferMeta(folderPath) {
  const p = folderPath.toLowerCase().replace(/\\/g, '/')
  const gender = p.includes('/boys/') ? 'boys' : 'girls'

  if (p.includes('/dresses/'))               return { gender: 'girls', category: 'girls-dresses' }
  if (p.includes('/graphic tees/birthday'))  return { gender, category: 'girls-graphic-tees' }
  if (p.includes('/graphic tees/') && gender === 'girls') return { gender: 'girls', category: 'girls-graphic-tees' }
  if (p.includes('/graphic tees/') && gender === 'boys')  return { gender: 'boys',  category: 'boys-graphic-tees' }
  if (p.includes('/jumpsuit/'))              return { gender: 'girls', category: 'girls-jumpsuits' }
  if (p.includes('/tops/'))                  return { gender: 'girls', category: 'girls-tops' }
  if (p.includes('/shoes/') || p.includes('/sandals/')) return { gender, category: `${gender}-shoes` }
  if (p.includes('/shirt/long sleeves/'))    return { gender: 'boys',  category: 'boys-shirts' }
  if (p.includes('/shirt/short sleeves/'))   return { gender: 'boys',  category: 'boys-shirts' }
  if (p.includes('/pajamas') || p.includes('/night gowns')) return { gender, category: `${gender}-pyjamas` }
  if (p.includes('/polo/'))                  return { gender: 'boys',  category: 'boys-polo' }
  if (p.includes('/shorts/'))                return { gender, category: `${gender}-shorts` }
  if (p.includes('/trousers/'))              return { gender: 'boys',  category: 'boys-trousers' }
  if (p.includes('/legging'))                return { gender: 'girls', category: 'girls-leggings' }
  if (p.includes('/skirts'))                 return { gender: 'girls', category: 'girls-skirts' }
  if (p.includes('/underwear'))              return { gender, category: `${gender}-underwear` }
  if (p.includes('/jeans') || p.includes('/chinos')) return { gender, category: `${gender}-jeans` }
  if (p.includes('/jacket'))                 return { gender: 'girls', category: 'girls-jackets' }

  return { gender, category: `${gender}-misc` }
}

// ── Human-readable name from SKU ─────────────────────────────────────────────
function skuToName(sku, category) {
  const num = sku.match(/\d+/)?.[0] || '000'
  const n = parseInt(num, 10).toString().padStart(3, '0')
  const map = {
    'girls-dresses': `Girls Dress ${n}`,
    'girls-graphic-tees': sku.toUpperCase().includes('BD') ? `Birthday Tee ${n}` : `Girls Graphic Tee ${n}`,
    'girls-jumpsuits': `Girls Jumpsuit ${n}`,
    'girls-tops': `Girls Top ${n}`,
    'girls-shoes': `Girls Shoes ${n}`,
    'girls-pyjamas': `Girls Pyjamas ${n}`,
    'boys-shirts': sku.toUpperCase().includes('LS') ? `Boys Long Sleeve Shirt ${n}` : `Boys Short Sleeve Shirt ${n}`,
    'boys-polo': `Boys Polo ${n}`,
    'boys-pyjamas': `Boys Pyjamas ${n}`,
    'boys-shoes': `Boys Shoes ${n}`,
    'boys-shorts': `Boys Shorts ${n}`,
    'boys-trousers': `Boys Trousers ${n}`,
    'boys-graphic-tees': `Boys Graphic Tee ${n}`,
  }
  return map[category] || `${sku} Product`
}

// ── Walk directory for SKU folders ──────────────────────────────────────────
function findSkuFolders(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      // SKU folder names start with "Mokids" (case-insensitive)
      if (/^mokids/i.test(entry)) {
        results.push(full)
      } else {
        findSkuFolders(full, results)
      }
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
const skuFolders = findSkuFolders(IMAGES_ROOT)
console.log(`Found ${skuFolders.length} SKU folders\n`)

let seeded = 0, updated = 0, errors = 0

for (const folder of skuFolders) {
  const sku = basename(folder).toUpperCase()
  const { gender, category } = inferMeta(folder)

  // Collect image files (skip thumbs/hidden files)
  const files = readdirSync(folder)
    .filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()) && !f.startsWith('.'))
    .map(f => join(folder, f))

  if (files.length === 0) {
    console.log(`  ⚠ ${sku} — no images, skipping`)
    continue
  }

  process.stdout.write(`  ${sku} (${category}) — uploading ${files.length} image(s)...`)

  try {
    const urls = []
    for (const file of files) {
      const url = await uploadImage(file, sku)
      urls.push(url)
    }

    // Check if product exists
    const { data: existing } = await supabase
      .from('products')
      .select('id, images')
      .ilike('sku', sku)
      .single()

    if (existing) {
      // Merge new URLs with existing (dedup)
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
        is_active: false, // inactive until price is set
      })
      if (error) throw error
      console.log(` created "${name}" (inactive, set price in admin)`)
      seeded++
    }
  } catch (err) {
    console.log(` ERROR: ${err?.message || err?.error || JSON.stringify(err)}`)
    errors++
  }
}

console.log(`\nDone. Created: ${seeded}  Updated: ${updated}  Errors: ${errors}`)
