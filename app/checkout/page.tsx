'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  Package,
  Percent,
  Truck,
  X,
} from 'lucide-react'
import { z } from 'zod'

import type {
  CheckoutDiscount,
  CheckoutPaymentIntentResponse,
  CheckoutQuoteResponse,
  CheckoutShippingOption,
} from '@/lib/checkout/contracts'
import { buildCheckoutItemsPayload } from '@/lib/checkout/payload'
import { checkoutCustomerSchema, checkoutShippingSchema } from '@/lib/checkout/session'
import { useCartStore } from '@/lib/store/cart-store'
import { StripeElementsCheckout } from '@/components/checkout/stripe-elements-checkout'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

declare global {
  interface Window {
    google?: any
  }
}

const checkoutFormSchema = z.object({
  customer: checkoutCustomerSchema,
  shipping: checkoutShippingSchema,
})

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>
type CheckoutStepId = 'customer' | 'address' | 'shipping' | 'payment'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const INVALID_CART_MESSAGE =
  'Your cart contains an item we could not verify. Remove it and add it again before checking out.'
const CHECKOUT_ERROR_MESSAGE = 'We could not process checkout.'
const QUOTE_ERROR_MESSAGE = 'We could not calculate shipping for this address.'
const CART_CHANGED_ERROR_MESSAGE = 'Your cart changed. Please try again.'
const DISCOUNT_ERROR_MESSAGE = 'We could not apply the discount.'
const RATE_LIMIT_ERROR_MESSAGE = 'Too many requests. Please try again in a few minutes.'

function getPublicRequestError(
  status: number,
  fallbackMessage: string,
  cartChangedMessage = CART_CHANGED_ERROR_MESSAGE
) {
  if (status === 429) {
    return RATE_LIMIT_ERROR_MESSAGE
  }

  if ([409, 410].includes(status)) {
    return cartChangedMessage
  }

  return fallbackMessage
}

function formatSelectedOptions(item: {
  selectedOptions?: Record<string, string>
  selectedColor?: string
  selectedSize?: string
}) {
  const optionEntries = Object.entries(item.selectedOptions ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([, value]) => value)

  if (optionEntries.length > 0) {
    return optionEntries.join(' | ')
  }

  return [item.selectedColor, item.selectedSize].filter(Boolean).join(' | ')
}

function parseGoogleAddressComponents(place: any) {
  const components = Array.isArray(place?.addressComponents)
    ? place.addressComponents
    : Array.isArray(place?.address_components)
      ? place.address_components
      : []
  const getComponent = (
    type: string,
    valueType: 'long' | 'short' = 'long'
  ) => {
    const component = components.find((entry: any) => entry.types?.includes(type))

    if (!component) {
      return ''
    }

    if (valueType === 'short') {
      return String(component.shortText ?? component.short_name ?? '').trim()
    }

    return String(component.longText ?? component.long_name ?? '').trim()
  }

  const streetNumber = getComponent('street_number')
  const route = getComponent('route')
  const subpremise = getComponent('subpremise')
  const floor = getComponent('floor')
  const room = getComponent('room')
  const city =
    getComponent('locality') ||
    getComponent('postal_town') ||
    getComponent('sublocality_level_1') ||
    getComponent('administrative_area_level_2')
  const state = getComponent('administrative_area_level_1', 'short')
  const postalCode = getComponent('postal_code')
  const country = getComponent('country', 'short') || 'US'

  return {
    addressLine1: [streetNumber, route].filter(Boolean).join(' ').trim(),
    addressLine2: [subpremise, floor, room].filter(Boolean).join(', ').trim(),
    city,
    state,
    postalCode,
    country,
    formattedAddress: String(place?.formattedAddress ?? place?.formatted_address ?? '').trim(),
  }
}

function buildAddressSummaryLines(shipping: CheckoutFormValues['shipping']) {
  const line1 = shipping.addressLine1.trim()
  const line2 = shipping.addressLine2?.trim() ?? ''
  const localityLine = [shipping.city, shipping.state, shipping.postalCode]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(', ')

  return [line1, line2, localityLine].filter(Boolean)
}

function getDeliveryEstimateText(option: CheckoutShippingOption) {
  if (option.label) {
    return option.label
  }

  if (option.deliveryEstimateText) {
    return option.deliveryEstimateText
  }

  if (typeof option.estimatedDays === 'number' && option.estimatedDays > 0) {
    return `Estimated delivery in ${option.estimatedDays} business days`
  }

  return 'Estimated delivery provided by carrier'
}

function toMoneyAmount(value: unknown) {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN

  return Number.isFinite(numericValue) ? numericValue : 0
}

function toDiscountAmount(value: unknown) {
  return Math.abs(toMoneyAmount(value))
}

function resolveDiscountAmount(source: Record<string, unknown>, payload?: Record<string, unknown>) {
  const amount = toDiscountAmount(source.amount ?? payload?.amount)

  if (amount > 0) {
    return amount
  }

  const amountCentsValue = source.amountCents ?? payload?.amountCents
  const amountCents = toMoneyAmount(amountCentsValue)

  if (Number.isFinite(amountCents) && amountCents > 0) {
    return amountCents / 100
  }

  return 0
}

function normalizeDiscountPercentage(value: number | undefined) {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return null
  }

  return value <= 1 ? value * 100 : value
}

function getStepIndex(step: CheckoutStepId) {
  return ['customer', 'address', 'shipping', 'payment'].indexOf(step)
}

function parseTotals(source: Record<string, unknown> | undefined) {
  if (!source) {
    return null
  }

  return {
    subtotal: toMoneyAmount(source.subtotal),
    discount: toDiscountAmount(source.discount),
    taxableSubtotal: toMoneyAmount(source.taxableSubtotal),
    tax: toMoneyAmount(source.tax),
    shipping: toMoneyAmount(source.shipping),
    total: toMoneyAmount(source.total),
    currency: typeof source.currency === 'string' ? source.currency : undefined,
  }
}

function parseShippingOption(option: unknown): CheckoutShippingOption | null {
  if (!option || typeof option !== 'object') {
    return null
  }

  const source = option as Record<string, unknown>
  const id = String(source.id ?? '').trim()

  if (!id) {
    return null
  }

  return {
    id,
    label: typeof source.label === 'string' ? source.label : undefined,
    carrier: typeof source.carrier === 'string' ? source.carrier : '',
    service: typeof source.service === 'string' ? source.service : undefined,
    amount: toMoneyAmount(source.amount),
    currency: typeof source.currency === 'string' ? source.currency : undefined,
    estimatedDays:
      typeof source.estimatedDays === 'number' ? source.estimatedDays : null,
    deliveryEstimateText:
      typeof source.deliveryEstimateText === 'string'
        ? source.deliveryEstimateText
        : undefined,
    description:
      typeof source.description === 'string' ? source.description : undefined,
  }
}

function parseDiscount(payload: Record<string, unknown>): CheckoutDiscount | null {
  const source =
    payload.discount && typeof payload.discount === 'object'
      ? (payload.discount as Record<string, unknown>)
      : payload
  const code = String(source.code ?? payload.code ?? '').trim()

  if (!code) {
    return null
  }

  const amount = resolveDiscountAmount(source, payload)
  const percentageValue = source.percentage ?? payload.percentage ?? source.value ?? payload.value
  const percentage = normalizeDiscountPercentage(toMoneyAmount(percentageValue))

  return {
    id: typeof source.id === 'number' ? source.id : undefined,
    documentId: typeof source.documentId === 'string' ? source.documentId : undefined,
    name:
      typeof source.name === 'string'
        ? source.name
        : typeof payload.name === 'string'
          ? payload.name
          : undefined,
    code,
    value: toMoneyAmount(source.value ?? payload.value),
    amountCents: Math.round(toMoneyAmount(source.amountCents ?? payload.amountCents)),
    amount,
    currency:
      typeof source.currency === 'string'
        ? source.currency
        : typeof payload.currency === 'string'
          ? payload.currency
          : undefined,
    description:
      typeof source.description === 'string'
        ? source.description
        : typeof payload.description === 'string'
          ? payload.description
          : undefined,
    percentage: percentage ?? undefined,
    type:
      typeof source.type === 'string'
        ? source.type
        : typeof payload.type === 'string'
          ? payload.type
          : undefined,
  }
}

function parseQuoteResponse(payload: Record<string, unknown>): CheckoutQuoteResponse | null {
  const totalsSource =
    payload.totals && typeof payload.totals === 'object'
      ? (payload.totals as Record<string, unknown>)
      : undefined
  const totals = parseTotals(totalsSource)
  const shippingOptions = Array.isArray(payload.shippingOptions)
    ? payload.shippingOptions
        .map((option) => parseShippingOption(option))
        .filter((option): option is CheckoutShippingOption => option !== null)
    : []

  if (!totals) {
    return null
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : undefined,
    totals,
    shippingOptions,
    originLabel: typeof payload.originLabel === 'string' ? payload.originLabel : undefined,
    discount: parseDiscount(payload),
    checkoutSessionToken:
      typeof payload.checkoutSessionToken === 'string'
        ? payload.checkoutSessionToken
        : undefined,
    shippingFingerprint:
      typeof payload.shippingFingerprint === 'string'
        ? payload.shippingFingerprint
        : undefined,
  }
}

function parsePaymentIntentResponse(
  payload: Record<string, unknown>
): CheckoutPaymentIntentResponse | null {
  const clientSecret = String(payload.clientSecret ?? '').trim()
  const quoteResponse = parseQuoteResponse(payload)

  if (!clientSecret || !quoteResponse) {
    return null
  }

  return {
    ...quoteResponse,
    clientSecret,
    orderId: typeof payload.orderId === 'number' ? payload.orderId : undefined,
    paymentIntentId:
      typeof payload.paymentIntentId === 'string' ? payload.paymentIntentId : undefined,
    selectedShippingOption: parseShippingOption(payload.selectedShippingOption),
  }
}

function buildCheckoutShippingAddressPayload(shipping: CheckoutFormValues['shipping']) {
  return {
    addressLine1: shipping.addressLine1,
    ...(shipping.addressLine2?.trim() ? { addressLine2: shipping.addressLine2 } : {}),
    city: shipping.city,
    state: shipping.state,
    postalCode: shipping.postalCode,
    country: shipping.country,
  }
}

export default function CheckoutPage() {
  const { items, getSubtotal } = useCartStore()
  const [googleStatus, setGoogleStatus] = useState<
    'loading' | 'ready' | 'unavailable' | 'error'
  >(GOOGLE_MAPS_API_KEY ? 'loading' : 'unavailable')
  const [quote, setQuote] = useState<CheckoutQuoteResponse | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string | null>(null)
  const [appliedDiscount, setAppliedDiscount] = useState<CheckoutDiscount | null>(null)
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [discountSuccessMessage, setDiscountSuccessMessage] = useState<string | null>(null)
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false)
  const [paymentSession, setPaymentSession] = useState<CheckoutPaymentIntentResponse | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isLoadingPayment, setIsLoadingPayment] = useState(false)
  const [activeStep, setActiveStep] = useState<CheckoutStepId>('customer')
  const addressLine1InputRef = useRef<HTMLInputElement | null>(null)
  const addressAutocompleteContainerRef = useRef<HTMLDivElement | null>(null)
  const autocompleteRef = useRef<any>(null)
  const autocompleteCleanupRef = useRef<(() => void) | null>(null)
  const persistedOrderIdRef = useRef<number | null>(null)
  const persistedPaymentIntentIdRef = useRef<string | null>(null)
  const quotedRequestPayloadRef = useRef<string | null>(null)
  const previousStepCompletionRef = useRef({
    customer: false,
    address: false,
    shipping: false,
  })

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    mode: 'onChange',
    defaultValues: {
      customer: {
        name: '',
        email: '',
        phone: '',
      },
      shipping: {
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
        selectedShippingOptionId: '',
        googleValidatedAddress: false,
      },
    },
  })

  const customerValues = useWatch({
    control: form.control,
    name: 'customer',
  })
  const shippingValues = useWatch({
    control: form.control,
    name: 'shipping',
  })
  const selectedShippingOptionId = useWatch({
    control: form.control,
    name: 'shipping.selectedShippingOptionId',
  }) ?? ''
  const addressValidated = useWatch({
    control: form.control,
    name: 'shipping.googleValidatedAddress',
  })
  const googleAutocompleteAvailable = googleStatus === 'ready'
  const usesGoogleManagedAddress = googleAutocompleteAvailable && !!addressValidated
  const shouldRenderGoogleAddressInput =
    googleStatus === 'loading' || googleStatus === 'ready'

  function resetManagedAddressSelection(resetLocationFields: boolean) {
    if (resetLocationFields) {
      form.setValue('shipping.city', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
      form.setValue('shipping.state', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
      form.setValue('shipping.postalCode', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    form.setValue('shipping.googleValidatedAddress', false, {
      shouldDirty: true,
    })
    form.setValue('shipping.selectedShippingOptionId', '', {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const addressLine1Field = form.register('shipping.addressLine1', {
    onChange: () => {
      if (googleAutocompleteAvailable) {
        resetManagedAddressSelection(true)
        return
      }
      resetManagedAddressSelection(false)
    },
  })

  const safeShippingValues = shippingValues ?? {
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    selectedShippingOptionId: '',
    googleValidatedAddress: false,
  }

  const addressLine2Value = safeShippingValues.addressLine2?.trim() ?? ''
  const shippingAddressSummaryLines = buildAddressSummaryLines(safeShippingValues)
  const checkoutItemsPayload = useMemo(() => buildCheckoutItemsPayload(items), [items])
  const hasInvalidCartItems = checkoutItemsPayload.length !== items.length
  const cartIntegrityError = hasInvalidCartItems ? INVALID_CART_MESSAGE : null
  const checkoutSessionToken = quote?.checkoutSessionToken?.trim() ?? ''
  const canRequestQuote =
    checkoutItemsPayload.length > 0 &&
    !hasInvalidCartItems &&
    checkoutShippingSchema.safeParse(safeShippingValues).success
  const canApplyDiscount =
    checkoutItemsPayload.length > 0 &&
    !hasInvalidCartItems &&
    !!checkoutSessionToken &&
    [safeShippingValues.city, safeShippingValues.state, safeShippingValues.postalCode, safeShippingValues.country].every(
      (value) => value.trim().length > 0
    )

  const quoteRequestPayload = useMemo(
    () =>
      JSON.stringify({
        items: checkoutItemsPayload,
        shipping: buildCheckoutShippingAddressPayload(safeShippingValues),
      }),
    [checkoutItemsPayload, safeShippingValues]
  )
  const quoteMatchesCurrentAddress =
    !!quote && quotedRequestPayloadRef.current === quoteRequestPayload

  function buildPaymentRequestPayload() {
    return JSON.stringify({
      items: checkoutItemsPayload,
      customer: customerValues,
      shipping: {
        ...buildCheckoutShippingAddressPayload(safeShippingValues),
        ...(effectiveSelectedShippingOptionId
          ? { selectedShippingOptionId: effectiveSelectedShippingOptionId }
          : {}),
      },
      billing: buildCheckoutShippingAddressPayload(safeShippingValues),
      ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
      checkoutSessionToken,
      ...(persistedOrderIdRef.current ? { orderId: persistedOrderIdRef.current } : {}),
      ...(persistedPaymentIntentIdRef.current
        ? { paymentIntentId: persistedPaymentIntentIdRef.current }
        : {}),
    })
  }

  const availableShippingOptions =
    paymentSession?.shippingOptions?.length ? paymentSession.shippingOptions : quote?.shippingOptions ?? []
  const quoteHasFreeShippingOverride =
    !!quote &&
    !isLoadingQuote &&
    !quoteError &&
    canRequestQuote &&
    quote.totals.shipping <= 0
  const freeShippingOption =
    availableShippingOptions.find((option) => option.amount <= 0) ?? null
  const hasShippingException = quoteHasFreeShippingOverride && !!freeShippingOption
  const effectiveSelectedShippingOptionId =
    selectedShippingOptionId || (hasShippingException ? freeShippingOption?.id ?? '' : '')
  const requiresShippingSelection =
    !hasShippingException && availableShippingOptions.length > 0
  const shippingSelectionSatisfied =
    !requiresShippingSelection ||
    availableShippingOptions.some((option) => option.id === effectiveSelectedShippingOptionId)
  const selectedShippingOption =
    paymentSession?.selectedShippingOption ??
    availableShippingOptions.find((option) => option.id === effectiveSelectedShippingOptionId) ??
    null
  const displayTotals = paymentSession?.totals ?? quote?.totals ?? null
  const canInitializePayment =
    !hasInvalidCartItems &&
    form.formState.isValid &&
    quoteMatchesCurrentAddress &&
    !!checkoutSessionToken &&
    shippingSelectionSatisfied
  const subtotal = quote?.totals.subtotal ?? getSubtotal()
  const backendDiscountAmount = displayTotals?.discount ?? appliedDiscount?.amount ?? 0
  const derivedPercentageDiscountAmount =
    appliedDiscount?.percentage && subtotal > 0
      ? Number(((subtotal * appliedDiscount.percentage) / 100).toFixed(2))
      : 0
  const shouldUseDerivedPercentageDiscount =
    derivedPercentageDiscountAmount > 0 &&
    (backendDiscountAmount <= 0 ||
      Math.abs(backendDiscountAmount - derivedPercentageDiscountAmount) > 0.01)
  const discountAmount = shouldUseDerivedPercentageDiscount
    ? derivedPercentageDiscountAmount
    : backendDiscountAmount
  const tax = displayTotals?.tax ?? 0
  const shippingAmount = displayTotals?.shipping ?? selectedShippingOption?.amount ?? 0
  const total = displayTotals
    ? Number((subtotal - discountAmount + shippingAmount + tax).toFixed(2))
    : subtotal
  const originLabel = quote?.originLabel?.trim() || ''
  const paymentAmountLabel = displayTotals ? `$${total.toFixed(2)}` : '$0.00'
  const customerComplete =
    !!customerValues?.name?.trim() &&
    !!customerValues?.email?.trim() &&
    !!customerValues?.phone?.trim() &&
    !form.formState.errors.customer?.name &&
    !form.formState.errors.customer?.email &&
    !form.formState.errors.customer?.phone
  const addressComplete =
    canRequestQuote &&
    !form.formState.errors.shipping?.addressLine1 &&
    !form.formState.errors.shipping?.city &&
    !form.formState.errors.shipping?.state &&
    !form.formState.errors.shipping?.postalCode
  const addressReadyForShipping =
    addressComplete &&
    quoteMatchesCurrentAddress &&
    !isLoadingQuote &&
    !quoteError
  const shippingComplete =
    shippingSelectionSatisfied && (requiresShippingSelection || hasShippingException)
  const paymentReady = canInitializePayment && !!paymentSession?.clientSecret && !isLoadingPayment
  const steps = [
    {
      id: 'customer' as const,
      label: 'Customer',
      helper: customerComplete
        ? customerValues?.name?.trim() || 'Ready'
        : 'Contact details',
      complete: customerComplete,
      available: true,
    },
    {
      id: 'address' as const,
      label: 'Address',
      helper: addressReadyForShipping
        ? `${safeShippingValues.city}, ${safeShippingValues.state}`
        : addressComplete && isLoadingQuote
          ? 'Loading rates'
          : quoteError
            ? 'Check address'
            : 'Shipping address',
      complete: addressReadyForShipping,
      available: customerComplete,
    },
    {
      id: 'shipping' as const,
      label: 'Shipping',
      helper: shippingComplete
        ? hasShippingException
          ? 'Free shipping'
          : selectedShippingOption?.label ??
            [selectedShippingOption?.carrier, selectedShippingOption?.service]
              .filter(Boolean)
              .join(' ')
        : 'Choose a rate',
      complete: shippingComplete,
      available: customerComplete && addressReadyForShipping,
    },
    {
      id: 'payment' as const,
      label: 'Payment',
      helper: paymentReady ? 'Stripe ready' : 'Secure checkout',
      complete: false,
      available: customerComplete && addressComplete && shippingComplete,
    },
  ]

  useEffect(() => {
    if (autocompleteRef.current) {
      autocompleteRef.current.value = safeShippingValues.addressLine1 ?? ''
    }
  }, [safeShippingValues.addressLine1])

  async function handleApplyDiscount() {
    const nextCode = discountCode.trim()

    if (!nextCode) {
      setDiscountError(DISCOUNT_ERROR_MESSAGE)
      setDiscountSuccessMessage(null)
      setAppliedDiscount(null)
      setAppliedDiscountCode(null)
      return
    }

    if (!canApplyDiscount) {
      setDiscountError(CART_CHANGED_ERROR_MESSAGE)
      setDiscountSuccessMessage(null)
      return
    }

    setIsApplyingDiscount(true)
    setDiscountError(null)
    setDiscountSuccessMessage(null)

    try {
      const response = await fetch('/api/checkout/discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: checkoutItemsPayload,
          shipping: buildCheckoutShippingAddressPayload(safeShippingValues),
          discountCode: nextCode,
          checkoutSessionToken,
        }),
      })

      const payload = (await response.json()) as Record<string, unknown>

      if (!response.ok) {
        throw new Error(
          getPublicRequestError(response.status, DISCOUNT_ERROR_MESSAGE, DISCOUNT_ERROR_MESSAGE)
        )
      }

      const parsedDiscount = parseDiscount(payload)
      const parsedQuote = parseQuoteResponse(payload)

      if (parsedQuote?.totals) {
        setQuote((current) =>
          current
            ? {
                ...current,
                ...parsedQuote,
                checkoutSessionToken: current.checkoutSessionToken,
                shippingFingerprint:
                  parsedQuote.shippingFingerprint ?? current.shippingFingerprint,
              }
            : current
        )
      }

      setAppliedDiscount(parsedDiscount ?? { code: nextCode, amount: 0 })
      setAppliedDiscountCode(parsedDiscount?.code ?? nextCode)
      setDiscountCode(parsedDiscount?.code ?? nextCode)
      setDiscountSuccessMessage(
        parsedDiscount?.amount
          ? 'Discount code applied successfully.'
          : 'Discount code validated successfully.'
      )
    } catch (error) {
      setAppliedDiscount(null)
      setAppliedDiscountCode(null)
      setDiscountSuccessMessage(null)
      setDiscountError(
        error instanceof Error ? error.message : DISCOUNT_ERROR_MESSAGE
      )
    } finally {
      setIsApplyingDiscount(false)
    }
  }

  function handleRemoveDiscount() {
    setDiscountCode('')
    setAppliedDiscountCode(null)
    setAppliedDiscount(null)
    setDiscountError(null)
    setDiscountSuccessMessage(null)
  }

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setGoogleStatus('unavailable')
      return
    }

    if (activeStep !== 'address') {
      return
    }

    const initializeAutocomplete = async () => {
      if (!addressAutocompleteContainerRef.current || !window.google?.maps?.importLibrary) {
        return
      }

      const { PlaceAutocompleteElement } = (await window.google.maps.importLibrary(
        'places'
      )) as any

      if (!PlaceAutocompleteElement) {
        setGoogleStatus('error')
        return
      }

      const autocompleteContainer = addressAutocompleteContainerRef.current

      if (!autocompleteContainer) {
        return
      }

      if (
        autocompleteRef.current &&
        autocompleteRef.current.parentElement !== autocompleteContainer
      ) {
        autocompleteCleanupRef.current?.()
        autocompleteCleanupRef.current = null
        autocompleteRef.current = null
      }

      if (!autocompleteRef.current) {
        const placeAutocomplete = new PlaceAutocompleteElement({
          includedRegionCodes: ['us'],
          placeholder: 'Start typing your shipping address',
          value: form.getValues('shipping.addressLine1') ?? '',
        })

        placeAutocomplete.className =
          'block w-full rounded-xl border border-input bg-transparent text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
        placeAutocomplete.setAttribute('aria-label', 'Street address')

        const handleInput = (event: Event) => {
          const target = event.currentTarget as any
          form.setValue('shipping.addressLine1', String(target?.value ?? '').trimStart(), {
            shouldDirty: true,
            shouldValidate: true,
          })
          resetManagedAddressSelection(true)
        }

        const handleSelect = async (event: Event) => {
          const placePrediction = (event as any).placePrediction

          if (!placePrediction?.toPlace) {
            return
          }

          const place = placePrediction.toPlace()
          await place.fetchFields({
            fields: ['addressComponents', 'formattedAddress'],
          })

          const parsedAddress = parseGoogleAddressComponents(place)

          if (!parsedAddress.addressLine1) {
            return
          }

          form.setValue('shipping.addressLine1', parsedAddress.addressLine1, {
            shouldDirty: true,
            shouldValidate: true,
          })
          placeAutocomplete.value = parsedAddress.addressLine1
          form.setValue('shipping.addressLine2', parsedAddress.addressLine2, {
            shouldDirty: true,
            shouldValidate: true,
          })
          form.setValue('shipping.city', parsedAddress.city, {
            shouldDirty: true,
            shouldValidate: true,
          })
          form.setValue('shipping.state', parsedAddress.state, {
            shouldDirty: true,
            shouldValidate: true,
          })
          form.setValue('shipping.postalCode', parsedAddress.postalCode, {
            shouldDirty: true,
            shouldValidate: true,
          })
          form.setValue('shipping.country', parsedAddress.country, {
            shouldDirty: true,
            shouldValidate: true,
          })
          form.setValue('shipping.googleValidatedAddress', true, {
            shouldDirty: true,
            shouldValidate: true,
          })
          form.setValue('shipping.selectedShippingOptionId', '', {
            shouldDirty: true,
            shouldValidate: true,
          })
          form.clearErrors('shipping.addressLine1')
        }

        const handleError = () => setGoogleStatus('error')

        placeAutocomplete.addEventListener('input', handleInput)
        placeAutocomplete.addEventListener('gmp-select', handleSelect as EventListener)
        placeAutocomplete.addEventListener('gmp-error', handleError)

        autocompleteContainer.innerHTML = ''
        autocompleteContainer.appendChild(placeAutocomplete)

        autocompleteRef.current = placeAutocomplete
        autocompleteCleanupRef.current = () => {
          placeAutocomplete.removeEventListener('input', handleInput)
          placeAutocomplete.removeEventListener('gmp-select', handleSelect as EventListener)
          placeAutocomplete.removeEventListener('gmp-error', handleError)
        }
      } else {
        autocompleteRef.current.value = form.getValues('shipping.addressLine1') ?? ''
      }

      setGoogleStatus('ready')
    }

    const handleScriptError = () => setGoogleStatus('error')
    const loadTimeout = window.setTimeout(() => {
      if (!window.google?.maps?.importLibrary) {
        setGoogleStatus('error')
      }
    }, 10000)

    if (window.google?.maps?.importLibrary) {
      void initializeAutocomplete().finally(() => {
        window.clearTimeout(loadTimeout)
      })
      return () => {
        window.clearTimeout(loadTimeout)
      }
    }

    const existingScript = document.getElementById('google-maps-places-script') as
      | HTMLScriptElement
      | null

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        void initializeAutocomplete().finally(() => {
          window.clearTimeout(loadTimeout)
        })
        return () => {
          window.clearTimeout(loadTimeout)
        }
      }

      const handleLoad = () => {
        void initializeAutocomplete()
      }

      existingScript.addEventListener('load', handleLoad)
      existingScript.addEventListener('error', handleScriptError)

      return () => {
        window.clearTimeout(loadTimeout)
        existingScript.removeEventListener('load', handleLoad)
        existingScript.removeEventListener('error', handleScriptError)
      }
    }

    const script = document.createElement('script')
    script.id = 'google-maps-places-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      void initializeAutocomplete()
    }
    script.onerror = handleScriptError
    document.body.appendChild(script)

    return () => {
      window.clearTimeout(loadTimeout)
      script.onload = null
      script.onerror = null
    }
  }, [activeStep, form])

  useEffect(() => {
    return () => {
      autocompleteCleanupRef.current?.()
      autocompleteCleanupRef.current = null
      autocompleteRef.current = null
    }
  }, [])

  useEffect(() => {
    if (activeStep === 'address') {
      return
    }

    autocompleteCleanupRef.current?.()
    autocompleteCleanupRef.current = null
    autocompleteRef.current = null
  }, [activeStep])

  useEffect(() => {
    setPaymentSession(null)
    setPaymentError(null)
  }, [selectedShippingOptionId, appliedDiscountCode, customerValues, checkoutSessionToken])

  useEffect(() => {
    quotedRequestPayloadRef.current = null
    setQuote(null)
    setQuoteError(null)
    setPaymentSession(null)
    setPaymentError(null)
    setAppliedDiscount(null)
    setDiscountSuccessMessage(null)
    persistedOrderIdRef.current = null
    persistedPaymentIntentIdRef.current = null
  }, [quoteRequestPayload])

  useEffect(() => {
    if (items.length > 0) {
      return
    }

    persistedOrderIdRef.current = null
    persistedPaymentIntentIdRef.current = null
  }, [items.length])

  useEffect(() => {
    let isActive = true
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const abortController = new AbortController()

    async function loadQuote() {
      setIsLoadingQuote(true)
      setQuoteError(null)

      try {
        const response = await fetch('/api/checkout/quote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: quoteRequestPayload,
          signal: abortController.signal,
        })

        const payload = (await response.json()) as Record<string, unknown> & {
          error?: string
          details?: Array<{ path?: string; message?: string }>
        }

        if (!response.ok) {
          throw new Error(getPublicRequestError(response.status, QUOTE_ERROR_MESSAGE))
        }

        const nextQuote = parseQuoteResponse(payload)

        if (!nextQuote?.checkoutSessionToken) {
          throw new Error(QUOTE_ERROR_MESSAGE)
        }

        if (!isActive) {
          return
        }

        setQuote(nextQuote)
        quotedRequestPayloadRef.current = quoteRequestPayload
        setAppliedDiscount(null)
        setDiscountSuccessMessage(null)

        const currentSelectedShippingOptionId =
          form.getValues('shipping.selectedShippingOptionId') ?? ''
        const nextSelection = nextQuote.shippingOptions.find(
          (option) => option.id === currentSelectedShippingOptionId
        )

        if (currentSelectedShippingOptionId && !nextSelection) {
          form.setValue('shipping.selectedShippingOptionId', '', {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      } catch (error) {
        if (!isActive) {
          return
        }

        setQuote(null)
        quotedRequestPayloadRef.current = null
        setQuoteError(error instanceof Error ? error.message : QUOTE_ERROR_MESSAGE)
      } finally {
        if (isActive) {
          setIsLoadingQuote(false)
        }
      }
    }

    if (!canRequestQuote) {
      quotedRequestPayloadRef.current = null
      setQuote(null)
      setQuoteError(null)
      setIsLoadingQuote(false)
      form.setValue('shipping.selectedShippingOptionId', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
      return () => {
        isActive = false
        abortController.abort()
      }
    }

    timeoutId = setTimeout(() => {
      void loadQuote()
    }, 350)

    return () => {
      isActive = false
      abortController.abort()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [canRequestQuote, form, quoteRequestPayload])

  useEffect(() => {
    let isActive = true
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const abortController = new AbortController()

    async function loadPaymentIntent() {
      setIsLoadingPayment(true)
      setPaymentError(null)

      try {
        const response = await fetch('/api/checkout/payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: buildPaymentRequestPayload(),
          signal: abortController.signal,
        })

        const payload = (await response.json()) as Record<string, unknown> & {
          error?: string
        }

        if (!response.ok) {
          throw new Error(getPublicRequestError(response.status, CHECKOUT_ERROR_MESSAGE))
        }

        const nextPaymentSession = parsePaymentIntentResponse(payload)

        if (!nextPaymentSession) {
          throw new Error(CHECKOUT_ERROR_MESSAGE)
        }

        if (!isActive) {
          return
        }

        setPaymentSession(nextPaymentSession)
        persistedOrderIdRef.current = nextPaymentSession.orderId ?? null
        persistedPaymentIntentIdRef.current =
          nextPaymentSession.paymentIntentId ?? null
        if (nextPaymentSession.discount) {
          setAppliedDiscount(nextPaymentSession.discount)
          setAppliedDiscountCode(nextPaymentSession.discount.code)
          setDiscountCode(nextPaymentSession.discount.code)
        }
      } catch (error) {
        if (!isActive) {
          return
        }

        setPaymentSession(null)
        setPaymentError(
          error instanceof Error
            ? error.message
            : CHECKOUT_ERROR_MESSAGE
        )
      } finally {
        if (isActive) {
          setIsLoadingPayment(false)
        }
      }
    }

    if (!canInitializePayment || items.length === 0 || !quote) {
      setPaymentSession(null)
      setPaymentError(null)
      setIsLoadingPayment(false)
      return () => {
        isActive = false
        abortController.abort()
      }
    }

    timeoutId = setTimeout(() => {
      void loadPaymentIntent()
    }, 350)

    return () => {
      isActive = false
      abortController.abort()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [appliedDiscountCode, canInitializePayment, customerValues, items, quote, safeShippingValues])

  useEffect(() => {
    if (!hasShippingException || !freeShippingOption) {
      return
    }

    if (selectedShippingOptionId === freeShippingOption.id) {
      return
    }

    form.setValue('shipping.selectedShippingOptionId', freeShippingOption.id, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }, [form, freeShippingOption, hasShippingException, selectedShippingOptionId])

  useEffect(() => {
    const previousCompletion = previousStepCompletionRef.current

    previousStepCompletionRef.current = {
      customer: customerComplete,
      address: addressReadyForShipping,
      shipping: shippingComplete,
    }

    if (
      activeStep === 'customer' &&
      customerComplete &&
      !previousCompletion.customer
    ) {
      setActiveStep('address')
      return
    }

    if (
      activeStep === 'address' &&
      addressReadyForShipping &&
      !previousCompletion.address
    ) {
      setActiveStep('shipping')
      return
    }

    if (
      activeStep === 'shipping' &&
      shippingComplete &&
      !previousCompletion.shipping
    ) {
      setActiveStep('payment')
    }
  }, [activeStep, addressReadyForShipping, customerComplete, shippingComplete])

  useEffect(() => {
    if (!customerComplete) {
      if (activeStep !== 'customer') {
        setActiveStep('customer')
      }
    } else if (!addressReadyForShipping) {
      if (getStepIndex(activeStep) > getStepIndex('address')) {
        setActiveStep('address')
      }
    } else if (!shippingComplete) {
      if (getStepIndex(activeStep) > getStepIndex('shipping')) {
        setActiveStep('shipping')
      }
    }
  }, [activeStep, addressReadyForShipping, customerComplete, shippingComplete])

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-24">
        <div className="text-center">
          <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-brand-100">
            <Package className="h-12 w-12 text-brand-500" />
          </div>
          <h1 className="mb-4 text-4xl font-semibold tracking-tight text-brand-500">
            No products in your cart
          </h1>
          <p className="mb-8 text-lg font-serif text-gray-500">
            Add some products before proceeding to checkout.
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
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:px-8 md:py-16">
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-brand-500">
          Complete Your Purchase
        </h1>
        <p className="text-lg font-serif text-gray-500">
          A shorter checkout flow that moves step by step until payment is ready.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_380px] lg:items-start">
        <div className="order-2 lg:order-1">
          <div className="rounded-[2rem] border border-brand-200 bg-white p-5 shadow-[0_20px_60px_rgba(138,112,186,0.08)] sm:p-6 md:p-8">
            <div className="mb-6 flex flex-wrap gap-3">
              {steps.map((step, index) => {
                const isActive = activeStep === step.id

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (step.available || step.complete) {
                        setActiveStep(step.id)
                      }
                    }}
                    disabled={!step.available && !step.complete}
                    className={cn(
                      'flex min-w-[140px] flex-1 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                      isActive
                        ? 'border-brand-500 bg-brand-100 shadow-[0_10px_30px_rgba(165,142,212,0.16)]'
                        : step.complete
                          ? 'border-[#D7F0DE] bg-[#F3FBF6]'
                          : 'border-brand-300 bg-brand-50',
                      !step.available && !step.complete && 'cursor-not-allowed opacity-55'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                        step.complete
                          ? 'bg-success-500 text-white'
                          : isActive
                            ? 'bg-brand-500 text-white'
                            : 'bg-white text-brand-700'
                      )}
                    >
                      {step.complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-800">{step.label}</p>
                      <p className="truncate text-xs text-gray-500">{step.helper}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mb-6 rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm text-gray-600">
              {activeStep === 'customer'
                ? 'Step 1 of 4. We start with the contact details.'
                : activeStep === 'address'
                  ? 'Step 2 of 4. As soon as the address is valid, we move to shipping.'
                  : activeStep === 'shipping'
                    ? 'Step 3 of 4. Pick the best rate to unlock payment.'
                    : 'Step 4 of 4. Payment is ready with Stripe.'}
            </div>

            {activeStep === 'customer' ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-semibold tracking-tight text-brand-700">
                    Customer details
                  </h3>
                  <Truck className="h-7 w-7 text-brand-500" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="customer-name">Customer name</Label>
                    <Input
                      id="customer-name"
                      placeholder="Full name"
                      {...form.register('customer.name')}
                    />
                    {form.formState.errors.customer?.name ? (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.customer.name.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer-email">Email address</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...form.register('customer.email')}
                    />
                    {form.formState.errors.customer?.email ? (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.customer.email.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer-phone">Contact number</Label>
                    <Input
                      id="customer-phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      {...form.register('customer.phone')}
                    />
                    {form.formState.errors.customer?.phone ? (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.customer.phone.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {activeStep === 'address' ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-semibold tracking-tight text-brand-700">
                    Shipping address
                  </h3>
                  <MapPin className="h-7 w-7 text-brand-500" />
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                  Orders ship
                  {originLabel ? (
                    <>
                      {' '}from <strong>{originLabel}</strong>
                    </>
                  ) : null}
                  . Once the address is complete, we automatically request taxes and live
                  rates.
                </div>

                {addressComplete && isLoadingQuote ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm text-gray-600">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Calculating taxes and shipping rates...
                  </div>
                ) : null}

                {quoteError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {quoteError} Please verify the address and ZIP code.
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="shipping-address-line-1">Street address</Label>
                    {shouldRenderGoogleAddressInput ? (
                      <div
                        id="shipping-address-line-1"
                        ref={addressAutocompleteContainerRef}
                        className="rounded-xl border border-input bg-transparent shadow-xs focus-within:ring-[3px] focus-within:ring-ring/50"
                      />
                    ) : (
                      <Input
                        id="shipping-address-line-1"
                        placeholder="Start typing your shipping address"
                        {...addressLine1Field}
                        ref={(element) => {
                          addressLine1Field.ref(element)
                          addressLine1InputRef.current = element
                        }}
                      />
                    )}
                    {googleStatus === 'loading' ? (
                      <p className="flex items-center gap-2 text-sm text-gray-500">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Loading Google address validation...
                      </p>
                    ) : null}
                    {googleStatus === 'ready' && addressValidated ? (
                      <p className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Address validated with Google.
                      </p>
                    ) : null}
                    {googleStatus === 'unavailable' ? (
                      <p className="text-sm text-amber-700">
                        Google address validation will turn on once
                        `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is configured.
                      </p>
                    ) : null}
                    {googleStatus === 'error' ? (
                      <p className="text-sm text-amber-700">
                        Google address validation could not be loaded right now. You can
                        still enter the address manually.
                      </p>
                    ) : null}
                    {form.formState.errors.shipping?.addressLine1 ? (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.shipping.addressLine1.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="shipping-address-line-2">Apt, suite, etc. (optional)</Label>
                    <Input
                      id="shipping-address-line-2"
                      placeholder="Apartment, suite, unit, building, floor, etc."
                      {...form.register('shipping.addressLine2')}
                    />
                    {googleStatus === 'ready' && addressValidated ? (
                      <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
                        <p className="font-medium">Selected address</p>
                        {shippingAddressSummaryLines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                        {!addressLine2Value ? (
                          <p className="mt-2 text-brand-700">
                            If your Google suggestion included an apartment, suite, or unit,
                            confirm it here before continuing.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shipping-city">City</Label>
                    <Input
                      id="shipping-city"
                      placeholder="City"
                      readOnly={usesGoogleManagedAddress}
                      disabled={usesGoogleManagedAddress}
                      className={usesGoogleManagedAddress ? 'bg-gray-50 text-gray-500' : undefined}
                      {...form.register('shipping.city')}
                    />
                    {form.formState.errors.shipping?.city ? (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.shipping.city.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shipping-state">State</Label>
                    <Input
                      id="shipping-state"
                      placeholder="FL"
                      maxLength={2}
                      readOnly={usesGoogleManagedAddress}
                      disabled={usesGoogleManagedAddress}
                      className={usesGoogleManagedAddress ? 'bg-gray-50 text-gray-500' : undefined}
                      {...form.register('shipping.state', {
                        onChange: (event) => {
                          if (usesGoogleManagedAddress) {
                            return
                          }
                          const target = event.target as HTMLInputElement
                          target.value = target.value.toUpperCase()
                          form.setValue('shipping.googleValidatedAddress', false, {
                            shouldDirty: true,
                          })
                          form.setValue('shipping.selectedShippingOptionId', '', {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        },
                      })}
                    />
                    {form.formState.errors.shipping?.state ? (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.shipping.state.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shipping-postal-code">Postal code</Label>
                    <Input
                      id="shipping-postal-code"
                      placeholder="33101"
                      readOnly={usesGoogleManagedAddress}
                      disabled={usesGoogleManagedAddress}
                      className={usesGoogleManagedAddress ? 'bg-gray-50 text-gray-500' : undefined}
                      {...form.register('shipping.postalCode', {
                        onChange: () => {
                          if (usesGoogleManagedAddress) {
                            return
                          }
                          form.setValue('shipping.googleValidatedAddress', false, {
                            shouldDirty: true,
                          })
                          form.setValue('shipping.selectedShippingOptionId', '', {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        },
                      })}
                    />
                    {form.formState.errors.shipping?.postalCode ? (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.shipping.postalCode.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shipping-country">Country</Label>
                    <Input
                      id="shipping-country"
                      value="US"
                      readOnly
                      disabled
                      aria-readonly="true"
                      className="bg-gray-50 text-gray-500"
                    />
                    <p className="text-sm text-gray-500">
                      We currently ship within the United States only.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {activeStep === 'shipping' ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-semibold tracking-tight text-brand-700">
                    Shipping method
                  </h3>
                  <Truck className="h-7 w-7 text-brand-500" />
                </div>

                <div className="space-y-4">
                  {!canRequestQuote ? (
                    <div className="rounded-2xl border border-dashed border-brand-350 bg-brand-50 px-4 py-6 text-sm text-gray-500">
                      {cartIntegrityError
                        ? cartIntegrityError
                        : googleAutocompleteAvailable && !addressValidated
                         ? 'Select a suggested address to load taxes and shipping options.'
                         : 'Complete the shipping address to request live rates.'}
                    </div>
                  ) : null}

                  {isLoadingQuote ? (
                    <div className="rounded-2xl border border-brand-300 bg-brand-50 px-4 py-6 text-sm text-gray-500">
                      Loading shipping options and taxes...
                    </div>
                  ) : null}

                  {quoteError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {quoteError}
                    </div>
                  ) : null}

                  {requiresShippingSelection ? (
                    <RadioGroup
                      value={selectedShippingOptionId}
                      onValueChange={(value) =>
                        form.setValue('shipping.selectedShippingOptionId', value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      className="space-y-3"
                    >
                      {availableShippingOptions.map((option) => (
                        <Label
                          key={option.id}
                          htmlFor={`shipping-option-${option.id}`}
                          className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-colors ${
                            selectedShippingOptionId === option.id
                              ? 'border-brand-500 bg-brand-150'
                              : 'border-gray-200 bg-white hover:border-[#D6C7EF]'
                          }`}
                        >
                          <RadioGroupItem
                            id={`shipping-option-${option.id}`}
                            value={option.id}
                            className="mt-1 border-brand-500 text-brand-500"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-medium text-gray-800">
                                {option.label ??
                                  [option.carrier, option.service].filter(Boolean).join(' ')}
                              </span>
                              <span className="text-sm font-semibold text-brand-700">
                                ${option.amount.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">
                              <strong>{getDeliveryEstimateText(option)}</strong>
                            </p>
                          </div>
                        </Label>
                      ))}
                    </RadioGroup>
                  ) : null}

                  {hasShippingException ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
                      <p className="font-medium">Free shipping applied for this ZIP code.</p>
                      <p className="mt-1">
                        No shipping method selection is required. You can continue to
                        payment.
                      </p>
                    </div>
                  ) : null}

                  {requiresShippingSelection &&
                  form.formState.errors.shipping?.selectedShippingOptionId ? (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.shipping.selectedShippingOptionId.message}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeStep === 'payment' ? (
              <div className="space-y-6">
                <StripeElementsCheckout
                  paymentSession={paymentSession}
                  amountLabel={paymentAmountLabel}
                  isLoading={isLoadingPayment}
                  checkoutError={paymentError}
                  canInitialize={canInitializePayment}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-8 rounded-[2rem] border border-brand-200 bg-white p-5 shadow-[0_20px_60px_rgba(138,112,186,0.08)] sm:p-6">
            <h3 className="mb-5 text-xl font-semibold tracking-tight text-brand-700">
              Order Summary
            </h3>

            <div className="mb-6 space-y-4 border-b border-gray-100 pb-6">
              {cartIntegrityError ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {cartIntegrityError}
                </div>
              ) : null}
              {items.map((item) => {
                const selectedOptionsLabel = formatSelectedOptions(item)

                return (
                  <div key={item.cartItemId} className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-100">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-medium text-gray-800">{item.name}</h4>
                      {selectedOptionsLabel ? (
                        <p className="truncate text-xs text-gray-500">{selectedOptionsLabel}</p>
                      ) : null}
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="mb-6 space-y-3 text-sm text-gray-600">
              {activeStep === 'payment' ? (
                <div className="space-y-5 rounded-[1.75rem] border border-brand-300 bg-brand-50 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-brand-700">
                    <Percent className="h-4 w-4" />
                    Discount code
                  </div>

                  <div className="space-y-3">
                    <Input
                      value={discountCode}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setDiscountCode(nextValue)
                        setDiscountError(null)
                        setDiscountSuccessMessage(null)

                        if (appliedDiscountCode && appliedDiscountCode !== nextValue.trim()) {
                          setAppliedDiscountCode(null)
                        }

                        if (appliedDiscount && appliedDiscount.code !== nextValue.trim()) {
                          setAppliedDiscount(null)
                        }
                      }}
                      placeholder="Enter your code"
                      disabled={!canApplyDiscount && !appliedDiscount}
                      className="bg-white disabled:cursor-not-allowed disabled:bg-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => void handleApplyDiscount()}
                      disabled={isApplyingDiscount || !canApplyDiscount}
                      className="w-full rounded-full bg-brand-400 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-450 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isApplyingDiscount ? 'Validating...' : 'Apply discount'}
                    </button>
                  </div>

                  {!canApplyDiscount && !appliedDiscount ? (
                    <p className="text-sm text-gray-500">
                      {cartIntegrityError ??
                        'Complete the shipping address first so we can refresh checkout before applying a discount code.'}
                    </p>
                  ) : null}

                  {appliedDiscount ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                      <p className="font-medium">
                        {appliedDiscount.code} applied
                        {appliedDiscount.amount > 0
                          ? ` (-$${appliedDiscount.amount.toFixed(2)})`
                          : ''}
                      </p>
                      {appliedDiscount.description ? (
                        <p className="mt-1">{appliedDiscount.description}</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleRemoveDiscount}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-green-800 transition-colors hover:text-green-900"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  ) : null}

                  {discountError ? (
                    <p className="text-sm text-red-600">{discountError}</p>
                  ) : null}
                  {!discountError && discountSuccessMessage ? (
                    <p className="text-sm text-green-700">{discountSuccessMessage}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex justify-between">
                <p>Subtotal</p>
                <p className="font-medium text-gray-800">
                  ${displayTotals ? displayTotals.subtotal.toFixed(2) : subtotal.toFixed(2)}
                </p>
              </div>
              {discountAmount > 0 ? (
                <div className="flex justify-between">
                  <p>Discount</p>
                  <p className="font-medium text-green-700">-${discountAmount.toFixed(2)}</p>
                </div>
              ) : null}
              <div className="flex justify-between">
                <p>Shipping</p>
                <p className="font-medium text-gray-800">
                  {displayTotals
                    ? `$${shippingAmount.toFixed(2)}`
                    : isLoadingQuote
                      ? 'Loading...'
                      : 'Select a shipping option'}
                </p>
              </div>
              <div className="flex justify-between">
                <p>Tax</p>
                <p className="font-medium text-gray-800">
                  {displayTotals ? `$${tax.toFixed(2)}` : isLoadingQuote ? 'Loading...' : '--'}
                </p>
              </div>
            </div>

            <div className="space-y-4 border-t border-gray-100 pt-6">
              {shippingAddressSummaryLines.length > 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                  <p className="mb-2 font-medium text-gray-800">Ship to</p>
                  {shippingAddressSummaryLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ) : null}
              <div className="flex justify-between">
                <p className="text-lg font-semibold text-gray-800">Total</p>
                <p className="text-lg font-semibold text-brand-700">
                  {displayTotals ? `$${total.toFixed(2)}` : `$${getSubtotal().toFixed(2)}`}
                </p>
              </div>
              <div className="rounded-2xl border border-dashed border-brand-350 bg-brand-75 p-4 text-sm text-gray-700">
                <p className="font-medium text-brand-800">
                  {selectedShippingOption
                    ? selectedShippingOption.label ??
                      [selectedShippingOption.carrier, selectedShippingOption.service]
                        .filter(Boolean)
                        .join(' ')
                    : 'Shipping rates will appear here'}
                </p>
                <p>
                  Orders ship
                  {originLabel ? (
                    <>
                      {' '}from <strong>{originLabel}</strong>
                    </>
                  ) : null}
                  . Taxes and delivery estimates are calculated after your address is
                  validated.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
