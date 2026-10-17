import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getServiceClient } from '@/lib/supabase'
import { sendOrderAlert } from '@/lib/email'
import { markOrderPaid } from '@/lib/orders'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-paystack-signature') || ''

  // Verify HMAC-SHA512 signature
  const hash = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash.length !== signature.length || !timingSafeEqual(Buffer.from(hash), Buffer.from(signature))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  if (event.event === 'charge.success') {
    const { reference, amount, metadata } = event.data
    const orderId = metadata?.orderId

    // Money arrived that isn't tied to any site order — e.g. a payment made
    // through Paystack directly. Nobody would otherwise notice it.
    if (!orderId) {
      await sendOrderAlert({
        subject: 'Payment received with no linked order',
        orderId: String(reference),
        lines: [
          `Amount: ₦${amount / 100}`,
          `Customer: ${event.data.customer?.email ?? 'unknown'}`,
          `Paystack ref: ${reference}`,
          'Match it to an order in the admin panel by the customer email.',
        ],
      }).catch(() => {})
      return NextResponse.json({ received: true })
    }

    const sb = getServiceClient()

    const { data: existing } = await sb.from('orders').select('total, status').eq('id', orderId).maybeSingle()
    if (!existing || existing.status !== 'pending') return NextResponse.json({ received: true })

    // Paystack amounts are in kobo — refuse to mark an order paid for a
    // different amount than it costs, and flag it for a human instead
    if (amount !== existing.total * 100) {
      await sb
        .from('orders')
        .update({ paystack_status: 'amount_mismatch', payment_ref: reference })
        .eq('id', orderId)
        .eq('status', 'pending')
      await sendOrderAlert({
        subject: 'Payment amount does not match order',
        orderId,
        lines: [`Order total: ₦${existing.total}`, `Amount paid: ₦${amount / 100}`, `Paystack ref: ${reference}`],
      }).catch(() => {})
      return NextResponse.json({ received: true })
    }

    // Only flips pending → paid, so Paystack's retries/duplicate deliveries
    // don't take stock twice or send a second order email
    await markOrderPaid(sb, orderId, { paystack_status: 'success', payment_ref: reference })
  }

  return NextResponse.json({ received: true })
}
