import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Heart, Package } from 'lucide-react'

import { ClearCartOnSuccess } from '@/components/checkout/clear-cart-on-success'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Order Confirmation',
  description: 'Order confirmation page for Chick & Piggy checkout.',
  path: '/thank-you',
  noIndex: true,
})

interface ThankYouPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getStringParam(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : null
}

export default async function ThankYouPage({ searchParams }: ThankYouPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const paymentIntentId = getStringParam(resolvedSearchParams.payment_intent)
  const paymentIntentClientSecret = getStringParam(
    resolvedSearchParams.payment_intent_client_secret
  )
  const redirectStatus = getStringParam(resolvedSearchParams.redirect_status)
  const paymentReference =
    redirectStatus === 'failed'
      ? null
      : paymentIntentId ?? paymentIntentClientSecret
  const orderNumber = paymentIntentId
    ? paymentIntentId.slice(-8).toUpperCase()
    : 'CP-DEMO'

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-24">
      <ClearCartOnSuccess paymentReference={paymentReference} />

      <div className="mb-12 text-center">
        <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-brand-500">
          <Heart className="h-12 w-12 text-white" fill="currentColor" />
        </div>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-brand-500">
          Thank you from the bottom of our hearts!
        </h1>
        <p className="mx-auto max-w-xl text-lg font-serif text-gray-500">
          {redirectStatus === 'failed'
            ? 'We could not confirm your payment. If you try again, we will keep your products waiting in the cart.'
            : 'Your order has been confirmed and we are preparing it with lots of love. Stripe will email your payment receipt, and we will follow up with shipping details.'}
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-gray-50 bg-white p-8 shadow-[0_0_40px_rgba(0,0,0,0.05)] md:p-10">
        <div className="mb-8 border-b border-gray-100 pb-8 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-gray-400">
            Order Reference
          </p>
          <p className="text-2xl font-semibold text-gray-800">#{orderNumber}</p>
        </div>

        <h3 className="mb-6 text-xl font-semibold tracking-tight text-brand-700">
          What happens next?
        </h3>

        <div className="mb-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500">
              <span className="font-semibold text-white">1</span>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-gray-800">
                Payment confirmation
              </h4>
              <p className="text-sm text-gray-500">
                Stripe confirms the payment result and sends the receipt to the email entered during checkout.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500">
              <span className="font-semibold text-white">2</span>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-gray-800">
                Order preparation
              </h4>
              <p className="text-sm text-gray-500">
                Our team will carefully prepare your products within 1-2 business days.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="mb-1 font-medium text-gray-800">Shipping</h4>
              <p className="text-sm text-gray-500">
                We will send you the tracking number when your package is on its way.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/shop"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-400 px-8 py-4 text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-450"
        >
          Continue shopping
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </section>
  )
}
