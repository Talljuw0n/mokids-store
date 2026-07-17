'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice, CATEGORY_LABELS } from '@/lib/utils'

// A 401 here almost always means the admin login cookie has expired — there's
// no session check on the admin pages themselves, so this is often the first
// visible sign of it.
function requestErrorMessage(status: number, action: string): string {
  if (status === 401) return `Your admin session has expired. Log out and log back in, then retry ${action}.`
  return `${action} failed (server error ${status}). Try again in a moment.`
}

interface Product {
  id: string
  sku: string
  name: string
  category: string
  price: number
  is_active: boolean
  images: string[]
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceVal, setPriceVal] = useState(0)
  const [saving, setSaving] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const url = '/api/products?all=true' + (category ? `&category=${category}` : '')
    const res = await fetch(url)
    const data = await res.json()
    setProducts(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [category])

  useEffect(() => { load() }, [load])

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  )

  const savePrice = async (product: Product) => {
    setSaving(product.id)
    setSaveError(null)
    const res = await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...product, price: priceVal, sizes: [] }),
    })
    if (res.ok) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, price: priceVal } : p))
      setEditingPrice(null)
    } else {
      setSaveError(requestErrorMessage(res.status, 'saving the price'))
    }
    setSaving(null)
  }

  const toggleActive = async (product: Product) => {
    setSaving(product.id)
    setSaveError(null)
    const newState = !product.is_active
    const res = await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...product, is_active: newState, sizes: [] }),
    })
    if (res.ok) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: newState } : p))
    } else {
      setSaveError(requestErrorMessage(res.status, newState ? 'activating' : 'deactivating'))
    }
    setSaving(null)
  }

  const deleteProduct = async (product: Product) => {
    if (!confirm(`Permanently delete "${product.name}" (${product.sku})? This cannot be undone.`)) return
    setSaving(product.id)
    setSaveError(null)
    const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
    if (res.ok) {
      setProducts(prev => prev.filter(p => p.id !== product.id))
    } else {
      setSaveError(requestErrorMessage(res.status, 'the delete'))
    }
    setSaving(null)
  }

  const activeCount = products.filter(p => p.is_active).length
  const inactiveCount = products.filter(p => !p.is_active).length

  return (
    <div>
      {saveError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border-[2px] border-red-400 rounded-xl text-sm font-bold text-red-600 flex items-center justify-between" style={{ fontFamily: "'Nunito', sans-serif" }}>
          <span>⚠️ {saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fredoka One', cursive" }}>Products</h1>
          <p className="text-xs text-gray-500 font-bold mt-0.5" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 font-bold text-sm rounded-lg border-[2.5px] border-black shadow-[3px_3px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] transition-all"
          style={{ backgroundColor: '#F5C000', fontFamily: "'Nunito', sans-serif" }}
        >
          + Add New Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search SKU or name..."
          className="px-3 py-1.5 text-sm font-bold border-[2.5px] border-black rounded-lg bg-white focus:outline-none focus:border-[#F5C000] w-full sm:w-60"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        />
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          <button onClick={() => setCategory('')} className={`flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border-[2px] border-black ${!category ? 'bg-[#F5C000]' : 'bg-white hover:bg-gray-50'} transition-colors`}>All</button>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <button key={k} onClick={() => setCategory(k)} className={`flex-shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg border-[2px] border-black ${category === k ? 'bg-[#F5C000]' : 'bg-white hover:bg-gray-50'} transition-colors`}>{v}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b-[2px] border-black">
                {['Image', 'SKU', 'Name', 'Category', 'Price', 'Active', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500" style={{ fontFamily: "'Nunito', sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading products...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No products found</td></tr>
              ) : filtered.map(product => (
                <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                  {/* Image */}
                  <td className="px-3 py-2">
                    {product.images?.[0] ? (
                      <Image src={product.images[0]} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400">—</div>
                    )}
                  </td>
                  {/* SKU */}
                  <td className="px-3 py-2 font-mono text-xs text-gray-400">{product.sku}</td>
                  {/* Name */}
                  <td className="px-3 py-2 font-bold text-xs max-w-[180px] truncate">{product.name}</td>
                  {/* Category */}
                  <td className="px-3 py-2 text-xs text-gray-500">{CATEGORY_LABELS[product.category] || product.category}</td>
                  {/* Price — inline editable */}
                  <td className="px-3 py-2 text-xs">
                    {editingPrice === product.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">₦</span>
                        <input
                          type="number"
                          value={priceVal || ''}
                          onChange={e => setPriceVal(parseInt(e.target.value) || 0)}
                          onKeyDown={e => { if (e.key === 'Enter') savePrice(product); if (e.key === 'Escape') setEditingPrice(null) }}
                          className="w-24 px-2 py-1 border-[2px] border-black rounded text-sm font-bold focus:outline-none focus:border-[#F5C000] bg-[#FFFBEF]"
                          autoFocus
                          min="0"
                        />
                        <button onClick={() => savePrice(product)} disabled={saving === product.id} className="text-xs font-bold text-green-600 hover:underline">{saving === product.id ? '...' : 'Save'}</button>
                        <button onClick={() => setEditingPrice(null)} className="text-xs text-gray-400 hover:text-black">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingPrice(product.id); setPriceVal(product.price) }}
                        className={`font-bold hover:text-[#D9247A] cursor-pointer ${product.price === 0 ? 'text-[#E55A1C]' : ''}`}
                        title="Click to edit price"
                      >
                        {product.price === 0 ? 'Set price' : formatPrice(product.price)}
                      </button>
                    )}
                  </td>
                  {/* Active toggle */}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleActive(product)}
                      disabled={saving === product.id}
                      className={`w-10 h-5 rounded-full border-[2px] border-black transition-colors relative disabled:opacity-50 ${product.is_active ? 'bg-[#8DC63F]' : 'bg-gray-200'}`}
                      title={product.is_active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      <span className={`absolute top-0.5 w-3 h-3 bg-white border border-gray-300 rounded-full shadow transition-transform ${product.is_active ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </td>
                  {/* Actions */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/products/${product.id}/edit`} className="text-xs font-bold text-[#D9247A] hover:underline" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        Edit
                      </Link>
                      <button
                        onClick={() => deleteProduct(product)}
                        disabled={saving === product.id}
                        className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                        style={{ fontFamily: "'Nunito', sans-serif" }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2 font-bold" style={{ fontFamily: "'Nunito', sans-serif" }}>
        {filtered.length} of {products.length} products shown
      </p>
    </div>
  )
}
