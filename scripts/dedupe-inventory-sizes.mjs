/**
 * One-off cleanup: merge duplicate inventory rows created before
 * update-from-excel.mjs normalized size whitespace (e.g. "6-7 years" vs
 * "6-7years" were treated as two different sizes and both got a row).
 *
 * For each product, groups inventory rows by normalized size. Where a group
 * has more than one row, keeps the row with the most recent updated_at (the
 * true current quantity) and deletes the stale duplicate(s), renaming the
 * survivor to the canonical spelling so future syncs match it.
 *
 * Run from project root:
 *   node --use-system-ca scripts/dedupe-inventory-sizes.mjs
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const envFile = readFileSync('C:/Users/Superuser/mokids-store/.env.local', 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Kept identical to cleanSize() in update-from-excel.mjs so grouping matches
// exactly what the sync script will treat as the same size going forward.
function normalizeSize(val) {
  let s = String(val ?? '').trim()
  if (!s || s === '"') return ''
  s = s.replace(/\s+/g, ' ')
  s = s.replace(/(\d)\s*-\s*(\d)/g, '$1-$2')
  s = s.replace(/(\d)(years?|months?)\b/gi, '$1 $2')
  s = s.replace(/\b(UK|EU|US)\s+(\d)/gi, '$1$2')
  return s
}

const { data: inventory, error } = await supabase
  .from('inventory')
  .select('id, product_id, size, quantity, updated_at')
if (error) { console.error(error); process.exit(1) }

const { data: products } = await supabase.from('products').select('id, sku, name')
const prodMap = new Map(products.map(p => [p.id, p]))

const byProduct = new Map()
for (const inv of inventory) {
  if (!byProduct.has(inv.product_id)) byProduct.set(inv.product_id, [])
  byProduct.get(inv.product_id).push(inv)
}

let groupsFixed = 0, rowsDeleted = 0, rowsRenamed = 0, errors = 0

for (const [productId, rows] of byProduct) {
  const byNorm = new Map()
  for (const r of rows) {
    const n = normalizeSize(r.size)
    if (!byNorm.has(n)) byNorm.set(n, [])
    byNorm.get(n).push(r)
  }

  for (const [canonical, group] of byNorm) {
    if (group.length <= 1) continue

    group.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    const keep = group[0]
    const drop = group.slice(1)
    const p = prodMap.get(productId)

    if (keep.size !== canonical) {
      const { error: rErr } = await supabase.from('inventory').update({ size: canonical }).eq('id', keep.id)
      if (rErr) { console.log(`  RENAME ERROR ${p?.sku} "${keep.size}" -> "${canonical}": ${rErr.message}`); errors++ }
      else rowsRenamed++
    }

    for (const d of drop) {
      const { error: dErr } = await supabase.from('inventory').delete().eq('id', d.id)
      if (dErr) { console.log(`  DELETE ERROR ${p?.sku} "${d.size}" (id=${d.id}): ${dErr.message}`); errors++ }
      else rowsDeleted++
    }

    console.log(`${p?.sku} — kept "${keep.size}" (qty=${keep.quantity}) -> "${canonical}", dropped ${drop.map(d => `"${d.size}"(qty=${d.quantity})`).join(', ')}`)
    groupsFixed++
  }
}

console.log(`\n✓ Done. Duplicate groups fixed: ${groupsFixed}  Rows deleted: ${rowsDeleted}  Rows renamed to canonical: ${rowsRenamed}  Errors: ${errors}`)
