import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-paystack-signature') || ''

  // Verify HMAC-SHA512 signature
  const hash = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  if (event.event === 'charge.success') {
    const { reference, metadata } = event.data
    const orderId = metadata?.orderId

    if (!orderId) return NextResponse.json({ received: true })

    const sb = getServiceClient()

    // Mark order as paid
    const { data: order } = await sb
      .from('orders')
      .update({ status: 'paid', paystack_status: 'success', payment_ref: reference })
      .eq('id', orderId)
      .select()
      .single()

    if (!order) return NextResponse.json({ received: true })

    // Decrement inventory for each item
    for (const item of order.items as { product_id: string; size: string; quantity: number }[]) {
      await sb.rpc('decrement', {
        x: item.quantity,
        row_id: item.product_id,
        row_size: item.size,
      })
    }
  }

  return NextResponse.json({ received: true })
}
