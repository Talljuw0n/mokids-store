export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getServiceClient, isConfigured } from '@/lib/supabase'
import { ProductForm } from '@/components/admin/ProductForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params

  if (!isConfigured()) {
    return (
      <div className="text-center py-16">
        <p className="text-3xl mb-2">⚠️</p>
        <p className="font-bold">Supabase not configured yet</p>
        <Link href="/admin/products" className="text-[#D9247A] hover:underline mt-2 inline-block">← Back to Products</Link>
      </div>
    )
  }

  const sb = getServiceClient()!
  const [{ data: product }, { data: inventory }] = await Promise.all([
    sb.from('products').select('*').eq('id', id).single(),
    sb.from('inventory').select('*').eq('product_id', id).order('size'),
  ])

  if (!product) {
    return (
      <div className="text-center py-16">
        <p className="text-3xl mb-2">❓</p>
        <p className="font-bold">Product not found</p>
        <Link href="/admin/products" className="text-[#D9247A] hover:underline mt-2 inline-block">← Back to Products</Link>
      </div>
    )
  }

  const productWithInventory = { ...product, inventory: inventory || [] }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="text-sm font-bold text-gray-400 hover:text-black transition-colors">
          ← Products
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fredoka One', cursive" }}>
          Edit: {product.name}
        </h1>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Sticky preview panel */}
        <aside className="xl:w-64 xl:flex-shrink-0">
          <div className="bg-white rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] p-4 xl:sticky xl:top-20">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Current Product
            </p>
            {/* Main image */}
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 mb-3">
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">
                  {product.gender === 'boys' ? '👕' : '👗'}
                </div>
              )}
            </div>
            {/* Thumbnail strip */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {product.images.slice(1).map((img: string, i: number) => (
                  <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            {/* Details */}
            <div className="space-y-1 text-xs font-bold" style={{ fontFamily: "'Nunito', sans-serif" }}>
              <div className="flex justify-between">
                <span className="text-gray-400">SKU</span>
                <span className="font-mono text-gray-700">{product.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Price</span>
                <span className="text-[#D9247A]">
                  {product.price > 0 ? `₦${product.price.toLocaleString()}` : 'Not set'}
                </span>
              </div>
              {product.colour && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Colour</span>
                  <span className="text-gray-700 capitalize">{product.colour}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={product.is_active ? 'text-green-600' : 'text-gray-400'}>
                  {product.is_active ? 'Active' : 'Hidden'}
                </span>
              </div>
              {inventory && inventory.length > 0 && (
                <div className="pt-1 border-t border-gray-100">
                  <p className="text-gray-400 mb-1">Sizes in stock</p>
                  <div className="flex flex-wrap gap-1">
                    {inventory.filter((i: { quantity: number }) => i.quantity > 0).map((i: { size: string; quantity: number }) => (
                      <span key={i.size} className="px-1.5 py-0.5 bg-[#F5C000] text-gray-900 rounded text-[10px] font-bold">
                        {i.size}
                      </span>
                    ))}
                    {inventory.filter((i: { quantity: number }) => i.quantity === 0).map((i: { size: string }) => (
                      <span key={i.size} className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[10px] font-bold line-through">
                        {i.size}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Edit form */}
        <div className="flex-1 min-w-0">
          <ProductForm mode="edit" product={productWithInventory} />
        </div>
      </div>
    </div>
  )
}
