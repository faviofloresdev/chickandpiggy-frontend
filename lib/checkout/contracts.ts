export interface CheckoutShippingOption {
  id: string
  label?: string
  carrier: string
  service?: string
  amount: number
  currency?: string
  estimatedDays?: number | null
  deliveryEstimateText?: string
  description?: string
}

export interface CheckoutDiscount {
  id?: number
  documentId?: string
  name?: string
  code: string
  value?: number
  amountCents?: number
  amount: number
  currency?: string
  description?: string
  percentage?: number
  type?: string
}

export interface CheckoutTotals {
  subtotal: number
  discount?: number
  taxableSubtotal?: number
  shipping: number
  tax: number
  total: number
  currency?: string
}

export interface CheckoutQuoteResponse {
  items?: unknown[]
  totals: CheckoutTotals
  shippingOptions: CheckoutShippingOption[]
  originLabel?: string
  discount?: CheckoutDiscount | null
  checkoutSessionToken?: string
  shippingFingerprint?: string
}

export interface CheckoutPaymentIntentResponse extends CheckoutQuoteResponse {
  clientSecret: string
  orderId?: number
  paymentIntentId?: string
  selectedShippingOption?: CheckoutShippingOption | null
}
