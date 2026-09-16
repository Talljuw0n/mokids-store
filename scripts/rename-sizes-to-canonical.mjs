/**
 * Follow-up to dedupe-inventory-sizes.mjs: renames any inventory row whose
 * size string doesn't already match normalizeSize()'s canonical spelling.
 * Safe to run any time after the dedupe (no sibling row exists for these, so
 * no unique-constraint conflicts) — it's what keeps a future sync's upsert
 * matching the existing row instead of creating a new duplicate.
 *
 * Run from project root:
 *   node --use-system-ca scripts/rename-sizes-to-canonical.mjs
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

function normalizeSize(val) {
  let s = String(val ?? '').trim()
  if (!s || s === '"') return ''
  s = s.replace(/\s+/g, ' ')
  s = s.replace(/(\d)\s*-\s*(\d)/g, '$1-$2')
  s = s.replace(/(\d)(years?|months?)\b/gi, '$1 $2')
  s = s.replace(/\b(UK|EU|US)\s+(\d)/gi, '$1$2')
  return s
}

const { data: inventory, error } = await supabase.from('inventory').select('id, product_id, size')
if (error) { console.error(error); process.exit(1) }
const { data: products } = await supabase.from('products').select('id, sku')
const prodMap = new Map(products.map(p => [p.id, p]))

let renamed = 0, skipped = 0, errors = 0

for (const row of inventory) {
  const canonical = normalizeSize(row.size)
  if (!canonical || canonical === row.size) continue

  const { error: updErr } = await supabase.from('inventory').update({ size: canonical }).eq('id', row.id)
  const sku = prodMap.get(row.product_id)?.sku
  if (updErr) {
    console.log(`  SKIP (conflict) ${sku} "${row.size}" -> "${canonical}": ${updErr.message}`)
    skipped++
  } else {
    console.log(`${sku} — "${row.size}" -> "${canonical}"`)
    renamed++
  }
}

console.log(`\n✓ Done. Renamed: ${renamed}  Skipped (conflict): ${skipped}  Errors: ${errors}`)
