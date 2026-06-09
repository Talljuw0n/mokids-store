'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface InventoryRow {
  id: string
  product_id: string
  size: string
  quantity: number
  updated_at: string
  product_name: string
  product_sku: string
  product_category: string
}

function StockStatus({ qty }: { qty: number }) {
  if (qty === 0) return <span className="text-red-500 font-bold text-xs">❌ Sold Out</span>
  if (qty <= 3) return <span className="font-bold text-xs" style={{ color: '#E55A1C' }}>⚠️ Low ({qty})</span>
  return <span className="text-green-600 font-bold text-xs">✅ In Stock</span>
}

export default function AdminInventoryPage() {
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState<number>(0)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    // Fetch all inventory joined with product names
    const res = await fetch('/api/admin/inventory')
    const data = await res.json()
    setRows(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const startEdit = (id: string, currentQty: number) => {
    setEditing(id)
    setEditVal(currentQty)
  }

  const saveEdit = async (row: InventoryRow) => {
    setSaving(row.id)
    await fetch('/api/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: row.product_id, size: row.size, quantity: editVal }),
    })
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, quantity: editVal } : r))
    setEditing(null)
    setSaving(null)
  }

  const filtered = rows.filter(r =>
    !search ||
    r.product_name.toLowerCase().includes(search.toLowerCase()) ||
    r.product_sku.toLowerCase().includes(search.toLowerCase())
  )

  const lowStockCount = rows.filter(r => r.quantity > 0 && r.quantity <= 3).length
  const soldOutCount = rows.filter(r => r.quantity === 0).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fredoka One', cursive" }}>Inventory</h1>
        <div className="flex gap-3 text-xs font-bold" style={{ fontFamily: "'Nunito', sans-serif" }}>
          <span className="px-2 py-1 bg-red-100 text-red-600 rounded border border-red-200">❌ {soldOutCount} Sold Out</span>
          <span className="px-2 py-1 rounded border" style={{ backgroundColor: '#FFF3CD', borderColor: '#E55A1C', color: '#E55A1C' }}>⚠️ {lowStockCount} Low Stock</span>
        </div>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by product name or SKU..."
          className="px-4 py-2 text-sm font-bold border-[2.5px] border-black rounded-xl bg-white focus:outline-none focus:border-[#F5C000] w-full max-w-sm"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        />
      </div>

      <div className="bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b-[2px] border-black">
                {['Product', 'SKU', 'Size', 'Qty', 'Status', 'Last Updated'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading inventory...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No inventory items found</td></tr>
              ) : filtered.map(row => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 ${row.quantity === 0 ? 'bg-red-50/30' : row.quantity <= 3 ? 'bg-yellow-50/30' : ''}`}
                >
                  <td className="px-4 py-3 font-bold text-xs max-w-xs">
                    <Link href={`/admin/products/${row.product_id}/edit`} className="hover:text-[#D9247A] transition-colors">
                      {row.product_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{row.product_sku}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-0.5 bg-[#FFFBEF] border border-black rounded font-bold">{row.size}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {editing === row.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editVal}
                          onChange={e => setEditVal(parseInt(e.target.value) || 0)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(row); if (e.key === 'Escape') setEditing(null) }}
                          className="w-16 px-2 py-1 border-[2px] border-black rounded text-sm font-bold focus:outline-none focus:border-[#F5C000] bg-[#FFFBEF]"
                          autoFocus
                          min="0"
                        />
                        <button onClick={() => saveEdit(row)} disabled={saving === row.id} className="text-xs font-bold text-green-600 hover:underline">
                          {saving === row.id ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditing(null)} className="text-xs text-gray-400 hover:text-black">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(row.id, row.quantity)}
                        className="font-bold hover:text-[#D9247A] cursor-pointer"
                        title="Click to edit quantity"
                      >
                        {row.quantity}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3"><StockStatus qty={row.quantity} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(row.updated_at).toLocaleDateString('en-NG', { dateStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
