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
  const slug = `${productSlug(product.sku, product.name)}?g=${product.gender}`
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
    <Link href={`/shop/${slug}`} className="group block h-full">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col h-full">
        {/* Image */}
        <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden flex-shrink-0">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-contain group-hover:scale-103 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-200 text-5xl">
              {product.gender === 'boys' ? '👕' : '👗'}
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute top-2 left-2">
              <Badge variant="out">Sold Out</Badge>
            </div>
          )}
        </div>

        {/* Info — flex-col so price/button always sits at the bottom */}
        <div className="p-3 flex flex-col flex-1">
          <h3
            className="text-sm font-bold leading-tight line-clamp-2 text-gray-900"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {product.name}
          </h3>

          <div className="flex items-center justify-between mt-auto pt-3 gap-2">
            <p className="text-base font-bold text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {product.price > 0 ? formatPrice(product.price) : 'TBD'}
            </p>
            {isOutOfStock ? (
              <Button size="sm" variant="ghost" className="text-xs pointer-events-none text-gray-400 bg-gray-100">
                Sold Out
              </Button>
            ) : inventory.length === 1 ? (
              <Button size="sm" variant="primary" onClick={handleAddToCart} className="text-xs">
                Add
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="text-xs text-gray-500">
                View
              </Button>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
