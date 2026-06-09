'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ProductWithInventory, ProductCategory, Gender } from '@/types'
import { CATEGORY_LABELS } from '@/lib/utils'

interface ProductFormProps {
  product?: ProductWithInventory
  mode: 'new' | 'edit'
}

type SizeRow = { size: string; quantity: number }

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [ProductCategory, string][]
const GENDERS: Gender[] = ['girls', 'boys', 'unisex']

export function ProductForm({ product, mode }: ProductFormProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    category: product?.category || 'girls-dresses' as ProductCategory,
    gender: product?.gender || 'girls' as Gender,
    colour: product?.colour || '',
    is_active: product?.is_active ?? true,
  })

  const [sizes, setSizes] = useState<SizeRow[]>(
    product?.inventory?.map(i => ({ size: i.size, quantity: i.quantity })) || [{ size: '', quantity: 0 }]
  )

  const [images, setImages] = useState<string[]>(product?.images || [])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addSizeRow = () => setSizes(s => [...s, { size: '', quantity: 0 }])
  const removeSizeRow = (idx: number) => setSizes(s => s.filter((_, i) => i !== idx))
  const updateSize = (idx: number, field: keyof SizeRow, value: string | number) => {
    setSizes(s => s.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    const uploaded: string[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', `mokids/${form.sku || 'products'}`)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const { url } = await res.json()
      if (url) uploaded.push(url)
    }
    setImages(prev => [...prev, ...uploaded])
    setUploading(false)
  }

  const removeImage = (url: string) => setImages(prev => prev.filter(i => i !== url))

  const handleSave = async () => {
    if (!form.sku || !form.name || !form.category) {
      setError('SKU, Name, and Category are required')
      return
    }
    setSaving(true)
    setError('')

    const validSizes = sizes.filter(s => s.size.trim())
    const payload = { ...form, images, sizes: validSizes }

    const url = mode === 'new' ? '/api/products' : `/api/products/${product?.id}`
    const method = mode === 'new' ? 'POST' : 'PUT'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      router.push('/admin/products')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to save product')
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm font-bold border-[2.5px] border-black rounded-xl bg-[#FFFBEF] focus:outline-none focus:border-[#F5C000] transition-colors'

  return (
    <div className="max-w-3xl">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border-[2px] border-red-400 rounded-xl text-sm text-red-600 font-bold">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] p-6 mb-5">
        <h2 className="font-bold text-lg mb-4" style={{ fontFamily: "'Fredoka One', cursive" }}>Basic Info</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wide text-gray-500">SKU *</label>
            <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className={inputCls} placeholder="MokidsD001" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wide text-gray-500">Price (₦) *</label>
            <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))} className={inputCls} placeholder="35000" />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-bold mb-1 uppercase tracking-wide text-gray-500">Product Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Stunning Turquoise Layered Dress" />
        </div>

        <div className="mt-3">
          <label className="block text-xs font-bold mb-1 uppercase tracking-wide text-gray-500">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} rows={3} placeholder="Product description..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wide text-gray-500">Category *</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ProductCategory }))} className={inputCls}>
              {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wide text-gray-500">Gender *</label>
            <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value as Gender }))} className={inputCls}>
              {GENDERS.map(g => <option key={g} value={g} className="capitalize">{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wide text-gray-500">Colour</label>
            <input value={form.colour} onChange={e => setForm(f => ({ ...f, colour: e.target.value }))} className={inputCls} placeholder="Turquoise" />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Active</label>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
            className={`w-12 h-6 rounded-full border-[2px] border-black transition-colors relative ${form.is_active ? 'bg-[#8DC63F]' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white border border-gray-300 rounded-full shadow transition-transform ${form.is_active ? 'right-0.5' : 'left-0.5'}`} />
          </button>
          <span className="text-xs font-bold text-gray-500">{form.is_active ? 'Visible in store' : 'Hidden from store'}</span>
        </div>
      </div>

      {/* Sizes & Inventory */}
      <div className="bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg" style={{ fontFamily: "'Fredoka One', cursive" }}>Sizes & Inventory</h2>
          <button
            type="button"
            onClick={addSizeRow}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border-[2px] border-black bg-[#F5C000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000] transition-all"
          >
            + Add Size
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {sizes.map((row, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                value={row.size}
                onChange={e => updateSize(idx, 'size', e.target.value)}
                className="flex-1 px-3 py-2 text-sm font-bold border-[2px] border-black rounded-lg bg-[#FFFBEF] focus:outline-none focus:border-[#F5C000]"
                placeholder="e.g. 7 Years, 2T, 10..."
              />
              <input
                type="number"
                value={row.quantity}
                onChange={e => updateSize(idx, 'quantity', parseInt(e.target.value) || 0)}
                className="w-24 px-3 py-2 text-sm font-bold border-[2px] border-black rounded-lg bg-[#FFFBEF] focus:outline-none focus:border-[#F5C000]"
                placeholder="Qty"
                min="0"
              />
              <button type="button" onClick={() => removeSizeRow(idx)} className="text-red-500 font-bold text-sm hover:text-red-700">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] p-6 mb-5">
        <h2 className="font-bold text-lg mb-1" style={{ fontFamily: "'Fredoka One', cursive" }}>Product Photos</h2>
        <p className="text-xs text-gray-500 font-bold mb-3">
          Upload photos for this product (folder name: <span className="font-mono bg-gray-100 px-1 rounded">{form.sku || 'SKU'}</span>)
        </p>

        {/* Dropzone */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-[2.5px] border-dashed border-black rounded-xl p-6 text-center cursor-pointer hover:bg-[#FFFBEF] transition-colors mb-3"
        >
          <p className="text-3xl mb-1">📸</p>
          <p className="text-sm font-bold" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {uploading ? '⏳ Uploading...' : 'Click or drag to upload photos'}
          </p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP up to 10MB each</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Image grid */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((url, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-lg border-[2px] border-black overflow-hidden">
                <Image src={url} alt={`Product image ${idx + 1}`} fill className="object-cover" sizes="80px" />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full text-xs flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 font-bold rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] transition-all disabled:opacity-50"
          style={{ backgroundColor: '#F5C000', fontFamily: "'Fredoka One', cursive", fontSize: '1rem' }}
        >
          {saving ? '⏳ Saving...' : mode === 'new' ? '💾 Create Product' : '💾 Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 font-bold rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] transition-all bg-white"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
