'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/store/cart'
import { formatPrice, NIGERIAN_STATES, DEFAULT_SHIPPING_RATES, HEAVY_ORDER_THRESHOLD, ShippingRate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import Script from 'next/script'

declare global {
  interface Window {
    PaystackPop: {
      setup(options: {
        key: string
        email: string
        amount: number
        ref: string
        currency: string
        metadata?: Record<string, unknown>
        onClose?: () => void
        callback?: (response: { reference: string }) => void
      }): { openIframe(): void }
    }
  }
}

interface FormData {
  fullName: string
  email: string
  phone: string
  address: string
  state: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, clearCart } = useCartStore()
  const sub = subtotal()

  const [form, setForm] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    state: '',
  })
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [loading, setLoading] = useState(false)
  const [shippingRates, setShippingRates] = useState<Record<string, ShippingRate>>(DEFAULT_SHIPPING_RATES)

  useEffect(() => {
    fetch('/api/shipping-rates')
      .then(r => r.json())
      .then(data => setShippingRates(data))
      .catch(() => {/* keep defaults */})
  }, [])

  const totalItemQty = items.reduce((sum, i) => sum + i.quantity, 0)
  const isHeavyOrder = totalItemQty >= HEAVY_ORDER_THRESHOLD
  const stateRate = form.state ? shippingRates[form.state] : null
  const shippingFee = stateRate
    ? (isHeavyOrder ? stateRate.heavy_fee : stateRate.fee)
    : 0
  const total = sub + shippingFee

  const validate = (): boolean => {
    const errs: Partial<FormData> = {}
    if (!form.fullName.trim()) errs.fullName = 'Full name is required'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Valid email is required'
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) errs.phone = 'Valid phone number is required'
    if (!form.address.trim()) errs.address = 'Delivery address is required'
    if (!form.state) errs.state = 'Please select your state'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (items.length === 0) { router.push('/shop'); return }

    setLoading(true)

    try {
      // 1. Create order in DB
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.fullName,
          email: form.email,
          phone: form.phone,
          shipping_address: form.address,
          state: form.state,
          items: items.map(i => ({
            product_id: i.product_id,
            sku: i.sku,
            name: i.name,
            size: i.size,
            quantity: i.quantity,
            price: i.price,
            image: i.image,
          })),
          subtotal: sub,
          shipping_fee: shippingFee,
          total,
        }),
      })
      const { orderId } = await orderRes.json()

      // 2. Initialize Paystack
      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, email: form.email, amount: total }),
      })
      const { reference } = await checkoutRes.json()

      // 3. Open Paystack inline popup
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: form.email,
        amount: total * 100, // Paystack uses kobo
        ref: reference,
        currency: 'NGN',
        metadata: { orderId, customerName: form.fullName },
        onClose: () => {
          setLoading(false)
        },
        callback: (response) => {
          clearCart()
          router.push(`/order-confirmation/${orderId}?ref=${response.reference}`)
        },
      })
      handler.openIframe()
    } catch (err) {
      console.error(err)
      setLoading(false)
      alert('Something went wrong. Please try again.')
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>Your cart is empty</h1>
        <Link href="/shop">
          <Button variant="primary">Browse Products</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
      <div className="max-w-7xl mx-auto px-4 py-8" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold mb-5 text-gray-900">Delivery Details</h2>

              <Field label="Full Name" error={errors.fullName}>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Enter your full name"
                  className={inputCls(!!errors.fullName)}
                />
              </Field>

              <Field label="Email Address" error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="your@email.com"
                  className={inputCls(!!errors.email)}
                />
              </Field>

              <Field label="Phone Number" error={errors.phone}>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="080XXXXXXXX"
                  className={inputCls(!!errors.phone)}
                />
              </Field>

              {/* State first so the fee shows before they finish typing the address */}
              <Field label="State" error={errors.state}>
                <select
                  value={form.state}
                  onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                  className={inputCls(!!errors.state)}
                >
                  <option value="">Select your state</option>
                  {NIGERIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>

              <Field label="Delivery Address" error={errors.address}>
                <textarea
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="House number, street, area, city…"
                  rows={3}
                  className={inputCls(!!errors.address)}
                />
              </Field>
            </div>

            <Button
              type="submit"
              variant="pink"
              size="lg"
              fullWidth
              disabled={loading || !form.state}
            >
              {loading
                ? 'Processing…'
                : !form.state
                ? 'Select a State to Continue'
                : `Pay ${formatPrice(total)} with Paystack`}
            </Button>
            <p className="text-center text-xs text-gray-400 font-bold">
              Payments are secured by Paystack — Nigeria&apos;s most trusted payment gateway
            </p>
          </form>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4 text-gray-900">Order Summary</h2>
              <div className="flex flex-col gap-3 mb-4">
                {items.map(item => (
                  <div key={`${item.product_id}-${item.size}`} className="flex justify-between text-sm gap-2">
                    <span className="font-bold truncate flex-1 text-gray-700">
                      {item.name}
                      <span className="text-gray-400 font-normal"> × {item.quantity}</span>
                      <span className="text-gray-400 text-xs ml-1">({item.size})</span>
                    </span>
                    <span className="font-bold flex-shrink-0 text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <hr className="border-gray-100 my-3" />
              <div className="flex flex-col gap-2 text-sm font-bold">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(sub)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span>
                    {form.state ? formatPrice(shippingFee) : <span className="text-gray-400">Select state</span>}
                  </span>
                </div>
                {form.state && (
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-gray-400">
                      Shipping to <span className="font-bold text-gray-600">{form.state}</span>
                      {isHeavyOrder && (
                        <span className="ml-1 text-amber-600 font-bold">· heavy order ({totalItemQty} items)</span>
                      )}
                    </p>
                  </div>
                )}
                <hr className="border-gray-100 my-1" />
                <div className="flex justify-between text-lg text-gray-900">
                  <span>Total</span>
                  <span style={{ color: '#D9247A' }}>
                    {form.state ? formatPrice(total) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-bold mb-1.5 text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 font-bold mt-1">{error}</p>}
    </div>
  )
}

function inputCls(hasError: boolean) {
  return `w-full px-4 py-2.5 text-sm font-bold border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all ${
    hasError ? 'border-red-400 bg-red-50' : 'border-gray-200'
  }`
}
