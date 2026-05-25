import type { CartItem } from '@/lib/store/cart-store'

export interface CheckoutItemPayload {
  id?: string
  productId?: string
  variantId?: string
  quantity: number
  selectedOptions?: Record<string, string>
}

export function buildCheckoutItemsPayload(items: CartItem[]): CheckoutItemPayload[] {
  return items
    .map((item) => {
      const baseItem: CheckoutItemPayload = {
        quantity: item.quantity,
        selectedOptions: item.selectedOptions,
        ...(item.strapiId ? { productId: item.strapiId } : {}),
      }

      if (item.selectedVariantId) {
        return {
          ...baseItem,
          variantId: item.selectedVariantId,
        }
      }

      if (item.strapiId) {
        return baseItem
      }

      return {
        ...baseItem,
        id: item.id,
      }
    })
    .filter((item) => item.quantity > 0)
}
