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
      <ProductForm mode="edit" product={productWithInventory} />
    </div>
  )
}
