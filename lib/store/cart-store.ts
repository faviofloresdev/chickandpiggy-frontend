import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Product } from '@/lib/api/contracts'
import { getCartSubtotal } from '@/lib/checkout/pricing'

export interface CartItem extends Product {
  cartItemId: string
  quantity: number
}

type PersistedCartItem = Pick<
  CartItem,
  | 'cartItemId'
  | 'quantity'
  | 'id'
  | 'strapiId'
  | 'documentId'
  | 'slug'
  | 'name'
  | 'price'
  | 'image'
  | 'selectedVariantId'
  | 'selectedColor'
  | 'selectedSize'
  | 'selectedOptions'
  | 'selectedOptionValueIds'
>

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
          const safeQuantity =
            Number.isFinite(quantity) && quantity > 0 ? Math.min(99, Math.floor(quantity)) : 1
          const cartItemId = getCartItemId(product)
          const existingItem = state.items.find((item) => item.cartItemId === cartItemId)
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.cartItemId === cartItemId
                  ? { ...item, quantity: Math.min(99, item.quantity + safeQuantity) }
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
        const safeQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : 0

        if (safeQuantity <= 0) {
          get().removeItem(cartItemId)
          return
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, quantity: Math.min(99, safeQuantity) }
              : item
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
      partialize: (state) => ({
        items: state.items.map<PersistedCartItem>((item) => ({
          cartItemId: item.cartItemId,
          quantity: item.quantity,
          id: item.id,
          strapiId: item.strapiId,
          documentId: item.documentId,
          slug: item.slug,
          name: item.name,
          price: item.price,
          image: item.image,
          selectedVariantId: item.selectedVariantId,
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize,
          selectedOptions: item.selectedOptions,
          selectedOptionValueIds: item.selectedOptionValueIds,
        })),
      }),
    }
  )
)
