'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/store/cart'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal } = useCartStore()
  const sub = subtotal()

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-5xl mb-4">🛍️</p>
        <h1 className="text-3xl mb-2 text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Your cart is empty
        </h1>
        <p className="text-gray-400 mb-8 font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Looks like you haven&apos;t added anything yet — let&apos;s fix that!
        </p>
        <Link
          href="/shop"
          className="inline-block px-8 py-3 font-bold rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
          style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', backgroundColor: '#F5C000', color: '#111' }}
        >
          Start Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-4xl mb-8 text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Your Cart
          <span className="text-gray-400 text-2xl ml-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            ({items.length} item{items.length !== 1 ? 's' : ''})
          </span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Cart Items */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={`${item.product_id}-${item.size}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4"
              >
                {/* Image */}
                <div className="w-20 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} width={80} height={96} className="object-contain w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-300">
                      No image
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm leading-tight text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                      {item.name}
                    </h3>
                    <p className="font-bold text-sm flex-shrink-0 text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 font-bold mt-0.5" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Size: <span className="text-gray-700">{item.size}</span>
                  </p>
                  <p className="font-bold mt-1 text-[#D9247A] text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    {formatPrice(item.price)} each
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    {/* Quantity stepper */}
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.size, item.quantity - 1)}
                        className="px-2.5 py-1.5 font-bold hover:bg-gray-50 transition-colors text-sm text-gray-600"
                      >
                        −
                      </button>
                      <span className="px-3 py-1.5 text-sm font-bold border-x border-gray-200 text-gray-800" style={{ fontFamily: "'Poppins', sans-serif" }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.size, item.quantity + 1, item.maxQuantity)}
                        disabled={item.maxQuantity != null && item.quantity >= item.maxQuantity}
                        className="px-2.5 py-1.5 font-bold hover:bg-gray-50 transition-colors text-sm text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.product_id, item.size)}
                      className="text-xs text-gray-400 font-bold hover:text-red-500 transition-colors"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-5 text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Order Summary
              </h2>
              <div className="flex flex-col gap-3 text-sm font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="text-gray-900">{formatPrice(sub)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="text-gray-400 italic">Calculated at checkout</span>
                </div>
              </div>

              <Link href="/checkout" className="block mt-6">
                <Button variant="pink" size="lg" fullWidth>
                  Checkout →
                </Button>
              </Link>
              <Link href="/shop" className="block text-center mt-3 text-sm font-bold text-gray-400 hover:text-gray-700 transition-colors" style={{ fontFamily: "'Poppins', sans-serif" }}>
                ← Continue Shopping
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
