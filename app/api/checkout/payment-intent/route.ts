import { NextResponse } from 'next/server'

import { env } from '@/lib/config/env'
import { checkoutPaymentIntentRequestSchema } from '@/lib/checkout/session'

async function parseJsonResponse(response: Response) {
  const rawBody = await response.text()

  if (!rawBody.trim()) {
    return {}
  }

  try {
    return JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return {
      error: rawBody.trim(),
    }
  }
}

export async function POST(request: Request) {
  try {
    const payloadResult = checkoutPaymentIntentRequestSchema.safeParse(await request.json())

    if (!payloadResult.success) {
      return NextResponse.json(
        { error: 'Please complete checkout details before continuing.' },
        { status: 400 }
      )
    }

    const strapiPaymentIntentUrl = new URL(
      env.strapiCheckoutPaymentIntentPath,
      `${env.strapiUrl}/`
    )
    const response = await fetch(strapiPaymentIntentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(env.strapiToken ? { Authorization: `Bearer ${env.strapiToken}` } : {}),
      },
      body: JSON.stringify(payloadResult.data),
      cache: 'no-store',
    })

    const payload = (await parseJsonResponse(response)) as {
      clientSecret?: string
      orderId?: number
      paymentIntentId?: string
      items?: unknown
      discount?: unknown
      shippingOptions?: unknown
      selectedShippingOption?: unknown
      totals?: unknown
      error?: string
    }

    if (!response.ok || !payload.clientSecret) {
      return NextResponse.json(
        {
          error: payload.error ?? 'Unable to initialize Stripe payment form from Strapi.',
        },
        { status: response.status || 500 }
      )
    }

    return NextResponse.json({
      clientSecret: payload.clientSecret,
      orderId: payload.orderId,
      paymentIntentId: payload.paymentIntentId,
      items: payload.items,
      discount: payload.discount,
      shippingOptions: payload.shippingOptions,
      selectedShippingOption: payload.selectedShippingOption,
      totals: payload.totals,
    })
  } catch (error) {
    console.error('[checkout-payment-intent] failed to proxy request to Strapi', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to initialize Stripe payment form.',
      },
      { status: 500 }
    )
  }
}
