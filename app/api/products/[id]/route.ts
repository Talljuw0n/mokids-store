import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { isAdminRequest, unauthorized } from '@/lib/auth'
import { pickProductFields } from '@/lib/utils'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = getServiceClient()
  const { id } = await params

  const { data: product, error } = await sb.from('products').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: inventory } = await sb.from('inventory').select('*').eq('product_id', id).order('size')

  return NextResponse.json({ ...product, inventory: inventory || [] })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return unauthorized()
  const sb = getServiceClient()
  const { id } = await params
  const body = await req.json()
  // replace_sizes: the product form sends its complete size list, so any
  // size missing from it was deleted there. Other callers (on/off toggles,
  // price edits) send sizes: [] and must not wipe the product's stock.
  const { sizes, replace_sizes } = body

  const { data, error } = await sb
    .from('products')
    .update(pickProductFields(body))
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (sizes) {
    for (const s of sizes as { size: string; quantity: number }[]) {
      await sb.from('inventory').upsert(
        { product_id: id, size: s.size, quantity: s.quantity },
        { onConflict: 'product_id,size' }
      )
    }
  }

  if (replace_sizes === true && Array.isArray(sizes)) {
    const keep = new Set((sizes as { size: string }[]).map(s => s.size))
    const { data: existing } = await sb.from('inventory').select('id, size').eq('product_id', id)
    // Delete by row id — size names can contain quotes/slashes that don't
    // survive being used as a filter value
    const removed = (existing ?? []).filter(r => !keep.has(r.size)).map(r => r.id)
    if (removed.length > 0) {
      const { error: delErr } = await sb.from('inventory').delete().in('id', removed)
      if (delErr) return NextResponse.json({ error: `Saved, but removing sizes failed: ${delErr.message}` }, { status: 500 })
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return unauthorized()
  const sb = getServiceClient()
  const { id } = await params

  await sb.from('inventory').delete().eq('product_id', id)
  const { error } = await sb.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
