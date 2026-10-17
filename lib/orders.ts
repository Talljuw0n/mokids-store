import { SupabaseClient } from '@supabase/supabase-js'
import { sendNewOrderEmail, sendOrderAlert } from '@/lib/email'

type OrderItem = { product_id: string; name: string; size: string; quantity: number; price: number }

// Moves a pending order to paid, takes its items out of stock and emails the
// shop. Shared by the Paystack webhook and the admin "Mark as Paid" button so
// both paths behave the same. Returns null (and does nothing) if the order
// isn't pending — which also makes duplicate webhook deliveries harmless.
export async function markOrderPaid(
  sb: SupabaseClient,
  orderId: string,
  payment: { paystack_status: string; payment_ref?: string }
) {
  const { data: order } = await sb
    .from('orders')
    .update({ status: 'paid', ...payment })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  if (!order) return null

  // Decrement inventory for each item, noting any that no longer had
  // enough stock (two customers paying for the same last unit)
  const shortfalls: string[] = []
  for (const item of order.items as OrderItem[]) {
    const args = { x: item.quantity, row_id: item.product_id, row_size: item.size }
    const { data: decremented, error } = await sb.rpc('decrement_stock', args)
    if (error) {
      // decrement_stock not installed yet (scripts/sql/decrement-stock.sql) — old behaviour
      await sb.rpc('decrement', args)
    } else if (decremented === false) {
      shortfalls.push(`${item.name} (${item.size}) × ${item.quantity}`)
      await sb.rpc('decrement', args) // clamp what's left to 0
    }
  }

  await sendNewOrderEmail(order).catch(() => {})

  if (shortfalls.length > 0) {
    await sendOrderAlert({
      subject: 'Paid order is short on stock',
      orderId,
      lines: [
        `Customer: ${order.customer_name} (${order.phone})`,
        ...shortfalls.map(s => `Not enough stock: ${s}`),
        'Contact the customer to offer a swap or refund.',
      ],
    }).catch(() => {})
  }

  return order
}
