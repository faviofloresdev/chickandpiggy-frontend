import type { CartItem } from '@/lib/store/cart-store'

export function getCartSubtotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0)
}
