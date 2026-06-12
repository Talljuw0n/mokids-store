import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { isAdminRequest, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const sb = getServiceClient()
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const gender = searchParams.get('gender')
  const active = searchParams.get('active')
  const colour = searchParams.get('colour')
  const size = searchParams.get('size')

  let query = sb.from('products').select('*').order('created_at', { ascending: false })
  if (category) query = query.eq('category', category)
  if (gender) query = query.eq('gender', gender)
  if (colour) query = query.ilike('colour', colour)
  const showAll = active === 'all' || searchParams.get('all') === 'true'
  if (!showAll) query = query.eq('is_active', true)

  // Size filter: find products that have this size in stock
  if (size) {
    const { data: sizeRows } = await sb
      .from('inventory')
      .select('product_id')
      .eq('size', size)
      .gt('quantity', 0)
    const ids = (sizeRows ?? []).map((r: { product_id: string }) => r.product_id)
    if (ids.length === 0) return NextResponse.json([])
    query = query.in('id', ids)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized()
  const sb = getServiceClient()
  const body = await req.json()
  const { sizes, ...productData } = body

  const { data: product, error } = await sb
    .from('products')
    .insert(productData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (sizes && sizes.length > 0) {
    const invRows = sizes.map((s: { size: string; quantity: number }) => ({
      product_id: product.id,
      size: s.size,
      quantity: s.quantity,
    }))
    await sb.from('inventory').insert(invRows)
  }

  return NextResponse.json(product, { status: 201 })
}
