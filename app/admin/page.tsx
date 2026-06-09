export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getServiceClient, isConfigured } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { Order } from '@/types'

async function getDashboardStats() {
  if (!isConfigured()) return { totalOrders: 0, revenue: 0, productCount: 0, lowStockCount: 0, recentOrders: [], lowStockItems: [] }
  const sb = getServiceClient()
  if (!sb) return { totalOrders: 0, revenue: 0, productCount: 0, lowStockCount: 0, recentOrders: [], lowStockItems: [] }


  const [ordersRes, productsRes, inventoryRes] = await Promise.all([
    sb.from('orders').select('*'),
    sb.from('products').select('id, is_active').eq('is_active', true),
    sb.from('inventory').select('id, quantity, product_id').lte('quantity', 3),
  ])

  const orders: Order[] = ordersRes.data || []
  const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'fulfilled')
  const revenue = paidOrders.reduce((sum, o) => sum + o.total, 0)
  const lowStockCount = inventoryRes.data?.length || 0

  const recentOrders = orders
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  return {
    totalOrders: orders.length,
    revenue,
    productCount: productsRes.data?.length || 0,
    lowStockCount,
    recentOrders,
    lowStockItems: inventoryRes.data || [],
  }
}

const statusColors: Record<string, string> = {
  pending: '#F5C000',
  paid: '#8DC63F',
  fulfilled: '#3DB8E8',
  cancelled: '#E55A1C',
}

export default async function AdminDashboard() {
  const { totalOrders, revenue, productCount, lowStockCount, recentOrders } = await getDashboardStats()

  const stats = [
    { label: 'Total Orders', value: totalOrders.toString(), icon: '📦', color: '#3DB8E8' },
    { label: 'Total Revenue', value: formatPrice(revenue), icon: '💰', color: '#8DC63F' },
    { label: 'Active Products', value: productCount.toString(), icon: '🛍️', color: '#B5559A' },
    { label: 'Low Stock Alerts', value: lowStockCount.toString(), icon: '⚠️', color: '#E55A1C' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fredoka One', cursive" }}>
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 font-bold">
          {new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] p-4"
          >
            <div className="text-3xl mb-2">{stat.icon}</div>
            <p className="text-2xl font-bold" style={{ fontFamily: "'Fredoka One', cursive', color: stat.color" }}>
              {stat.value}
            </p>
            <p className="text-xs text-gray-500 font-bold mt-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/admin/products/new"
          className="px-4 py-2 font-bold text-sm rounded-lg border-[2.5px] border-black shadow-[3px_3px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] transition-all"
          style={{ backgroundColor: '#F5C000', fontFamily: "'Nunito', sans-serif" }}
        >
          + Add New Product
        </Link>
        <Link
          href="/admin/orders"
          className="px-4 py-2 font-bold text-sm rounded-lg border-[2.5px] border-black shadow-[3px_3px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] transition-all bg-white"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          View All Orders
        </Link>
        <Link
          href="/admin/inventory"
          className="px-4 py-2 font-bold text-sm rounded-lg border-[2.5px] border-black shadow-[3px_3px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] transition-all bg-white"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          Manage Inventory
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] overflow-hidden">
        <div className="px-4 py-3 border-b-[2px] border-black flex items-center justify-between">
          <h2 className="font-bold" style={{ fontFamily: "'Fredoka One', cursive" }}>Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs font-bold text-[#D9247A] hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b-[2px] border-black">
                {['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 font-bold text-xs">{order.customer_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
                  <td className="px-4 py-3 font-bold text-xs" style={{ fontFamily: "'Fredoka One', cursive" }}>{formatPrice(order.total)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 text-xs font-bold rounded-full border-[1.5px] border-black"
                      style={{ backgroundColor: statusColors[order.status] || '#ddd', fontFamily: "'Nunito', sans-serif" }}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('en-NG', { dateStyle: 'short' })}
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
