/**
 * Read the updated Excel inventory file and upsert product name, description,
 * price, colour, and per-size stock quantities into Supabase.
 *
 * Run from project root:
 *   node --use-system-ca scripts/update-from-excel.mjs
 *
 * - Updates existing products (matched by SKU + gender)
 * - Creates new products as inactive (price > 0 sets them active)
 * - Backpacks: collects multi-line descriptions from bullet-point rows
 * - Rows whose SKU is reused for two different products within the source
 *   spreadsheet are held back rather than guessed at (see summary at the end)
 * - Inventory: every (size, qty) pair found under a SKU is upserted into the
 *   `inventory` table (onConflict product_id+size), so re-running this after
 *   the client updates stock counts keeps the site in sync. A blank Qty cell
 *   is treated as 0 (in stock as an option, shown "Sold Out" on the site)
 *   rather than skipped, since the sheet still lists it as a real size.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'

// ── Config ───────────────────────────────────────────────────────────────────
const EXCEL_PATH = 'C:/Users/Superuser/Downloads/Mokids Store Inventory (7).xlsx'

const envFile = readFileSync('C:/Users/Superuser/mokids-store/.env.local', 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ── Sheet configurations ──────────────────────────────────────────────────────
// Columns are 0-indexed against the sheet's RAW rows (row 0 = whatever title
// banner is at the top of that sheet — always skipped). `colour`/`qty` may be
// null when a sheet has no such column (e.g. the CLARKS/EASY-FIT shoe sheets).
//
// Note: "B - Polo" used to mean 2pc sets in older exports (hence the old
// 'boys-sets' mapping). This file splits that into two real sheets — keep
// them separate or price/name updates silently land on the wrong products.
//
// Jeans/chinos family re-enabled as of v7: client fixed the SKU collision by
// giving "Straight Jeans" its own SKU (MOKIDSJEAN001) instead of reusing
// Skinny Jeans' SJ002 — verified every remaining SKU in this family matches
// at most one real DB product now (see conversation history for the check).
//
// "G- Short Jeans" is deliberately EXCLUDED: its SKUs (MokidsJ001-009) were
// already hand-reconciled onto real, differently-numbered DB products
// (MOKIDSSH001-010, category girls-shorts) earlier — the SKUs never matched
// between sheet and DB, so running this generic sync against it would create
// 9 brand-new duplicate products instead of updating the real ones.
//
// "B - Graphic Tees (Lng sleeve)" is still excluded — its SKUs collided with
// real Long Sleeve Shirt SKUs; those 3 products were recreated separately
// under new MOKIDSGLS001-003 SKUs.
const SHEETS = [
  // sheet name                        gender  category                sku  name colour size price qty  multiLineDesc
  ['G - Dresses',                      'girls', 'girls-dresses',        0,   1,   2,     3,   5,    6,   false],
  ['G - Leggings',                     'girls', 'girls-leggings',       0,   1,   2,     3,   4,    5,   false],
  ['GIRLS SCH SHOE',                   'girls', 'girls-shoes',          0,   1,   null,  2,   4,    3,   false],
  ['G- School Bags',                   'girls', 'back-to-school-girls',0,   1,   2,     3,   4,    5,   true ],
  ['Copy of G - Underwear,Thight & ',  'girls', 'girls-underwear',      0,   1,   2,     3,   5,    6,   false],
  ['G - Skinny Jeans',                 'girls', 'girls-jeans',          7,   1,   2,     3,   4,    5,   false],
  ['G - Boot cut',                     'girls', 'girls-jeans',          7,   1,   2,     3,   4,    5,   false],
  ['G- Straight jeans',                'girls', 'girls-jeans',          7,   1,   2,     3,   4,    5,   false],
  ['G- Chinos',                        'girls', 'girls-jeans',          7,   1,   2,     3,   4,    5,   false],
  ['G- Dungeon',                       'girls', 'girls-jeans',          7,   1,   2,     3,   4,    5,   false],
  ['G - Birthday Tees',                'girls', 'birthday-tees',        7,   1,   2,     3,   4,    5,   false],
  ['B - Polo 2pc set',                 'boys',  'boys-sets',            0,   1,   2,     3,   4,    5,   false],
  ['B - Polo',                         'boys',  'boys-polo',            0,   1,   2,     3,   4,    5,   false],
  ['B - Shirts',                       'boys',  'boys-shirts',          0,   2,   3,     4,   5,    6,   false],
  ['Copy of B - Shirts',               'boys',  'boys-shirts',          0,   2,   3,     4,   5,    6,   false],
  ['BOYS SCH SHOE',                    'boys',  'boys-shoes',           0,   1,   null,  2,   4,    3,   false],
  ['Copy of B - School Backpack & T',  'boys',  'back-to-school-boys',  0,   1,   2,     3,   4,    5,   true ],
  ['B - Trousers',                     'boys',  'boys-trousers',        7,   1,   2,     3,   4,    5,   false],
  ['B - Shorts',                       'boys',  'boys-shorts',          7,   1,   2,     3,   4,    5,   false],
  ['B - Graphic Tees',                 'boys',  'boys-graphic-tees',    7,   1,   2,     3,   4,    5,   false],
  ['B - Birthday Tees',                'boys',  'birthday-tees',        7,   1,   2,     3,   4,    5,   false],
]

// Individually verified corrections (checked raw cell + real DB/photo state by hand —
// see conversation history for the evidence behind each one)
const MANUAL_SKU_FIXES = {
  'MOKIDS0011': 'MOKIDSP011', 'MOKIDS0012': 'MOKIDSP012', 'MOKIDS0013': 'MOKIDSP013',
  'MOKIDS0014': 'MOKIDSP014', 'MOKIDSS0015': 'MOKIDSP015', 'MOKIDSS0016': 'MOKIDSP016',
  'MOKIDSUW0014': 'MOKIDSUW014',
  'MOKIDSUW)27': 'MOKIDSUW027',
  // Found via a dry-run diff before this script wrote inventory for the first
  // time: these sheet cells are missing a letter and would otherwise either
  // recreate a product that already exists correctly under the right SKU
  // (D010, D040, SC010), or — worse — fail SKU detection entirely and get
  // silently merged into whichever product's rows came right before it
  // (MOKISD011, missing the "D" in "MOKID", swallowed "Champagne Gold Ball
  // Dress" into D010's group until this was caught).
  'MOKIDD010': 'MOKIDSD010',
  'MOKIDD040': 'MOKIDSD040',
  'MOKISD011': 'MOKIDSD011',
  'MOKIDSSSC10': 'MOKIDSSC010',
}

// ── SKU normalisation ─────────────────────────────────────────────────────────
function normSku(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const sku = raw.trim().toUpperCase().replace(/\s+/g, '')
  const fixed = sku.replace(/^MOKIDBSET/, 'MOKIDSBSET')
  return MANUAL_SKU_FIXES[fixed] || fixed
}

// A few rows list two SKUs joined by "/" for one shared description (verified:
// e.g. "MokidsD012/ mokidsD013" — D012 already carries this exact name/price
// from a prior sync, confirming both SKUs share one physical product)
function splitSkus(raw) {
  if (typeof raw !== 'string') return [raw]
  return raw.split('/').map(s => s.trim()).filter(Boolean)
}

function isValidSku(val) {
  return typeof val === 'string' && /^mokids?/i.test(val.trim())
}

function cleanSize(val) {
  const s = String(val ?? '').trim()
  return s && s !== '"' ? s : ''
}

// A blank Qty cell means "not entered yet", not necessarily zero — but a
// literal 0 or a real number both carry real information. Only truly blank
// cells are treated as 0 so the size still shows up (as sold out) rather than
// silently vanishing from the product.
function cleanQty(val) {
  if (typeof val === 'number') return Math.max(0, Math.round(val))
  if (val === '' || val === null || val === undefined) return 0
  const n = Number(val)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}

// ── Extract products from a sheet ─────────────────────────────────────────────
function extractProducts(wb, sheetName, cols, multiLineDesc) {
  const { sku: skuCol, name: nameCol, colour: colourCol, size: sizeCol, price: priceCol, qty: qtyCol } = cols
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const products = []
  let currentGroup = null // array of product stubs sharing one price/descLines (rows listing 2+ SKUs for one shared description)

  for (let i = 1; i < rows.length; i++) { // row 0 is always a title banner, never data
    const row = rows[i]
    const rawSku = row[skuCol]
    const nameRaw = String(row[nameCol] || '').trim()
    // Use only the first line as the product name (Excel cells can contain multi-line text)
    const nameVal = nameRaw === 'null' ? '' : nameRaw.split('\n')[0].trim()
    const colourVal = colourCol != null ? String(row[colourCol] || '').trim() : ''
    const sizeVal = cleanSize(row[sizeCol])
    const priceVal = typeof row[priceCol] === 'number' && row[priceCol] > 0 ? Math.round(row[priceCol]) : null
    const hasQtyCell = row[qtyCol] !== '' && row[qtyCol] !== undefined
    const qtyVal = cleanQty(row[qtyCol])

    // Manual fixes must run BEFORE the validity check, not after — a typo'd
    // cell (e.g. "MOKISD011", missing the "D") fails isValidSku on the raw
    // text, and would otherwise never reach normSku at all, silently getting
    // treated as a continuation row of whatever product came before it.
    const skus = typeof rawSku === 'string' ? splitSkus(rawSku).map(normSku).filter(isValidSku) : []

    if (skus.length > 0) {
      if (currentGroup) products.push(...currentGroup)
      const shared = { price: priceVal, colour: colourVal, descLines: nameVal ? [nameVal] : [] }
      currentGroup = skus.map(sku => ({ sku, name: nameVal || null, description: nameVal || null, shared, sizes: [] }))
      // A row with a price/qty but no size at all (e.g. backpacks) still represents
      // one real unit of stock — record it under a generic "One Size" label.
      if (sizeVal || hasQtyCell) {
        const size = sizeVal || 'One Size'
        currentGroup.forEach(p => p.sizes.push({ size, quantity: qtyVal }))
      }
    } else if (currentGroup) {
      // Continuation row — either another size/qty pair, or (for backpacks) a
      // description bullet line, or a late-arriving price for the group.
      if (multiLineDesc && nameVal && nameVal !== '"') {
        currentGroup[0].shared.descLines.push(nameVal)
      } else if (priceVal && !currentGroup[0].shared.price) {
        currentGroup[0].shared.price = priceVal
      }
      if (sizeVal && hasQtyCell) {
        currentGroup.forEach(p => p.sizes.push({ size: sizeVal, quantity: qtyVal }))
      }
    }
  }
  if (currentGroup) products.push(...currentGroup)

  // For backpacks: join all description lines
  return products.map(p => ({
    sku: p.sku,
    name: p.name,
    description: multiLineDesc && p.shared.descLines.length > 1
      ? p.shared.descLines.join('\n')
      : p.description,
    price: p.shared.price,
    colour: p.shared.colour,
    sizes: p.sizes,
  })).filter(p => p.sku)
}

// ── Main ──────────────────────────────────────────────────────────────────────
const wb = XLSX.readFile(EXCEL_PATH)

// Pass 1: extract everything, tagged with source sheet, before writing anything
const all = []
for (const [sheetName, gender, category, sku, name, colour, size, price, qty, multiLine] of SHEETS) {
  const products = extractProducts(wb, sheetName, { sku, name, colour, size, price, qty }, multiLine)
    .filter(p => p.name || p.price || p.sizes.length)
  console.log(`[${sheetName}] — ${products.length} usable row(s)`)
  for (const p of products) all.push({ ...p, sheetName, gender, category })
}

// Verified split: MOKIDSUW025 was claimed by two different products (a 4-pack and
// a 5-pack M&S camisole). The real photo already on file for UW025 was inspected
// and shows 5 layered camisoles, so UW025 stays the 5-pack; the 4-pack moves to
// a fresh, unused SKU (no photo yet, will need one uploaded separately).
for (const p of all) {
  if (p.sku === 'MOKIDSUW025' && p.gender === 'girls' && /4\s*pack/i.test(p.name || '')) {
    p.sku = 'MOKIDSUW029'
  }
}

// Pass 2: find SKUs reused across rows with conflicting name/price — hold ALL of
// them back, we can't safely guess which one is correct. (Differing sizes alone
// don't count as a conflict — that's normal, e.g. two colourways of one style.)
const byKey = new Map()
for (const p of all) {
  const key = `${p.sku}|${p.gender}`
  if (!byKey.has(key)) byKey.set(key, [])
  byKey.get(key).push(p)
}
const held = []
const toProcess = []
for (const group of byKey.values()) {
  const distinct = new Set(group.map(p => `${p.name}|${p.price}`))
  if (distinct.size > 1) {
    held.push(...group)
  } else {
    // Merge sizes from every row sharing this SKU (e.g. continuation rows
    // that got split into separate group entries by an intervening blank row)
    const merged = { ...group[0], sizes: group.flatMap(p => p.sizes) }
    toProcess.push(merged)
  }
}

// Pass 3: write. Exact SKU+gender match -> update. No match -> genuinely new product.
let updated = 0, created = 0, unchanged = 0, invSynced = 0, errors = 0

for (const p of toProcess) {
  const { data: existing } = await supabase
    .from('products')
    .select('id, name, price, colour')
    .ilike('sku', p.sku)
    .eq('gender', p.gender)
    .maybeSingle()

  const nameChanged = !!p.name && (!existing || existing.name !== p.name)
  const priceChanged = !!p.price && (!existing || existing.price !== p.price)
  const colourChanged = !!p.colour && (!existing || existing.colour !== p.colour)

  let productId = existing?.id ?? null

  if (existing && !nameChanged && !priceChanged && !colourChanged) {
    unchanged++
  } else {
    process.stdout.write(`  ${p.sku} — "${p.name}" @ ₦${p.price?.toLocaleString() ?? 'TBD'}...`)
    try {
      if (existing) {
        const update = {}
        if (p.name)   { update.name = p.name; update.description = p.description }
        if (p.price)  { update.price = p.price; update.is_active = true }
        if (p.colour) update.colour = p.colour
        await supabase.from('products').update(update).eq('id', existing.id)
        console.log(' updated')
        updated++
      } else {
        const { data: inserted, error } = await supabase.from('products').insert({
          sku: p.sku,
          name: p.name || p.sku,
          description: p.description || p.name || p.sku,
          price: p.price ?? 0,
          category: p.category,
          gender: p.gender,
          colour: p.colour || '',
          images: [],
          is_active: !!(p.price && p.price > 0),
        }).select('id').single()
        if (error) throw error
        productId = inserted.id
        console.log(' created (new)')
        created++
      }
    } catch (err) {
      console.log(` ERROR: ${err?.message || JSON.stringify(err)}`)
      errors++
      continue
    }
  }

  // Sync inventory regardless of whether name/price/colour changed — this is
  // exactly the gap that left hundreds of products showing "Sold Out" despite
  // the sheet listing real stock, since nothing previously wrote this table.
  if (productId && p.sizes.length) {
    for (const { size, quantity } of p.sizes) {
      const { error } = await supabase
        .from('inventory')
        .upsert({ product_id: productId, size, quantity }, { onConflict: 'product_id,size' })
      if (error) console.log(`    inventory ERROR (${p.sku} / ${size}): ${error.message}`)
    }
    invSynced++
  }
}

console.log(`\n✓ Done. Updated: ${updated}  Created: ${created}  Unchanged: ${unchanged}  Inventory synced: ${invSynced}  Errors: ${errors}`)
console.log(`Held back (not written): ${held.length} rows — same SKU used for different items in the spreadsheet itself`)

if (held.length) {
  const heldByKey = new Map()
  for (const p of held) {
    const key = `${p.sku}|${p.gender}`
    if (!heldByKey.has(key)) heldByKey.set(key, [])
    heldByKey.get(key).push(p)
  }
  console.log(`\n⚠ Resolve manually in the source spreadsheet, then re-run:`)
  for (const [, group] of heldByKey) {
    console.log(`  ${group[0].sku} (${group[0].gender}):`)
    for (const p of group) console.log(`    [${p.sheetName}] "${p.name}" @ ₦${p.price}`)
  }
}
