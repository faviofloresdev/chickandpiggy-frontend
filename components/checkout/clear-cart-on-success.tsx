'use client'

import { useEffect, useRef } from 'react'

import { useCartStore } from '@/lib/store/cart-store'
import {
  clearCheckoutNewsletterPreference,
  readCheckoutNewsletterPreference,
} from '@/lib/checkout/newsletter-preference'

interface ClearCartOnSuccessProps {
  paymentReference: string | null
}

export function ClearCartOnSuccess({ paymentReference }: ClearCartOnSuccessProps) {
  const clearCart = useCartStore((state) => state.clearCart)
  const hasClearedRef = useRef(false)
  const hasSubmittedNewsletterRef = useRef(false)

  useEffect(() => {
    if (!paymentReference) {
      clearCheckoutNewsletterPreference()
      return
    }

    if (!hasClearedRef.current) {
      clearCart()
      hasClearedRef.current = true
    }

    if (hasSubmittedNewsletterRef.current) {
      return
    }

    const newsletterPreference = readCheckoutNewsletterPreference()

    if (!newsletterPreference) {
      return
    }

    hasSubmittedNewsletterRef.current = true

    void fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email: newsletterPreference.email }),
    })
      .then((response) => {
        if (response.ok) {
          clearCheckoutNewsletterPreference()
        }
      })
      .catch((error) => {
        console.error('Failed to submit checkout newsletter signup', error)
      })
  }, [clearCart, paymentReference])

  return null
}
