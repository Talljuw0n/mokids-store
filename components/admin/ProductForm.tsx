'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ProductWithInventory, ProductCategory, Gender, Product } from '@/types'
import { CATEGORY_LABELS, COLOUR_SWATCH_MAP } from '@/lib/utils'

interface ProductFormProps {
  product?: ProductWithInventory
  mode: 'new' | 'edit'
}

type SizeRow = { size: string; quantity: number }

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [ProductCategory, string][]
const GENDERS: Gender[] = ['girls', 'boys', 'unisex']

// A 401 here almost always means the admin login cookie has expired — there's
// no session check on the admin pages themselves, so this is often the first
// visible sign of it. Point the admin straight at the fix instead of a vague
// "check your session" guess.
function requestErrorMessage(status: number, action: string): string {
  if (status === 401) return `Your admin session has expired. Log out and log back in, then retry ${action}.`
  return `${action} failed (server error ${status}). Try again in a moment.`
}

export function ProductForm({ product, mode }: ProductFormProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    category: product?.category || 'girls-dresses' as ProductCategory,
    gender: product?.gender || 'girls' as Gender,
    colour: product?.colour || '',
    is_active: product?.is_active ?? true,
    is_variant_child: product?.is_variant_child ?? false,
  })

  const [sizes, setSizes] = useState<SizeRow[]>(
    product?.inventory?.map(i => ({ size: i.size, quantity: i.quantity })) || [{ size: '', quantity: 0 }]
  )

  const [images, setImages] = useState<string[]>(product?.images || [])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ── Colour variants: link this product to sibling colourways ──
  // (shares the same variant_group DB column used for the shoe/pack-size
  // variant feature — the storefront renders it as swatches instead of a
  // dropdown when every sibling has its own `colour` set)
  const [allProducts, setAllProducts] = useState<Product[] | null>(null)
  const [variantSearch, setVariantSearch] = useState('')
  const [siblingIds, setSiblingIds] = useState<string[]>([])
  const originalGroupRef = useRef<{ group: string | null; members: string[] }>({ group: null, members: [] })

  useEffect(() => {
    fetch('/api/products?all=true')
      .then(res => res.json())
      .then((all: Product[]) => {
        setAllProducts(all)
        if (product?.variant_group) {
          const members = all.filter(p => p.variant_group === product.variant_group && p.id !== product.id).map(p => p.id)
          setSiblingIds(members)
          originalGroupRef.current = { group: product.variant_group, members }
        }
      })
      .catch(() => setAllProducts([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const linkedSiblings = useMemo(
    () => (allProducts ?? []).filter(p => siblingIds.includes(p.id)),
    [allProducts, siblingIds]
  )

  const searchResults = useMemo(() => {
    const q = variantSearch.trim().toLowerCase()
    if (q.length < 2 || !allProducts) return []
    return allProducts
      .filter(p => p.id !== product?.id && !siblingIds.includes(p.id) &&
        (p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)))
      .slice(0, 8)
  }, [variantSearch, allProducts, siblingIds, product?.id])

  const addSibling = (p: Product) => {
    setSiblingIds(ids => [...ids, p.id])
    setVariantSearch('')
  }
  const removeSibling = (id: string) => setSiblingIds(ids => ids.filter(i => i !== id))

  const addSizeRow = () => setSizes(s => [...s, { size: '', quantity: 0 }])
  const removeSizeRow = (idx: number) => setSizes(s => s.filter((_, i) => i !== idx))
  const updateSize = (idx: number, field: keyof SizeRow, value: string | number) => {
    setSizes(s => s.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    setError('')
    const uploaded: string[] = []
    let failed = 0
    let lastFailStatus: number | null = null
    let lastFailMessage: string | null = null
    for (const file of files) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', `mokids/${form.sku || 'products'}`)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!res.ok) {
          failed++
          lastFailStatus = res.status
          lastFailMessage = (await res.json().catch(() => ({})))?.error ?? null
          continue
        }
        const { url } = await res.json()
        if (url) uploaded.push(url)
        else failed++
      } catch {
        failed++
      }
    }
    if (uploaded.length) setImages(prev => [...prev, ...uploaded])
    if (failed > 0) {
      setError(
        failed !== files.length || lastFailStatus === null
          ? `${failed} of ${files.length} photo(s) failed to upload — try those again.`
          : lastFailStatus === 401
          ? requestErrorMessage(401, 'the upload')
          : lastFailMessage ?? requestErrorMessage(lastFailStatus, 'the upload')
      )
    }
    setUploading(false)
  }

  const removeImage = (url: string) => setImages(prev => prev.filter(i => i !== url))

  const moveImage = (idx: number, dir: -1 | 1) => {
    setImages(prev => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const makeCoverImage = (idx: number) => {
    setImages(prev => {
      if (idx === 0) return prev
      const next = [...prev]
      const [chosen] = next.splice(idx, 1)
      next.unshift(chosen)
      return next
    })
  }

  const [replacingIdx, setReplacingIdx] = useState<number | null>(null)
  const triggerReplace = (idx: number) => {
    setReplacingIdx(idx)
    replaceRef.current?.click()
  }
  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || replacingIdx === null) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', `mokids/${form.sku || 'products'}`)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(res.status === 401 ? requestErrorMessage(401, 'the photo replacement') : (body?.error ?? requestErrorMessage(res.status, 'the photo replacement')))
        setReplacingIdx(null)
        setUploading(false)
        return
      }
      const { url } = await res.json()
      if (!url) throw new Error()
      const idx = replacingIdx
      setImages(prev => prev.map((img, i) => i === idx ? url : img))
    } catch {
      setError('Photo replacement failed. Try again.')
    }
    setReplacingIdx(null)
    setUploading(false)
  }

  const [deleting, setDeleting] = useState(false)
  const handleDelete = async () => {
    if (!product?.id) return
    if (!confirm(`Permanently delete "${product.name}" (${product.sku})? This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/admin/products')
      router.refresh()
    } else {
      setError(requestErrorMessage(res.status, 'the delete'))
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (uploading) {
      setError('Still uploading a photo — wait for it to finish before saving.')
      return
    }
    if (!form.sku || !form.name || !form.category) {
      setError('SKU, Name, and Category are required')
      return
    }
    setSaving(true)
    setError('')

    // Resolve the shared variant_group key for colour-variant linking: keep
    // the group this product already belonged to, or adopt a sibling's
    // existing group (joining it), or mint a fresh one from this SKU
    const existingGroup = originalGroupRef.current.group
    const joinedGroup = linkedSiblings.find(s => s.variant_group)?.variant_group ?? null
    const variant_group = siblingIds.length > 0 ? (existingGroup ?? joinedGroup ?? form.sku.toUpperCase()) : null

    const validSizes = sizes.filter(s => s.size.trim())
    const payload = { ...form, variant_group, images, sizes: validSizes }

    const url = mode === 'new' ? '/api/products' : `/api/products/${product?.id}`
    const method = mode === 'new' ? 'POST' : 'PUT'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      if (res.status === 401) {
        setError(requestErrorMessage(401, 'saving'))
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to save product')
      }
      setSaving(false)
      return
    }

    // Sync sibling membership: newly-added siblings adopt this group,
    // siblings the admin removed get detached back to no group
    const originalMembers = originalGroupRef.current.members
    const added = siblingIds.filter(id => !originalMembers.includes(id))
    const removed = originalMembers.filter(id => !siblingIds.includes(id))
    await Promise.all([
      ...added.map(id => fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_group }),
      })),
      ...removed.map(id => fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_group: null }),
      })),
    ])

    router.push('/admin/products')
    router.refresh()
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
            <input type="number" value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))} className={inputCls} placeholder="35000" />
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

      {/* Colour Variants */}
      <div className="bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] p-6 mb-5">
        <h2 className="font-bold text-lg mb-1" style={{ fontFamily: "'Fredoka One', cursive" }}>Colour Variants</h2>
        <p className="text-xs text-gray-500 font-bold mb-4">
          Link this to the same product in other colours — the shop shows one listing with clickable colour swatches. Set each product&apos;s own <span className="underline">Colour</span> field above first.
        </p>

        {linkedSiblings.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {linkedSiblings.map(p => (
              <div key={p.id} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border-[2px] border-black bg-[#FFFBEF]">
                <span
                  className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0"
                  style={{ background: COLOUR_SWATCH_MAP[p.colour?.toLowerCase().replace(/\s+/g, '') || ''] ?? '#d1d5db' }}
                />
                <span className="text-xs font-bold">{p.colour || p.name}</span>
                <button type="button" onClick={() => removeSibling(p.id)} className="text-red-500 font-bold text-xs hover:text-red-700">✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            value={variantSearch}
            onChange={e => setVariantSearch(e.target.value)}
            className={inputCls}
            placeholder="Search by SKU or name to link a colour…"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border-[2px] border-black rounded-xl shadow-[4px_4px_0_#000] max-h-56 overflow-y-auto">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addSibling(p)}
                  className="w-full text-left px-3 py-2 text-sm font-bold hover:bg-[#FFFBEF] flex items-center justify-between gap-2"
                >
                  <span>{p.name}</span>
                  <span className="text-xs text-gray-400 font-mono flex-shrink-0">{p.sku}{p.colour ? ` · ${p.colour}` : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {siblingIds.length > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_variant_child: !f.is_variant_child }))}
              className={`w-12 h-6 rounded-full border-[2px] border-black transition-colors relative flex-shrink-0 ${form.is_variant_child ? 'bg-gray-300' : 'bg-[#8DC63F]'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white border border-gray-300 rounded-full shadow transition-transform ${form.is_variant_child ? 'right-0.5' : 'left-0.5'}`} />
            </button>
            <span className="text-xs font-bold text-gray-500">
              {form.is_variant_child ? 'Hidden from shop grid — only reachable via a sibling\'s colour swatch' : 'Shown as its own tile in the shop grid'}
            </span>
          </div>
        )}
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
        <input
          ref={replaceRef}
          type="file"
          accept="image/*"
          onChange={handleReplaceFile}
          className="hidden"
        />

        {/* Image grid */}
        {images.length > 0 && (
          <>
            <p className="text-xs text-gray-500 font-bold mb-2">
              The first photo (marked <span className="px-1 py-0.5 bg-gray-900 text-white rounded text-[10px]">DISPLAY</span>) is what shows on the shop grid and as the default photo. Use ⭐ to make another photo the display image.
            </p>
            <div className="flex flex-wrap gap-3">
              {images.map((url, idx) => (
                <div key={url} className="w-24">
                  <div className="relative w-24 h-24 rounded-lg border-[2px] border-black overflow-hidden">
                    <Image src={url} alt={`Product image ${idx + 1}`} fill className="object-cover" sizes="96px" />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-gray-900 text-white rounded text-[9px] font-bold">
                        DISPLAY
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      title="Remove"
                      className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => moveImage(idx, -1)}
                      disabled={idx === 0}
                      title="Move left"
                      className="w-6 h-6 text-xs font-bold rounded border border-black bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={() => makeCoverImage(idx)}
                      disabled={idx === 0}
                      title="Make display image"
                      className="w-6 h-6 text-xs rounded border border-black bg-[#F5C000] hover:bg-[#e0b000] disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-white"
                    >
                      ⭐
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(idx, 1)}
                      disabled={idx === images.length - 1}
                      title="Move right"
                      className="w-6 h-6 text-xs font-bold rounded border border-black bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerReplace(idx)}
                      title="Replace this photo"
                      className="w-6 h-6 text-xs rounded border border-black bg-white hover:bg-gray-100"
                    >
                      🔄
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading}
          className="px-6 py-3 font-bold rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] transition-all disabled:opacity-50"
          style={{ backgroundColor: '#F5C000', fontFamily: "'Fredoka One', cursive", fontSize: '1rem' }}
        >
          {saving ? '⏳ Saving...' : uploading ? '⏳ Photo uploading...' : mode === 'new' ? '💾 Create Product' : '💾 Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 font-bold rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] transition-all bg-white"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          Cancel
        </button>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto px-6 py-3 font-bold rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] transition-all disabled:opacity-50 bg-red-500 text-white"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            {deleting ? '⏳ Deleting...' : '🗑️ Delete Product'}
          </button>
        )}
      </div>
    </div>
  )
}
