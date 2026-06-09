'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Product, InventoryItem } from '@/types'
import { formatPrice, productSlug } from '@/lib/utils'
import { Button } from './Button'
import { Badge } from './Badge'
import { useCartStore } from '@/store/cart'

interface ProductCardProps {
  product: Product
  inventory?: InventoryItem[]
}

export function ProductCard({ product, inventory = [] }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const totalStock = inventory.reduce((sum, i) => sum + i.quantity, 0)
  const isOutOfStock = totalStock === 0
  const isLowStock = totalStock > 0 && totalStock <= 3
  const slug = productSlug(product.sku, product.name)
  const mainImage = product.images?.[0]

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    const inStockSizes = inventory.filter(i => i.quantity > 0)
    if (inStockSizes.length === 1) {
      addItem({
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        size: inStockSizes[0].size,
        price: product.price,
        quantity: 1,
        image: mainImage || '',
        maxQuantity: inStockSizes[0].quantity,
      })
    }
  }

  return (
    <Link href={`/shop/${slug}`} className="group block">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        {/* Image */}
        <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover object-top group-hover:scale-103 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-200 text-5xl">
              {product.gender === 'boys' ? '👕' : '👗'}
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isOutOfStock && <Badge variant="out">Sold Out</Badge>}
            {isLowStock && !isOutOfStock && <Badge variant="low">Low Stock</Badge>}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{product.sku}</p>
          <h3
            className="text-sm font-bold leading-tight mt-0.5 line-clamp-2 text-gray-900"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {product.name}
          </h3>

          {/* Sizes */}
          {inventory.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {inventory.map((inv) => (
                <span
                  key={inv.size}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                    inv.quantity > 0
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-gray-50 text-gray-300 line-through'
                  }`}
                >
                  {inv.size}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 gap-2">
            <p className="text-base font-bold text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {product.price > 0 ? formatPrice(product.price) : 'TBD'}
            </p>
            {inventory.length === 1 && !isOutOfStock ? (
              <Button size="sm" variant="primary" onClick={handleAddToCart} className="text-xs">
                Add
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="text-xs pointer-events-none text-gray-500">
                View
              </Button>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
