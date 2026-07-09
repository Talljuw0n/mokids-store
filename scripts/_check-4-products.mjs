import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(
  readFileSync('c:/Users/Superuser/mokids-store/.env.local', 'utf8').split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function check(nameFilter, extra) {
  let q = sb.from('products').select('sku, name, price, category, images').ilike('name', nameFilter)
  const { data } = await q
  console.log(`\n=== "${nameFilter}" ===`)
  for (const p of (data ?? [])) {
    if (extra && !extra(p)) continue
    console.log(p.sku, '-', p.name, '@', p.price, '-', p.category)
    p.images.forEach((img, i) => console.log(`  [${i}] ${img}`))
  }
}

await check('Yellow lace dress')
await check('Yellow floral causal dress')
await check('Girls Shorts 002')
await check('OLD NAVY LEGGINGS', p => p.price === 8500 && p.images.length === 2)
