import Link from 'next/link'
import { ProductForm } from '@/components/admin/ProductForm'

export default function NewProductPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="text-sm font-bold text-gray-400 hover:text-black transition-colors">
          ← Products
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fredoka One', cursive" }}>
          Add New Product
        </h1>
      </div>
      <ProductForm mode="new" />
    </div>
  )
}
