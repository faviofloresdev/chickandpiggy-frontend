'use client'

import { useEffect, useRef } from 'react'

import { useCartStore } from '@/lib/store/cart-store'

interface ClearCartOnSuccessProps {
  paymentReference: string | null
}

export function ClearCartOnSuccess({ paymentReference }: ClearCartOnSuccessProps) {
  const clearCart = useCartStore((state) => state.clearCart)
  const hasClearedRef = useRef(false)

  useEffect(() => {
    if (!paymentReference || hasClearedRef.current) {
      return
    }

    clearCart()
    hasClearedRef.current = true
  }, [clearCart, paymentReference])

  return null
}
