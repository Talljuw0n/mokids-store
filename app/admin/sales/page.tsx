'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { formatPrice, CATEGORY_LABELS } from '@/lib/utils'

// A 401 here almost always means the admin login cookie has expired — same
// pattern used across the other admin pages.
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
  on_sale?: boolean
  sale_price?: number | null
}

// Converts a stored ISO timestamp to the value a <input type="datetime-local">
// expects (local time, no timezone/seconds), and back again on save.
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminSalesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Inline sale-price editor (mirrors the price editor on /admin/products)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [priceVal, setPriceVal] = useState(0)
  const [percentVal, setPercentVal] = useState('')
  const [savingPrice, setSavingPrice] = useState<string | null>(null)

  // Shared campaign end-date
  const [endsAt, setEndsAt] = useState('')
  const [originalEndsAt, setOriginalEndsAt] = useState('')
  const [savingCampaign, setSavingCampaign] = useState(false)
  const [campaignSaved, setCampaignSaved] = useState(false)

  const load = useCallback(async () => {
    const [prodRes, settingsRes] = await Promise.all([
      fetch('/api/products?all=true'),
      fetch('/api/admin/sale-settings'),
    ])
    const prodData = await prodRes.json()
    setProducts(Array.isArray(prodData) ? prodData : [])
    if (settingsRes.ok) {
      const { ends_at } = await settingsRes.json()
      const local = toDatetimeLocal(ends_at)
      setEndsAt(local)
      setOriginalEndsAt(local)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  )

  const onSaleCount = products.filter(p => p.on_sale).length

  const toggleOnSale = async (product: Product) => {
    setToggling(product.id)
    setError(null)
    const newState = !product.on_sale
    const res = await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ on_sale: newState, sizes: [] }),
    })
    if (res.ok) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, on_sale: newState } : p))
      // Turning a sale on with no price set yet — jump straight into the editor
      if (newState && !product.sale_price) startEdit(product)
    } else {
      setError(requestErrorMessage(res.status, 'toggling the sale'))
    }
    setToggling(null)
  }

  const startEdit = (product: Product) => {
    setEditingId(product.id)
    setPriceVal(product.sale_price || Math.round(product.price * 0.8))
    setPercentVal('')
  }

  const applyPercent = (value: string) => {
    setPercentVal(value)
    const pct = parseFloat(value)
    const product = products.find(p => p.id === editingId)
    if (product && !isNaN(pct) && pct >= 0 && pct <= 100) {
      setPriceVal(Math.round(product.price * (1 - pct / 100)))
    }
  }

  const saveSalePrice = async (product: Product) => {
    setSavingPrice(product.id)
    setError(null)
    const res = await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sale_price: priceVal, on_sale: true, sizes: [] }),
    })
    if (res.ok) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, sale_price: priceVal, on_sale: true } : p))
      setEditingId(null)
    } else {
      setError(requestErrorMessage(res.status, 'saving the sale price'))
    }
    setSavingPrice(null)
  }

  const saveCampaignEnd = async () => {
    setSavingCampaign(true)
    setCampaignSaved(false)
    setError(null)
    // datetime-local has no timezone — treat it as local time, same as the input displayed
    const iso = endsAt ? new Date(endsAt).toISOString() : null
    const res = await fetch('/api/admin/sale-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ends_at: iso }),
    })
    if (res.ok) {
      setOriginalEndsAt(endsAt)
      setCampaignSaved(true)
      setTimeout(() => setCampaignSaved(false), 3000)
    } else {
      setError(requestErrorMessage(res.status, 'saving the campaign end date'))
    }
    setSavingCampaign(false)
  }

  return (
    <div>
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border-[2px] border-red-400 rounded-xl text-sm font-bold text-red-600 flex items-center justify-between" style={{ fontFamily: "'Nunito', sans-serif" }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fredoka One', cursive" }}>Sales</h1>
          <p className="text-xs text-gray-500 font-bold mt-0.5" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {onSaleCount} product{onSaleCount !== 1 ? 's' : ''} currently on sale
          </p>
        </div>
      </div>

      {/* Campaign end date */}
      <div className="bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] p-4 mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-bold mb-1 uppercase tracking-wide text-gray-500">Sale Campaign Ends</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={e => setEndsAt(e.target.value)}
            className="px-3 py-2 text-sm font-bold border-[2.5px] border-black rounded-xl bg-[#FFFBEF] focus:outline-none focus:border-[#F5C000]"
          />
        </div>
        <p className="text-xs text-gray-400 font-bold max-w-xs" style={{ fontFamily: "'Nunito', sans-serif" }}>
          After this date, every item below stops showing its sale badge/price automatically — no need to turn them off by hand. Leave blank for no end date.
        </p>
        <button
          onClick={saveCampaignEnd}
          disabled={savingCampaign || endsAt === originalEndsAt}
          className={`px-4 py-2 font-bold text-sm rounded-lg border-[2.5px] border-black transition-all ${
            campaignSaved ? 'bg-green-100' : endsAt !== originalEndsAt ? 'bg-[#F5C000] shadow-[3px_3px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          {savingCampaign ? 'Saving…' : campaignSaved ? '✓ Saved' : 'Save Date'}
        </button>
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
                {['Image', 'SKU', 'Name', 'Category', 'Price', 'On Sale', 'Sale Price'].map(h => (
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
                <tr key={product.id} className={`border-b border-gray-100 hover:bg-gray-50 ${product.on_sale ? 'bg-[#FFFBEF]' : ''}`}>
                  <td className="px-3 py-2">
                    {product.images?.[0] ? (
                      <Image src={product.images[0]} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400">—</div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-400">{product.sku}</td>
                  <td className="px-3 py-2 font-bold text-xs max-w-[180px] truncate">{product.name}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{CATEGORY_LABELS[product.category] || product.category}</td>
                  <td className="px-3 py-2 font-bold text-xs">{formatPrice(product.price)}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleOnSale(product)}
                      disabled={toggling === product.id}
                      className={`w-10 h-5 rounded-full border-[2px] border-black transition-colors relative disabled:opacity-50 ${product.on_sale ? 'bg-[#E55A1C]' : 'bg-gray-200'}`}
                      title={product.on_sale ? 'Click to take off sale' : 'Click to put on sale'}
                    >
                      <span className={`absolute top-0.5 w-3 h-3 bg-white border border-gray-300 rounded-full shadow transition-transform ${product.on_sale ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {!product.on_sale ? (
                      <span className="text-gray-300">—</span>
                    ) : editingId === product.id ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-gray-500">₦</span>
                        <input
                          type="number"
                          value={priceVal || ''}
                          onChange={e => { setPriceVal(parseInt(e.target.value) || 0); setPercentVal('') }}
                          onKeyDown={e => { if (e.key === 'Enter') saveSalePrice(product); if (e.key === 'Escape') setEditingId(null) }}
                          className="w-24 px-2 py-1 border-[2px] border-black rounded text-sm font-bold focus:outline-none focus:border-[#F5C000] bg-[#FFFBEF]"
                          autoFocus
                          min="0"
                        />
                        <span className="text-gray-400">or</span>
                        <input
                          type="number"
                          value={percentVal}
                          onChange={e => applyPercent(e.target.value)}
                          placeholder="%"
                          className="w-14 px-2 py-1 border-[2px] border-black rounded text-sm font-bold focus:outline-none focus:border-[#F5C000] bg-[#FFFBEF]"
                          min="0"
                          max="100"
                          title="Type a % off to auto-fill the price"
                        />
                        <span className="text-gray-400">% off</span>
                        <button onClick={() => saveSalePrice(product)} disabled={savingPrice === product.id} className="text-xs font-bold text-green-600 hover:underline">
                          {savingPrice === product.id ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-black">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(product)}
                        className="font-bold hover:text-[#D9247A] cursor-pointer"
                        style={{ color: product.sale_price ? '#E55A1C' : undefined }}
                        title="Click to edit sale price"
                      >
                        {product.sale_price ? formatPrice(product.sale_price) : 'Set sale price'}
                      </button>
                    )}
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
