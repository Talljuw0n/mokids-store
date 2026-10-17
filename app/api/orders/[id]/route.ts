import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { isAdminRequest, unauthorized } from '@/lib/auth'
import { markOrderPaid } from '@/lib/orders'

// Which status changes the admin panel may make, keyed by current status.
// pending → paid goes through markOrderPaid so stock is deducted and the
// order email is sent, exactly as for a Paystack payment.
const ALLOWED_CHANGES: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['fulfilled'],
  fulfilled: ['paid'], // undo an accidental "fulfilled"
  cancelled: ['pending'],
}

// Admin only — orders hold the customer's name, phone and address
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return unauthorized()
  const sb = getServiceClient()
  const { id } = await params

  const { data, error } = await sb.from('orders').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// Admin only — status is the only field the admin panel changes; totals,
// items and payment fields are never editable through the API
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return unauthorized()
  const sb = getServiceClient()
  const { id } = await params
  const { status } = await req.json()

  const { data: current } = await sb.from('orders').select('status').eq('id', id).maybeSingle()
  if (!current) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (!ALLOWED_CHANGES[current.status]?.includes(status)) {
    return NextResponse.json({ error: `Can't change a ${current.status} order to ${status}` }, { status: 400 })
  }

  if (current.status === 'pending' && status === 'paid') {
    const order = await markOrderPaid(sb, id, { paystack_status: 'manual' })
    if (!order) return NextResponse.json({ error: 'Order is no longer pending' }, { status: 409 })
    return NextResponse.json(order)
  }

  const { data, error } = await sb
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
