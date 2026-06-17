import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { orderId, email } = await req.json()

  if (!orderId || !email) {
    return NextResponse.json({ error: 'Missing orderId or email' }, { status: 400 })
  }

  // Fetch the real total from the database — never trust the client-supplied amount
  const sb = getServiceClient()
  const { data: order, error } = await sb
    .from('orders')
    .select('total, status')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status !== 'pending') {
    return NextResponse.json({ error: 'Order already processed' }, { status: 400 })
  }

  const reference = `mokids_${orderId.slice(0, 8)}_${Date.now()}`

  const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: order.total * 100, // kobo — from DB, not the client
      reference,
      currency: 'NGN',
      metadata: { orderId },
    }),
  })

  const paystackData = await paystackRes.json()
  if (!paystackData.status) {
    return NextResponse.json({ error: paystackData.message }, { status: 400 })
  }

  await sb.from('orders').update({ payment_ref: reference }).eq('id', orderId)

  return NextResponse.json({
    reference,
    authorization_url: paystackData.data.authorization_url,
    access_code: paystackData.data.access_code,
  })
}
