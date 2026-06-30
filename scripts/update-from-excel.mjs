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
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'

// ── Config ───────────────────────────────────────────────────────────────────
const EXCEL_PATH = 'C:/Users/Superuser/Downloads/Mokids Store Inventory (5).xlsx'

const envFile = readFileSync('C:/Users/Superuser/mokids-store/.env.local', 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ── Sheet configurations ──────────────────────────────────────────────────────
// [sheetName, gender, category, skuCol, nameCol, priceCol, skipRows, multiLineDesc]
const SHEETS = [
  ['G - Dresses',                    'girls', 'girls-dresses',        'Girls  —  Dresses',  '__EMPTY',    '__EMPTY_4', 1, false],
  ['G - Leggings',                   'girls', 'girls-leggings',       'Girls  —  Leggings', '__EMPTY',    '__EMPTY_3', 2, false],
  ['GIRLS SCH SHOE',                 'girls', 'girls-shoes',          '__EMPTY',            'CLARKS SHOE','__EMPTY_3', 1, false],
  ['G- School Bags',                 'girls', 'back-to-school-girls', 'Girls  —  Underwear','__EMPTY',    '__EMPTY_3', 2, true],
  ['B - Polo',                       'boys',  'boys-sets',            'Boys  —  2PCS SET',  '__EMPTY',    '__EMPTY_3', 1, false],
  ['B - Shirts',                     'boys',  'boys-shirts',          '__EMPTY',            '__EMPTY_1',  '__EMPTY_4', 1, false],
  ['Copy of B - Shirts',             'boys',  'boys-shirts',          '__EMPTY',            '__EMPTY_1',  '__EMPTY_4', 1, false],
  ['BOYS SCH SHOE',                  'boys',  'boys-shoes',           '__EMPTY',            '__EMPTY_1',  '__EMPTY_4', 2, false],
  ['Copy of B - School Backpack & T','boys',  'back-to-school-boys',  'Boys  —  Shoes',     '__EMPTY',    '__EMPTY_3', 1, true],
]

// ── SKU normalisation ─────────────────────────────────────────────────────────
function normSku(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const sku = raw.trim().toUpperCase().replace(/\s+/g, '')
  return sku.replace(/^MOKIDBSET/, 'MOKIDSBSET')
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
  let current = null

  for (let i = skipRows; i < rows.length; i++) {
    const row = rows[i]
    const rawSku = row[skuCol]
    const nameRaw = String(row[nameCol] || '').trim()
    // Use only the first line as the product name (Excel cells can contain multi-line text)
    const nameVal = nameRaw === 'null' ? '' : nameRaw.split('\n')[0].trim()
    const priceVal = typeof row[priceCol] === 'number' && row[priceCol] > 0 ? Math.round(row[priceCol]) : null

    if (isValidSku(rawSku)) {
      // Save previous product
      if (current) products.push(current)

      current = {
        sku: normSku(rawSku),
        name: nameVal || null,
        description: nameVal || null,
        price: priceVal,
        descLines: nameVal ? [nameVal] : [],
      }
    } else if (current && multiLineDesc && nameVal && nameVal !== '"') {
      // Continuation row — collect description bullets for backpacks
      current.descLines.push(nameVal)
    } else if (current && priceVal && !current.price) {
      current.price = priceVal
    }
  }
  if (current) products.push(current)

  // For backpacks: join all description lines
  return products.map(p => ({
    sku: p.sku,
    name: p.name,
    description: multiLineDesc && p.descLines.length > 1
      ? p.descLines.join('\n')
      : p.description,
    price: p.price,
  })).filter(p => p.sku)
}

// ── Main ──────────────────────────────────────────────────────────────────────
const wb = XLSX.readFile(EXCEL_PATH)

let updated = 0, created = 0, skipped = 0, errors = 0

for (const [sheetName, gender, category, skuCol, nameCol, priceCol, skipRows, multiLine] of SHEETS) {
  const products = extractProducts(wb, sheetName, skuCol, nameCol, priceCol, skipRows, multiLine)
  console.log(`\n[${sheetName}] — ${products.length} products`)

  for (const p of products) {
    if (!p.name && !p.price) { skipped++; continue }

    process.stdout.write(`  ${p.sku} — "${p.name}" @ ₦${p.price?.toLocaleString() ?? 'TBD'}...`)

    try {
      // Look up by SKU + gender to avoid boys/girls SKU collisions
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .ilike('sku', p.sku)
        .eq('gender', gender)
        .maybeSingle()

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
          category,
          gender,
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
}

console.log(`\n✓ Done. Updated: ${updated}  Created: ${created}  Skipped: ${skipped}  Errors: ${errors}`)
