'use client'

import Link from 'next/link'
import { ArrowRight, Minus, Package, Plus, Trash2 } from 'lucide-react'

import { useCartStore } from '@/lib/store/cart-store'

function formatSelectedOptions(item: {
  selectedOptions?: Record<string, string>
  selectedColor?: string
  selectedSize?: string
}) {
  const optionEntries = Object.entries(item.selectedOptions ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([, value]) => value)

  if (optionEntries.length > 0) {
    return optionEntries.join(' · ')
  }

  return [item.selectedColor, item.selectedSize].filter(Boolean).join(' · ')
}

export default function CartPage() {
  const { items, updateQuantity, removeItem, getSubtotal } = useCartStore()

  const subtotal = getSubtotal()

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-24">
        <div className="text-center">
          <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-brand-100">
            <Package className="h-12 w-12 text-brand-500" />
          </div>
          <h1 className="mb-4 text-4xl font-semibold tracking-tight text-brand-500">
            Your cart is empty
          </h1>
          <p className="mb-8 text-lg font-serif text-gray-500">
            Add some products to start shopping.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-full bg-brand-400 px-8 py-4 text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-450"
          >
            View products
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-24">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-brand-500">
          Your Cart
        </h1>
        <p className="text-lg font-serif text-gray-500">
          Review your products before continuing.
        </p>
      </div>

      <div className="flex flex-col gap-12 lg:flex-row">
        <div className="w-full flex-1">
          <div className="rounded-3xl border border-gray-50 bg-white p-6 shadow-[0_0_40px_rgba(0,0,0,0.05)] md:p-8">
            <div className="space-y-6">
              {items.map((item) => {
                const selectedOptionsLabel = formatSelectedOptions(item)

                return (
                  <div
                    key={item.cartItemId}
                    className="flex items-center gap-4 border-b border-gray-100 pb-6 last:border-b-0 last:pb-0"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-50">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-medium text-gray-800">
                        {item.name}
                      </h4>
                      {selectedOptionsLabel ? (
                        <p className="text-xs text-gray-500">{selectedOptionsLabel}</p>
                      ) : null}
                      <p className="text-sm font-semibold text-brand-500">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="w-20 text-right font-medium text-gray-800">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeItem(item.cartItemId)}
                      className="text-gray-400 transition-colors hover:text-red-500"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-96">
          <div className="sticky top-24 rounded-3xl border border-gray-50 bg-white p-8 shadow-[0_0_40px_rgba(0,0,0,0.05)] md:p-10">
            <h3 className="mb-6 text-2xl font-semibold tracking-tight text-brand-700">
              Order Summary
            </h3>

            <div className="mb-8 space-y-3 text-gray-600">
              <div className="flex justify-between">
                <p>Subtotal</p>
                <p className="font-medium text-gray-800">${subtotal.toFixed(2)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-brand-350 bg-brand-50 p-4 text-sm text-gray-600">
              Shipping options and taxes are calculated in checkout after the destination
              address is entered.
            </div>

            <div className="mb-8 mt-8 flex justify-between border-t border-gray-100 pt-6">
              <p className="text-xl font-semibold text-gray-800">Total</p>
              <p className="text-xl font-semibold text-brand-700">
                ${subtotal.toFixed(2)}
              </p>
            </div>

            <Link
              href="/checkout"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-400 px-8 py-4 text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-450"
            >
              Proceed to checkout
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
