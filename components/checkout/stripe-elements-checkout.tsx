'use client'

import { useMemo, useState } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { CreditCard, ShieldCheck } from 'lucide-react'

import type { CheckoutPaymentIntentResponse } from '@/lib/checkout/contracts'
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form'
import { BRAND_COLORS } from '@/lib/theme/brand'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const invalidStripePublishableKeyPatterns = [
  'pk_test_your_stripe_publishable_key',
  'pk_live_your_stripe_publishable_key',
]

interface StripeElementsCheckoutProps {
  paymentSession: CheckoutPaymentIntentResponse | null
  amountLabel: string
  isLoading: boolean
  checkoutError: string | null
  canInitialize: boolean
}

export function StripeElementsCheckout({
  paymentSession,
  amountLabel,
  isLoading,
  checkoutError,
  canInitialize,
}: StripeElementsCheckoutProps) {
  const [paymentElementError, setPaymentElementError] = useState<string | null>(null)

  const stripeConfigError = useMemo(() => {
    const normalizedKey = stripePublishableKey?.trim() ?? ''

    if (!normalizedKey) {
      return 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured.'
    }

    if (invalidStripePublishableKeyPatterns.includes(normalizedKey)) {
      return 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY still uses the placeholder value. Add your real Stripe publishable key in .env.local.'
    }

    return null
  }, [])

  const stripePromise = useMemo(() => {
    if (stripeConfigError || !stripePublishableKey) {
      return null
    }

    return loadStripe(stripePublishableKey)
  }, [stripeConfigError])

  const visibleCheckoutError = checkoutError ?? paymentElementError ?? stripeConfigError

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold tracking-tight text-brand-700">
          Secure Payment
        </h3>
        <CreditCard className="h-7 w-7 text-brand-500" />
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">
          Complete your payment without leaving our website. Stripe Elements securely renders the payment fields inside this checkout.
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <ShieldCheck className="h-6 w-6 shrink-0 text-success-500" />
          <span className="text-sm text-gray-600">
            Payments are securely processed by <strong>Stripe</strong>. We do not store your card details.
          </span>
        </div>

        {visibleCheckoutError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {visibleCheckoutError}
          </div>
        ) : null}

        {!canInitialize ? (
          <div className="rounded-[1.5rem] border border-dashed border-brand-350 bg-brand-50 px-4 py-10 text-center text-sm text-gray-500">
            Complete customer details, validate the address, and choose a shipping option to load the Stripe payment form.
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-[1.5rem] border border-brand-300 bg-brand-50 px-4 py-10 text-center text-sm text-gray-500">
            Loading secure payment form...
          </div>
        ) : null}

        {!isLoading && paymentSession?.clientSecret && stripePromise ? (
          <Elements
            key={paymentSession.paymentIntentId ?? paymentSession.clientSecret}
            stripe={stripePromise}
            options={{
              clientSecret: paymentSession.clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: BRAND_COLORS.brand500,
                  colorBackground: BRAND_COLORS.brand50,
                  colorText: '#2D2A32',
                  colorDanger: '#B42318',
                  fontFamily: 'var(--font-fredoka), system-ui, sans-serif',
                  borderRadius: '18px',
                },
                rules: {
                  '.Input': {
                    border: `1px solid ${BRAND_COLORS.brand300}`,
                    boxShadow: 'none',
                  },
                  '.Input:focus': {
                    border: `1px solid ${BRAND_COLORS.brand400}`,
                    boxShadow: '0 0 0 4px rgba(197, 179, 230, 0.18)',
                  },
                  '.Tab': {
                    border: `1px solid ${BRAND_COLORS.brand300}`,
                    boxShadow: 'none',
                  },
                  '.Tab--selected': {
                    borderColor: BRAND_COLORS.brand500,
                    backgroundColor: BRAND_COLORS.brand150,
                  },
                  '.Label': {
                    color: '#6B7280',
                  },
                },
              },
            }}
          >
            <StripePaymentForm
              amountLabel={amountLabel}
              onLoadError={(message) => setPaymentElementError(message)}
            />
          </Elements>
        ) : null}
      </div>
    </div>
  )
}
