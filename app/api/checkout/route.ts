import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { orderId, email, amount } = await req.json()

  const reference = `mokids_${orderId.slice(0, 8)}_${Date.now()}`

  // Initialize Paystack transaction
  const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amount * 100, // convert to kobo
      reference,
      currency: 'NGN',
      metadata: { orderId },
    }),
  })

  const paystackData = await paystackRes.json()
  if (!paystackData.status) {
    return NextResponse.json({ error: paystackData.message }, { status: 400 })
  }

  // Store payment ref on order
  const sb = getServiceClient()
  await sb.from('orders').update({ payment_ref: reference }).eq('id', orderId)

  return NextResponse.json({
    reference,
    authorization_url: paystackData.data.authorization_url,
    access_code: paystackData.data.access_code,
  })
}
