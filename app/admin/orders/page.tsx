'use client'
import { useState, useEffect } from 'react'
import { Order } from '@/types'
import { formatPrice } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  pending: '#F5C000',
  paid: '#8DC63F',
  fulfilled: '#3DB8E8',
  cancelled: '#E55A1C',
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/orders${statusFilter ? `?status=${statusFilter}` : ''}`)
      .then(r => r.json())
      .then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [statusFilter])

  const markFulfilled = async (orderId: string) => {
    setUpdating(orderId)
    await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'fulfilled' }),
    })
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'fulfilled' } : o))
    if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status: 'fulfilled' } : null)
    setUpdating(null)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: "'Fredoka One', cursive" }}>Orders</h1>

      {/* Status filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['', 'pending', 'paid', 'fulfilled', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border-[2px] border-black transition-colors ${statusFilter === s ? 'bg-[#F5C000]' : 'bg-white hover:bg-gray-50'}`}
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            {s === '' ? 'All Orders' : s.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Table */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b-[2px] border-black">
                  {['Order ID', 'Date', 'Customer', 'Items', 'Total', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading orders...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No orders found</td></tr>
                ) : orders.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => setSelected(order)}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selected?.id === order.id ? 'bg-[#FFFBEF]' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('en-NG', { dateStyle: 'short' })}</td>
                    <td className="px-4 py-3 font-bold text-xs">{order.customer_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{order.items.length}</td>
                    <td className="px-4 py-3 font-bold text-xs" style={{ fontFamily: "'Fredoka One', cursive" }}>{formatPrice(order.total)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 text-xs font-bold rounded-full border-[1.5px] border-black"
                        style={{ backgroundColor: STATUS_COLORS[order.status] || '#ddd', fontFamily: "'Nunito', sans-serif" }}
                      >
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {order.status === 'paid' && (
                        <button
                          onClick={e => { e.stopPropagation(); markFulfilled(order.id) }}
                          disabled={updating === order.id}
                          className="text-xs font-bold px-2 py-1 rounded border-[1.5px] border-black bg-[#3DB8E8] hover:bg-[#2aa8d8] transition-colors disabled:opacity-50"
                          style={{ fontFamily: "'Nunito', sans-serif" }}
                        >
                          {updating === order.id ? '...' : '✓ Fulfill'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Detail Panel — sidebar on desktop, full-screen overlay on mobile */}
        {selected && (
          <>
            {/* Mobile overlay backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 sm:hidden"
              onClick={() => setSelected(null)}
            />
            <div className="
              fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl
              sm:static sm:inset-auto sm:max-h-none sm:rounded-xl sm:overflow-visible
              w-full sm:w-80 sm:flex-shrink-0
              bg-white border-[2.5px] border-black shadow-[4px_4px_0_#000] p-4 sm:h-fit sm:sticky sm:top-24
            ">
              {/* Handle bar (mobile only) */}
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold" style={{ fontFamily: "'Fredoka One', cursive" }}>
                  Order {selected.id.slice(0, 8).toUpperCase()}
                </h3>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-black text-lg leading-none">✕</button>
              </div>

              <div className="text-xs font-bold space-y-1.5 mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <div><span className="text-gray-400">Customer:</span> {selected.customer_name}</div>
                <div><span className="text-gray-400">Email:</span> {selected.email}</div>
                <div><span className="text-gray-400">Phone:</span> {selected.phone}</div>
                <div><span className="text-gray-400">Address:</span> {selected.shipping_address}, {selected.state}</div>
                {selected.payment_ref && <div><span className="text-gray-400">Ref:</span> <span className="font-mono">{selected.payment_ref}</span></div>}
              </div>

              <hr className="border-black mb-3" />
              <h4 className="font-bold text-xs mb-2">Items</h4>
              {selected.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs mb-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  <span className="font-bold truncate flex-1">{item.name} ({item.size}) ×{item.quantity}</span>
                  <span className="font-bold ml-2">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <hr className="border-gray-200 my-2" />
              <div className="flex justify-between text-xs font-bold" style={{ fontFamily: "'Fredoka One', cursive" }}>
                <span>Total</span>
                <span style={{ color: '#D9247A' }}>{formatPrice(selected.total)}</span>
              </div>

              {selected.status === 'paid' && (
                <button
                  onClick={() => markFulfilled(selected.id)}
                  disabled={updating === selected.id}
                  className="w-full mt-3 py-2 text-sm font-bold rounded-lg border-[2.5px] border-black bg-[#3DB8E8] hover:bg-[#2aa8d8] transition-colors shadow-[3px_3px_0_#000] disabled:opacity-50"
                  style={{ fontFamily: "'Nunito', sans-serif" }}
                >
                  {updating === selected.id ? 'Updating...' : '✓ Mark as Fulfilled'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
