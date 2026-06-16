export type ProductCategory =
  | 'girls-dresses'
  | 'girls-tops'
  | 'girls-graphic-tees'
  | 'girls-underwear'
  | 'girls-shoes'
  | 'girls-jumpsuits'
  | 'boys-shirts'
  | 'boys-polo'
  | 'boys-sets'
  | 'boys-pyjamas'
  | 'boys-shoes'
  | 'boys-shorts'
  | 'boys-trousers'

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
