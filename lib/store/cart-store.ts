import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Product } from '@/lib/api/contracts'
import { getCartSubtotal } from '@/lib/checkout/pricing'

export interface CartItem extends Product {
  cartItemId: string
  quantity: number
}

interface CartState {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  clearCart: () => void
  getSubtotal: () => number
  getItemCount: () => number
}

function getCartItemId(product: Product) {
  const selectedOptionsKey = Object.entries(product.selectedOptions ?? {})
    .filter(([, value]) => Boolean(value))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value.trim().toLowerCase()}`)
    .join('|')

  return [
    product.id,
    selectedOptionsKey || product.selectedColor?.trim().toLowerCase() || '',
    product.selectedSize?.trim().toLowerCase() ?? '',
  ].join('::')
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product, quantity = 1) => {
        set((state) => {
          const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1
          const cartItemId = getCartItemId(product)
          const existingItem = state.items.find((item) => item.cartItemId === cartItemId)
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.cartItemId === cartItemId
                  ? { ...item, quantity: item.quantity + safeQuantity }
                  : item
              ),
            }
          }
          return {
            items: [...state.items, { ...product, cartItemId, quantity: safeQuantity }],
          }
        })
      },

      removeItem: (cartItemId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.cartItemId !== cartItemId),
        }))
      },

      updateQuantity: (cartItemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId)
          return
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId ? { ...item, quantity } : item
          ),
        }))
      },

      clearCart: () => {
        set({ items: [] })
      },

      getSubtotal: () => {
        return getCartSubtotal(get().items)
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      },
    }),
    {
      name: 'chick-piggy-cart',
    }
  )
)
