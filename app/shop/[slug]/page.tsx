'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ProductWithInventory, Product, ProductVariant } from '@/types'
import { formatPrice, CATEGORY_LABELS, COLOUR_SWATCH_MAP } from '@/lib/utils'
import { SizeSelector } from '@/components/ui/SizeSelector'
import { Button } from '@/components/ui/Button'
import { ProductCard } from '@/components/ui/ProductCard'
import { useCartStore } from '@/store/cart'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const sku = slug.split('-')[0].toUpperCase()
  const gender = searchParams.get('g')

  const [product, setProduct] = useState<ProductWithInventory | null>(null)
  const [related, setRelated] = useState<{ product: Product; inventory: ProductWithInventory['inventory'] }[]>([])
  const [variants, setVariants] = useState<ProductVariant[] | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(false)

  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    async function load() {
      const url = `/api/products/by-sku/${encodeURIComponent(sku)}${gender ? `?g=${gender}` : ''}`
      const res = await fetch(url)
      if (!res.ok) { router.push('/shop'); return }
      const json = await res.json()
      if (!json?.product) { router.push('/shop'); return }

      const p = json.product as ProductWithInventory
      setProduct({ ...p, inventory: p.inventory || [] })

      if (json.related?.length) {
        setRelated((json.related as ProductWithInventory[]).map((r) => ({
          product: r as Product,
          inventory: r.inventory || [],
        })))
      }

      const v = (json.variants as ProductVariant[] | null) ?? null
      setVariants(v)
      setSelectedVariantId(v ? p.id : null)
      setSelectedSize(null)
      setLoading(false)
    }
    load()
  }, [sku, gender, router])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-100 border-t-[#D9247A] rounded-full animate-spin" />
        <p className="text-sm font-bold text-gray-400" style={{ fontFamily: "'Poppins', sans-serif" }}>Loading product…</p>
      </div>
    )
  }

  if (!product) return null

  // When this product belongs to a variant group, the selected option supplies
  // its own sku/name/price/inventory/images/colour; description, category and
  // gender always come from the base product
  const activeVariant = variants?.find(v => v.id === selectedVariantId) ?? null
  const effective = {
    id: activeVariant?.id ?? product.id,
    sku: activeVariant?.sku ?? product.sku,
    name: activeVariant?.name ?? product.name,
    price: activeVariant?.price ?? product.price,
    inventory: activeVariant?.inventory ?? product.inventory,
    images: (activeVariant?.images?.length ? activeVariant.images : product.images),
    colour: activeVariant?.colour ?? product.colour,
  }

  // A "colour group" is a variant group where every option represents a
  // different colourway of the same item — shown as clickable swatches
  // instead of the generic text dropdown used for e.g. pack-size options
  const isColourGroup = !!variants && variants.length > 1 && variants.every(v => !!v.colour)

  const inStockInventory = effective.inventory.filter(i => i.quantity > 0)
  const totalStock = effective.inventory.reduce((sum, i) => sum + i.quantity, 0)
  const selectedInv = effective.inventory.find(i => i.size === selectedSize)
  const selectedQty = selectedInv?.quantity ?? 0
  const canAddToCart = selectedSize !== null && selectedQty > 0

  const colourKey = product.colour?.toLowerCase().replace(/\s+/g, '') ?? ''
  const swatchBg = COLOUR_SWATCH_MAP[colourKey]

  const handleVariantChange = (id: string) => {
    setSelectedVariantId(id)
    setSelectedSize(null)
    setActiveImage(0)
  }

  const handleAddToCart = () => {
    if (!canAddToCart) return
    addItem({
      product_id: effective.id,
      sku: effective.sku,
      name: effective.name,
      size: selectedSize!,
      price: effective.price,
      quantity: 1,
      image: effective.images?.[0] || '',
      maxQuantity: selectedQty,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <nav className="text-xs text-gray-400 font-bold mb-8 flex items-center gap-1.5 flex-wrap" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <Link href="/" className="hover:text-gray-700 transition-colors">Home</Link>
          <span className="text-gray-200">/</span>
          <Link href="/shop" className="hover:text-gray-700 transition-colors">Shop</Link>
          <span className="text-gray-200">/</span>
          <Link href={`/shop?category=${product.category}`} className="hover:text-gray-700 transition-colors">
            {CATEGORY_LABELS[product.category]}
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-gray-600">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">

          {/* ── Gallery ── */}
          <div className="min-w-0">
            {/* Main image — tall and prominent */}
            <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-gray-50">
              {effective.images.length > 0 ? (
                <Image
                  src={effective.images[activeImage] ?? effective.images[0]}
                  alt={effective.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-9xl text-gray-200">
                  {product.gender === 'girls' ? '👗' : '👕'}
                </div>
              )}
              {totalStock === 0 && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 text-white text-xs font-bold rounded-full backdrop-blur-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Sold Out
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {effective.images.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
                {effective.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      idx === activeImage ? 'border-gray-900 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Image src={img} alt="" width={80} height={80} className="object-contain w-full h-full" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className="flex flex-col lg:py-2 min-w-0">

            {/* Pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 text-xs font-bold bg-gray-100 text-gray-500 rounded-full capitalize" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {CATEGORY_LABELS[product.category]}
              </span>
              <span className="px-3 py-1 text-xs font-bold bg-gray-100 text-gray-500 rounded-full capitalize" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {product.gender}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl leading-tight text-gray-900 mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {effective.name}
            </h1>

            <p className="text-3xl font-bold mb-8" style={{ fontFamily: "'Poppins', sans-serif" }}>
              <span style={{ color: '#D9247A' }}>
                {effective.price > 0 ? formatPrice(effective.price) : 'Price TBD'}
              </span>
            </p>

            {/* Colour swatches — click to switch between colourway siblings */}
            {isColourGroup && variants && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2.5" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Colour — <span className="normal-case text-gray-600">{effective.colour}</span>
                </p>
                <div className="flex items-center gap-3">
                  {variants.map(v => {
                    const vStock = v.inventory.reduce((sum, i) => sum + i.quantity, 0)
                    const vSoldOut = vStock === 0
                    const bg = COLOUR_SWATCH_MAP[v.colour!.toLowerCase().replace(/\s+/g, '')] ?? '#d1d5db'
                    const isSelected = v.id === selectedVariantId
                    return (
                      <button
                        key={v.id}
                        type="button"
                        title={vSoldOut ? `${v.colour} — Sold out` : v.colour!}
                        disabled={vSoldOut}
                        onClick={() => handleVariantChange(v.id)}
                        className={`relative w-9 h-9 rounded-full border-2 flex-shrink-0 transition-all ${
                          isSelected ? 'border-gray-900 scale-110' : 'border-gray-200'
                        } ${vSoldOut ? 'opacity-35 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}`}
                        style={{ background: bg, boxShadow: isSelected ? '0 0 0 2px white inset' : undefined }}
                      >
                        {vSoldOut && (
                          <span
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{ background: 'linear-gradient(to top right, transparent calc(50% - 1px), #6b7280 50%, transparent calc(50% + 1px))' }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Options — switches price/name/sizes between non-colour variants (e.g. pack sizes, styles) */}
            {!isColourGroup && variants && variants.length > 1 && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2.5" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Options
                </p>
                <select
                  value={selectedVariantId ?? ''}
                  onChange={(e) => handleVariantChange(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm font-bold border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#D9247A]"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {variants.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.variant_label || v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Colour swatch — plain products with a colour but no siblings to switch between */}
            {!isColourGroup && product.colour && (
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2.5" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Colour
                </p>
                <div className="flex items-center gap-2.5">
                  {swatchBg && (
                    <span
                      className="w-6 h-6 rounded-full border border-gray-200 flex-shrink-0 shadow-sm"
                      style={{ background: swatchBg }}
                    />
                  )}
                  <span className="text-sm font-bold text-gray-800 capitalize" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    {product.colour}
                  </span>
                </div>
              </div>
            )}

            {/* Size selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Select Size
                </p>
                {selectedSize && selectedQty > 0 && selectedQty <= 3 && (
                  <span className="text-xs font-bold text-[#E55A1C]" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Only {selectedQty} left!
                  </span>
                )}
              </div>

              {effective.inventory.length > 0 ? (
                <>
                  <SizeSelector
                    inventory={effective.inventory}
                    selectedSize={selectedSize}
                    onSelect={setSelectedSize}
                  />
                  {selectedSize && selectedQty === 0 && (
                    <p className="text-xs text-gray-400 font-bold mt-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                      Sold out in this size — pick another
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  No sizes available
                </p>
              )}
            </div>

            {/* CTA */}
            <Button
              variant="pink"
              size="lg"
              fullWidth
              disabled={!canAddToCart || added}
              onClick={handleAddToCart}
              className="rounded-2xl text-base"
            >
              {added
                ? '✓ Added to Cart'
                : totalStock === 0
                ? 'Sold Out'
                : !selectedSize
                ? 'Select a Size'
                : !canAddToCart
                ? 'Sold Out in This Size'
                : 'Add to Cart'}
            </Button>

            {added && (
              <Link
                href="/cart"
                className="block text-center mt-3 text-sm font-bold text-[#D9247A] hover:underline"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                View Cart →
              </Link>
            )}

            {/* Description */}
            {product.description && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Description
                </p>
                <div className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
                  {product.description.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Specs */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Details
              </p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {[
                  { label: 'Gender',   value: product.gender.charAt(0).toUpperCase() + product.gender.slice(1) },
                  { label: 'Category', value: CATEGORY_LABELS[product.category] },
                  ...(inStockInventory.length ? [{ label: 'In Stock Sizes', value: inStockInventory.map(i => i.size).join(', ') }] : []),
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-gray-400 font-bold text-xs">{label}</dt>
                    <dd className="text-gray-800 font-bold mt-0.5">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>


          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-20 pt-10 border-t border-gray-100">
            <h2 className="text-2xl text-gray-900 mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
              You Might Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map(({ product: rp, inventory: ri }) => (
                <ProductCard key={rp.id} product={rp} inventory={ri} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
