import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { isAdminRequest, unauthorized } from '@/lib/auth'

// Admin only — flags a batch of products on/off sale in one request, used by
// the "select several products, apply one % off" bulk action on
// /admin/sales. Each product needs its own sale_price computed from its own
// regular price, so a single UPDATE can't do it — this fetches the batch's
// prices once, then writes each row, run in parallel.
export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized()
  const sb = getServiceClient()
  const body = await req.json() as { ids?: string[]; on_sale?: boolean; percentOff?: number }
  const { ids, on_sale, percentOff } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No products selected' }, { status: 400 })
  }

  if (on_sale === false) {
    const { error } = await sb.from('products').update({ on_sale: false }).in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: ids.length, errors: [] })
  }

  if (typeof percentOff !== 'number' || percentOff < 0 || percentOff > 100) {
    return NextResponse.json({ error: 'percentOff must be a number between 0 and 100' }, { status: 400 })
  }

  const { data: products, error: fetchErr } = await sb.from('products').select('id, price').in('id', ids)
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  let updated = 0
  const errors: string[] = []
  await Promise.all((products ?? []).map(async (p) => {
    const sale_price = Math.round(p.price * (1 - percentOff / 100))
    const { error } = await sb.from('products').update({ on_sale: true, sale_price }).eq('id', p.id)
    if (error) errors.push(`${p.id}: ${error.message}`)
    else updated++
  }))

  return NextResponse.json({ updated, errors })
}
