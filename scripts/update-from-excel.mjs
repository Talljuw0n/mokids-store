/**
 * Read the updated Excel inventory file and upsert product name, description,
 * and price into Supabase.
 *
 * Run from project root:
 *   node --use-system-ca scripts/update-from-excel.mjs
 *
 * - Updates existing products (matched by SKU + gender)
 * - Creates new products as inactive (price > 0 sets them active)
 * - Backpacks: collects multi-line descriptions from bullet-point rows
 * - Rows whose SKU is reused for two different products within the source
 *   spreadsheet are held back rather than guessed at (see summary at the end)
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'

// ── Config ───────────────────────────────────────────────────────────────────
const EXCEL_PATH = 'C:/Users/Superuser/Downloads/Mokids Store Inventory (6).xlsx'

const envFile = readFileSync('C:/Users/Superuser/mokids-store/.env.local', 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ── Sheet configurations ──────────────────────────────────────────────────────
// [sheetName, gender, category, skuCol, nameCol, priceCol, skipRows, multiLineDesc]
//
// Note: "B - Polo" used to mean 2pc sets in older exports (hence the old
// 'boys-sets' mapping). This file splits that into two real sheets — keep
// them separate or price/name updates silently land on the wrong products.
//
// Excluded entirely: the jeans/chinos family (Skinny Jeans, Boot cut, Straight
// jeans, Chinos, Short Jeans, Dungeon) — verified the sheets' "SJ"/"J" SKU
// prefixes don't reliably match the real photo folders (e.g. "G - Skinny
// Jeans" uses "SJ" codes that actually belong to the real "straight jeans"
// photos). Needs manual reconciliation in the source file before syncing.
// "B - Graphic Tees (Lng sleeve)" is excluded too — its SKUs collided with
// real Long Sleeve Shirt SKUs; those 3 products were recreated separately
// under new MOKIDSGLS001-003 SKUs.
const SHEETS = [
  ['G - Dresses',                    'girls', 'girls-dresses',        'Girls  —  Dresses',  '__EMPTY',    '__EMPTY_4', 1, false],
  ['G - Leggings',                   'girls', 'girls-leggings',       'Girls  —  Leggings', '__EMPTY',    '__EMPTY_3', 2, false],
  ['GIRLS SCH SHOE',                 'girls', 'girls-shoes',          '__EMPTY',            'CLARKS SHOE','__EMPTY_3', 1, false],
  ['G- School Bags',                 'girls', 'back-to-school-girls', 'Girls  —  Underwear','__EMPTY',    '__EMPTY_3', 2, true],
  ['Copy of G - Underwear,Thight & ','girls', 'girls-underwear',      'Girls  —  Underwear','__EMPTY',    '__EMPTY_4', 1, false],
  ['G - Birthday Tees',              'girls', 'birthday-tees',        '1',                  '__EMPTY',    '__EMPTY_3', 1, false],
  ['B - Polo 2pc set',               'boys',  'boys-sets',            'Boys  —  2PCS SET',  '__EMPTY',    '__EMPTY_3', 1, false],
  ['B - Polo',                       'boys',  'boys-polo',            'Boys  —  Polo',      '__EMPTY',    '__EMPTY_3', 1, false],
  ['B - Shirts',                     'boys',  'boys-shirts',          '__EMPTY',            '__EMPTY_1',  '__EMPTY_4', 1, false],
  ['Copy of B - Shirts',             'boys',  'boys-shirts',          '__EMPTY',            '__EMPTY_1',  '__EMPTY_4', 1, false],
  ['BOYS SCH SHOE',                  'boys',  'boys-shoes',           '__EMPTY',            '__EMPTY_1',  '__EMPTY_4', 2, false],
  ['Copy of B - School Backpack & T','boys',  'back-to-school-boys',  'Boys  —  Shoes',     '__EMPTY',    '__EMPTY_3', 1, true],
  ['B - Trousers',                   'boys',  'boys-trousers',        '__EMPTY_6',          '__EMPTY',    '__EMPTY_3', 1, false],
  ['B - Shorts',                     'boys',  'boys-shorts',          '__EMPTY_6',          '__EMPTY',    '__EMPTY_3', 1, false],
  ['B - Graphic Tees',               'boys',  'boys-shirts',          '__EMPTY_6',          '__EMPTY',    '__EMPTY_3', 1, false],
  ['B - Birthday Tees',              'boys',  'birthday-tees',        '__EMPTY_6',          '__EMPTY',    '__EMPTY_3', 1, false],
]

// Individually verified corrections (checked raw cell + real DB/photo state by hand —
// see conversation history for the evidence behind each one)
const MANUAL_SKU_FIXES = {
  'MOKIDS0011': 'MOKIDSP011', 'MOKIDS0012': 'MOKIDSP012', 'MOKIDS0013': 'MOKIDSP013',
  'MOKIDS0014': 'MOKIDSP014', 'MOKIDSS0015': 'MOKIDSP015', 'MOKIDSS0016': 'MOKIDSP016',
  'MOKIDSUW0014': 'MOKIDSUW014',
  'MOKIDSUW)27': 'MOKIDSUW027',
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

// ── Extract products from a sheet ─────────────────────────────────────────────
function extractProducts(wb, sheetName, skuCol, nameCol, priceCol, skipRows, multiLineDesc) {
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  const products = []
  let currentGroup = null // array of product stubs sharing one price/descLines (rows listing 2+ SKUs for one shared description)

  for (let i = skipRows; i < rows.length; i++) {
    const row = rows[i]
    const rawSku = row[skuCol]
    const nameRaw = String(row[nameCol] || '').trim()
    // Use only the first line as the product name (Excel cells can contain multi-line text)
    const nameVal = nameRaw === 'null' ? '' : nameRaw.split('\n')[0].trim()
    const priceVal = typeof row[priceCol] === 'number' && row[priceCol] > 0 ? Math.round(row[priceCol]) : null

    if (isValidSku(rawSku)) {
      if (currentGroup) products.push(...currentGroup)
      const shared = { price: priceVal, descLines: nameVal ? [nameVal] : [] }
      const skus = splitSkus(rawSku).map(normSku).filter(Boolean)
      currentGroup = skus.map(sku => ({ sku, name: nameVal || null, description: nameVal || null, shared }))
    } else if (currentGroup && multiLineDesc && nameVal && nameVal !== '"') {
      // Continuation row — collect description bullets for backpacks
      currentGroup[0].shared.descLines.push(nameVal)
    } else if (currentGroup && priceVal && !currentGroup[0].shared.price) {
      currentGroup[0].shared.price = priceVal
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
  })).filter(p => p.sku)
}

// ── Main ──────────────────────────────────────────────────────────────────────
const wb = XLSX.readFile(EXCEL_PATH)

// Pass 1: extract everything, tagged with source sheet, before writing anything
const all = []
for (const [sheetName, gender, category, skuCol, nameCol, priceCol, skipRows, multiLine] of SHEETS) {
  const products = extractProducts(wb, sheetName, skuCol, nameCol, priceCol, skipRows, multiLine)
    .filter(p => p.name || p.price)
  console.log(`[${sheetName}] — ${products.length} usable row(s)`)
  for (const p of products) all.push({ ...p, sheetName, gender, category })
}

// Pass 2: find SKUs reused across rows with conflicting data — hold ALL of them back,
// we can't safely guess which one is correct
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
  if (distinct.size > 1) held.push(...group)
  else toProcess.push(group[0])
}

// Pass 3: write. Exact SKU+gender match -> update. No match -> genuinely new product.
let updated = 0, created = 0, errors = 0, unchanged = 0

for (const p of toProcess) {
  const { data: existing } = await supabase
    .from('products')
    .select('id, name, price')
    .ilike('sku', p.sku)
    .eq('gender', p.gender)
    .maybeSingle()

  const nameChanged = !!p.name && (!existing || existing.name !== p.name)
  const priceChanged = !!p.price && (!existing || existing.price !== p.price)
  if (existing && !nameChanged && !priceChanged) { unchanged++; continue }

  process.stdout.write(`  ${p.sku} — "${p.name}" @ ₦${p.price?.toLocaleString() ?? 'TBD'}...`)
  try {
    if (existing) {
      const update = {}
      if (p.name)  { update.name = p.name; update.description = p.description }
      if (p.price) { update.price = p.price; update.is_active = true }
      await supabase.from('products').update(update).eq('id', existing.id)
      console.log(' updated')
      updated++
    } else {
      const { error } = await supabase.from('products').insert({
        sku: p.sku,
        name: p.name || p.sku,
        description: p.description || p.name || p.sku,
        price: p.price ?? 0,
        category: p.category,
        gender: p.gender,
        colour: '',
        images: [],
        is_active: !!(p.price && p.price > 0),
      })
      if (error) throw error
      console.log(' created (new)')
      created++
    }
  } catch (err) {
    console.log(` ERROR: ${err?.message || JSON.stringify(err)}`)
    errors++
  }
}

console.log(`\n✓ Done. Updated: ${updated}  Created: ${created}  Unchanged: ${unchanged}  Errors: ${errors}`)
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
