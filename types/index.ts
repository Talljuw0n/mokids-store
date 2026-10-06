export type ProductCategory =
  | 'girls-dresses'
  | 'girls-tops'
  | 'girls-graphic-tees'
  | 'girls-underwear'
  | 'girls-shoes'
  | 'girls-jumpsuits'
  | 'girls-leggings'
  | 'girls-shorts'
  | 'girls-jeans'
  | 'girls-jackets'
  | 'girls-skirts'
  | 'back-to-school-girls'
  | 'girls-baby'
  | 'boys-shirts'
  | 'boys-graphic-tees'
  | 'boys-polo'
  | 'boys-sets'
  | 'boys-pyjamas'
  | 'boys-shoes'
  | 'boys-shorts'
  | 'boys-trousers'
  | 'boys-underwear'
  | 'back-to-school-boys'
  | 'boys-baby'
  | 'birthday-tees'
  | 'clearance'

export type Gender = 'girls' | 'boys' | 'unisex'

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled'

export interface Product {
  id: string
  sku: string
  name: string
  description: string | null
  price: number
  category: ProductCategory
  gender: Gender
  colour: string | null
  images: string[]
  is_active: boolean
  created_at: string
  // Variant grouping: two or more real product rows sharing a variant_group
  // are shown as one listing with a dropdown that switches between them
  variant_group?: string | null
  variant_label?: string | null
  is_variant_child?: boolean
  // Lets a product also show up under another category's listing (e.g. a
  // school shoe filed as girls-shoes that should also appear under Back to
  // School) without duplicating the row or changing its primary category
  also_categories?: ProductCategory[]
  // Sale: `price` is always the real/regular price — `sale_price` only
  // applies while `on_sale` is true, so turning a sale off never loses the
  // original number. Whether the sale is still within the campaign window
  // is resolved separately via SaleSettings, not stored per-product.
  on_sale?: boolean
  sale_price?: number | null
}

// Single shared end-date for the current sale campaign (e.g. "End-of-Year
// Clearance Sale ends Dec 31") — one row, applies to every product flagged on_sale.
// null ends_at means no end date set (stays on until manually turned off).
export interface SaleSettings {
  ends_at: string | null
}

export interface InventoryItem {
  id: string
  product_id: string
  size: string
  quantity: number
  updated_at: string
}

export interface ProductWithInventory extends Product {
  inventory: InventoryItem[]
}

// One sibling in a variant group, as returned by the by-sku API
export interface ProductVariant {
  id: string
  sku: string
  name: string
  price: number
  variant_label: string | null
  colour: string | null
  images: string[]
  on_sale?: boolean
  sale_price?: number | null
  inventory: InventoryItem[]
}

export interface OrderItem {
  product_id: string
  sku: string
  name: string
  size: string
  quantity: number
  price: number
  image?: string
}

export interface Order {
  id: string
  customer_name: string
  email: string
  phone: string
  shipping_address: string
  state: string
  items: OrderItem[]
  subtotal: number
  shipping_fee: number
  total: number
  payment_ref: string | null
  paystack_status: string | null
  status: OrderStatus
  created_at: string
}

export interface CartItem {
  product_id: string
  sku: string
  name: string
  size: string
  price: number
  quantity: number
  image: string
  maxQuantity?: number
}
