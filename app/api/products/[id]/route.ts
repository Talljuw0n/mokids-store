import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { isAdminRequest, unauthorized } from '@/lib/auth'

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
  const { sizes, ...productData } = body

  const { data, error } = await sb
    .from('products')
    .update(productData)
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
