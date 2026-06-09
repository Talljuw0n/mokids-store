export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getServiceClient, isConfigured } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ref?: string }>
}

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const { id } = await params
  const { ref } = await searchParams
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '2348000000000'

  const { data: order } = isConfigured()
    ? await getServiceClient().from('orders').select('*').eq('id', id).single()
    : { data: null }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>Order not found</h1>
        <Link href="/shop"><Button variant="primary">Continue Shopping</Button></Link>
      </div>
    )
  }

  const waMessage = encodeURIComponent(
    `Hi! I just placed an order on Mo Kids Place.\n\nOrder ID: ${order.id.slice(0, 8).toUpperCase()}\nTotal: ${formatPrice(order.total)}\n\nPlease confirm my order. Thank you!`
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Success header */}
      <div
        className="text-center rounded-2xl border-[2.5px] border-black shadow-[6px_6px_0_#000] p-8 mb-6"
        style={{ backgroundColor: '#F5C000' }}
      >
        <h1 className="text-4xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Order Confirmed!
        </h1>
        <p className="mt-2 font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Thank you, {order.customer_name}! We&apos;ve received your order.
        </p>
        {ref && (
          <p className="text-xs mt-1 text-gray-700 font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Payment Ref: {ref}
          </p>
        )}
      </div>

      {/* Order Details */}
      <div className="bg-white rounded-2xl border-[2.5px] border-black shadow-[4px_4px_0_#000] p-6 mb-4">
        <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Order Details
        </h2>
        <div className="text-sm font-bold space-y-1.5" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <div className="flex justify-between">
            <span className="text-gray-500">Order ID</span>
            <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className={`px-2 py-0.5 rounded-full text-xs border-[2px] border-black ${order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-[#F5C000] text-black'}`}>
              {order.status.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Date</span>
            <span>{new Date(order.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}</span>
          </div>
        </div>

        <hr className="border-black border-[1.5px] my-4" />

        <h3 className="font-bold mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>Items Ordered</h3>
        <div className="flex flex-col gap-2">
          {order.items.map((item: { sku: string; name: string; size: string; quantity: number; price: number }, idx: number) => (
            <div key={idx} className="flex justify-between text-sm">
              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
                {item.name} ({item.size}) × {item.quantity}
              </span>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <hr className="border-gray-200 my-3" />
        <div className="flex flex-col gap-1 text-sm font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Shipping</span>
            <span>{formatPrice(order.shipping_fee)}</span>
          </div>
          <div className="flex justify-between text-lg mt-1">
            <span>Total Paid</span>
            <span style={{ fontFamily: "'Poppins', sans-serif", color: '#D9247A' }}>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Delivery Address */}
      <div className="bg-white rounded-2xl border-[2.5px] border-black shadow-[4px_4px_0_#000] p-5 mb-6">
        <h3 className="font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>Delivery Address</h3>
        <p className="text-sm font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>{order.customer_name}</p>
        <p className="text-sm text-gray-600 font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>{order.shipping_address}</p>
        <p className="text-sm text-gray-600 font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>{order.state}</p>
        <p className="text-sm text-gray-600 font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>{order.phone}</p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        <a
          href={`https://wa.me/${whatsappNumber}?text=${waMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-6 py-3.5 font-bold rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] transition-all text-white"
          style={{ backgroundColor: '#25D366', fontFamily: "'Poppins', sans-serif", fontSize: '1rem' }}
        >
          Chat with us on WhatsApp
        </a>
        <Link href="/shop">
          <Button variant="secondary" size="lg" fullWidth>
            Continue Shopping →
          </Button>
        </Link>
      </div>
    </div>
  )
}
