import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { isAdminRequest, unauthorized } from '@/lib/auth'
import { NIGERIAN_STATES, DEFAULT_SHIPPING_RATES } from '@/lib/utils'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized()
  const sb = getServiceClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = sb.from('orders').select('*').order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { customer_name, email, phone, shipping_address, state } = body

  if (!customer_name?.trim() || !email?.trim() || !phone?.trim() || !shipping_address?.trim()) {
    return NextResponse.json({ error: 'Missing required customer details' }, { status: 400 })
  }
  if (!NIGERIAN_STATES.includes(state)) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  // Only product_id/size/quantity are trusted from the client — price, name,
  // subtotal, shipping_fee and total are all recomputed server-side below, so
  // a manipulated request body can no longer set its own order total.
  const requested: { product_id: string; size: string; quantity: number }[] = Array.isArray(body.items)
    ? body.items.map((i: { product_id?: string; size?: string; quantity?: number }) => ({
        product_id: String(i.product_id ?? ''),
        size: String(i.size ?? ''),
        quantity: Math.floor(Number(i.quantity)),
      }))
    : []

  if (requested.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }
  if (requested.some(i => !i.product_id || !i.size || !Number.isFinite(i.quantity) || i.quantity <= 0)) {
    return NextResponse.json({ error: 'Invalid item in cart' }, { status: 400 })
  }

  const sb = getServiceClient()
  const productIds = [...new Set(requested.map(i => i.product_id))]

  const { data: products, error: prodErr } = await sb
    .from('products')
    .select('id, sku, name, price, images, is_active')
    .in('id', productIds)
  if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 500 })
  const productMap = new Map(products.map(p => [p.id, p]))

  const { data: inventory, error: invErr } = await sb
    .from('inventory')
    .select('product_id, size, quantity')
    .in('product_id', productIds)
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })
  const invMap = new Map(inventory.map(r => [`${r.product_id}|${r.size}`, r.quantity]))

  const orderItems = []
  for (const item of requested) {
    const product = productMap.get(item.product_id)
    if (!product || !product.is_active) {
      return NextResponse.json({ error: 'One of the items in your cart is no longer available' }, { status: 400 })
    }
    const available = invMap.get(`${item.product_id}|${item.size}`) ?? 0
    if (available < item.quantity) {
      return NextResponse.json({ error: `"${product.name}" (${item.size}) only has ${available} left in stock` }, { status: 409 })
    }
    orderItems.push({
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      size: item.size,
      quantity: item.quantity,
      price: product.price,
      image: product.images?.[0] ?? '',
    })
  }

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const { data: rateRow } = await sb.from('shipping_rates').select('fee').eq('state', state).maybeSingle()
  const rate = rateRow ?? DEFAULT_SHIPPING_RATES[state] ?? { fee: 5500 }
  const shipping_fee = rate.fee
  const total = subtotal + shipping_fee

  const { data, error } = await sb
    .from('orders')
    .insert({
      customer_name,
      email,
      phone,
      shipping_address,
      state,
      items: orderItems,
      subtotal,
      shipping_fee,
      total,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orderId: data.id }, { status: 201 })
}
