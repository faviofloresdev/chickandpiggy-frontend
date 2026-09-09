import { z } from 'zod'

import type { CartItem } from '@/lib/store/cart-store'

export interface CheckoutSelectedOptionPayload {
  optionValueId: string
}

export interface CheckoutItemPayload {
  productId: string
  variantId?: string
  quantity: number
  selectedOptions: CheckoutSelectedOptionPayload[]
}

const checkoutItemPayloadSchema = z
  .object({
    productId: z.string().trim().min(1),
    variantId: z.string().trim().min(1).optional(),
    quantity: z.number().int().min(1).max(50),
    selectedOptions: z.array(
      z
        .object({
          optionValueId: z.string().trim().min(1),
        })
        .strict()
    ),
  })
  .strict()

function sanitizeSelectedOptions(selectedOptionValueIds: CartItem['selectedOptionValueIds']) {
  const optionValueIds = Object.values(selectedOptionValueIds ?? {})
    .map((value) => value.trim())
    .filter((value, index, collection) => value.length > 0 && collection.indexOf(value) === index)

  if (optionValueIds.length === 0) {
    return []
  }

  return optionValueIds.map((optionValueId) => ({
    optionValueId,
  }))
}

function countSelectedOptions(selectedOptions: CartItem['selectedOptions']) {
  return Object.values(selectedOptions ?? {}).filter((value) => value.trim().length > 0).length
}

export function buildCheckoutItemsPayload(items: CartItem[]): CheckoutItemPayload[] {
  return items
    .flatMap((item) => {
      const productReference = item.documentId?.trim() || item.strapiId?.trim()

      if (!productReference) {
        return []
      }

      const selectedOptionsCount = countSelectedOptions(item.selectedOptions)
      const sanitizedSelectedOptions = sanitizeSelectedOptions(item.selectedOptionValueIds)

      // Older persisted carts may have option labels but not option value ids, which now makes
      // the checkout payload invalid for the backend contract.
      if (
        selectedOptionsCount > 0 &&
        (!sanitizedSelectedOptions || sanitizedSelectedOptions.length !== selectedOptionsCount)
      ) {
        return []
      }

      const baseItem: CheckoutItemPayload = {
        productId: productReference,
        quantity:
          Number.isFinite(item.quantity) && item.quantity > 0
            ? Math.min(99, Math.floor(item.quantity))
            : 1,
        selectedOptions: sanitizedSelectedOptions,
      }

      if (item.selectedVariantId) {
        const result = checkoutItemPayloadSchema.safeParse({
          ...baseItem,
          variantId: item.selectedVariantId,
        })

        return result.success ? [result.data] : []
      }

      const result = checkoutItemPayloadSchema.safeParse(baseItem)
      return result.success ? [result.data] : []
    })
}
