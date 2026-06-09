import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { isAdminRequest, unauthorized } from '@/lib/auth'

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
  const sb = getServiceClient()
  const body = await req.json()

  const { data, error } = await sb
    .from('orders')
    .insert({
      customer_name: body.customer_name,
      email: body.email,
      phone: body.phone,
      shipping_address: body.shipping_address,
      state: body.state,
      items: body.items,
      subtotal: body.subtotal,
      shipping_fee: body.shipping_fee,
      total: body.total,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orderId: data.id }, { status: 201 })
}
