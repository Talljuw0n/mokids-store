import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from '@/types'

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem & { maxQuantity?: number }) => void
  removeItem: (productId: string, size: string) => void
  updateQuantity: (productId: string, size: string, quantity: number, maxQuantity?: number) => void
  clearCart: () => void
  syncPrices: (prices: { product_id: string; size: string; price: number }[]) => void
  totalItems: () => number
  subtotal: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: ({ maxQuantity, ...newItem }) => {
        const existing = get().items.find(
          (i) => i.product_id === newItem.product_id && i.size === newItem.size
        )
        const max = maxQuantity ?? existing?.maxQuantity
        if (existing) {
          const newQty = existing.quantity + newItem.quantity
          const capped = max != null ? Math.min(newQty, max) : newQty
          set((state) => ({
            items: state.items.map((i) =>
              i.product_id === newItem.product_id && i.size === newItem.size
                ? { ...i, quantity: capped, maxQuantity: max }
                : i
            ),
          }))
        } else {
          const capped = max != null ? Math.min(newItem.quantity, max) : newItem.quantity
          set((state) => ({ items: [...state.items, { ...newItem, quantity: capped, maxQuantity: max }] }))
        }
      },

      removeItem: (productId, size) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.product_id === productId && i.size === size)
          ),
        }))
      },

      updateQuantity: (productId, size, quantity, maxQuantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, size)
          return
        }
        const capped = maxQuantity != null ? Math.min(quantity, maxQuantity) : quantity
        set((state) => ({
          items: state.items.map((i) =>
            i.product_id === productId && i.size === size ? { ...i, quantity: capped } : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      // Replace saved prices with the server's current ones — a cart kept in
      // localStorage can outlive a sale and still show the old sale prices
      syncPrices: (prices) => {
        set((state) => ({
          items: state.items.map((i) => {
            const match = prices.find((p) => p.product_id === i.product_id && p.size === i.size)
            return match ? { ...i, price: match.price } : i
          }),
        }))
      },

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'mokids-cart' }
  )
)
