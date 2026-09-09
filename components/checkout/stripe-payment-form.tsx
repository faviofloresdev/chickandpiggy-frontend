'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import {
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'

import { useCartStore } from '@/lib/store/cart-store'
import {
  clearCheckoutNewsletterPreference,
  saveCheckoutNewsletterPreference,
} from '@/lib/checkout/newsletter-preference'

const STRIPE_PAYMENT_ERROR_MESSAGE =
  'We could not confirm the payment right now. Please review your details and try again.'
const STRIPE_PAYMENT_LOAD_ERROR_MESSAGE =
  'We could not load the secure payment form right now. Please try again in a moment.'

interface StripePaymentFormProps {
  amountLabel: string
  customerEmail: string
  newsletterOptIn: boolean
  onLoadError?: (message: string) => void
}

export function StripePaymentForm({
  amountLabel,
  customerEmail,
  newsletterOptIn,
  onLoadError,
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const clearCart = useCartStore((state) => state.clearCart)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsSubmitting(true)
    setPaymentError(null)

    if (newsletterOptIn) {
      saveCheckoutNewsletterPreference(customerEmail)
    } else {
      clearCheckoutNewsletterPreference()
    }

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/thank-you`,
      },
      redirect: 'if_required',
    })

    if (result.error) {
      clearCheckoutNewsletterPreference()
      setPaymentError(STRIPE_PAYMENT_ERROR_MESSAGE)
      setIsSubmitting(false)
      return
    }

    if (result.paymentIntent?.status === 'succeeded' || result.paymentIntent?.status === 'processing') {
      clearCart()
      router.push(`/thank-you?payment_intent=${result.paymentIntent.id}`)
      return
    }

    clearCheckoutNewsletterPreference()
    setPaymentError('The payment is still pending confirmation. Please try again.')
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="min-w-0 max-w-full overflow-hidden rounded-[1.5rem] border border-brand-300 bg-brand-50 p-3 sm:p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
          onLoadError={(event) => {
            const message = STRIPE_PAYMENT_LOAD_ERROR_MESSAGE
            setPaymentError(message)
            onLoadError?.(message)
          }}
        />
      </div>

      {paymentError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {paymentError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-400 px-8 py-4 text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-450 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing payment...
          </>
        ) : (
          <>
            {`Pay ${amountLabel}`}
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>
    </form>
  )
}
