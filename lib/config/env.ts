import 'server-only'

const DEFAULT_STRAPI_URL = 'http://localhost:1337'
const DEFAULT_SITE_URL = 'http://localhost:3000'

function normalizeUrl(value: string | undefined) {
  return value?.replace(/\/$/, '')
}

export const env = {
  siteUrl: normalizeUrl(process.env.SITE_URL) ?? DEFAULT_SITE_URL,
  strapiUrl: normalizeUrl(process.env.STRAPI_URL) ?? DEFAULT_STRAPI_URL,
  strapiToken: process.env.STRAPI_API_TOKEN,
  strapiActiveShippingOriginPath:
    normalizeUrl(process.env.STRAPI_ACTIVE_SHIPPING_ORIGIN_PATH) ??
    'api/shipping-origins/active',
  strapiCheckoutQuotePath:
    normalizeUrl(process.env.STRAPI_CHECKOUT_QUOTE_PATH) ?? 'api/checkout/quote',
  strapiCheckoutDiscountPath:
    normalizeUrl(process.env.STRAPI_CHECKOUT_DISCOUNT_PATH) ??
    normalizeUrl(process.env.STRAPI_DISCOUNT_PATH) ??
    'api/checkout/discount',
  strapiCheckoutPaymentIntentPath:
    normalizeUrl(process.env.STRAPI_CHECKOUT_PAYMENT_INTENT_PATH) ??
    normalizeUrl(process.env.STRAPI_STRIPE_CHECKOUT_PATH) ??
    'api/checkout/payment-intent',
  strapiStripeCheckoutPath:
    normalizeUrl(process.env.STRAPI_STRIPE_CHECKOUT_PATH) ?? 'api/stripe/checkout',
}

if (!process.env.STRAPI_URL) {
  console.warn(
    `[env] STRAPI_URL is not configured. Falling back to ${DEFAULT_STRAPI_URL}. Create .env.local to override it.`
  )
}
