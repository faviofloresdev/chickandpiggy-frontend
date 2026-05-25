import { NextResponse } from 'next/server'

import { checkoutPaymentIntentRequestSchema } from '@/lib/checkout/session'
import { env } from '@/lib/config/env'

export async function POST(request: Request) {
  try {
    const payloadResult = checkoutPaymentIntentRequestSchema.safeParse(await request.json())

    if (!payloadResult.success) {
      return NextResponse.json(
        { error: 'Please complete the checkout form before continuing.' },
        { status: 400 }
      )
    }

    const strapiCheckoutUrl = new URL(
      env.strapiCheckoutPaymentIntentPath,
      `${env.strapiUrl}/`
    )
    const response = await fetch(strapiCheckoutUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(env.strapiToken ? { Authorization: `Bearer ${env.strapiToken}` } : {}),
      },
      body: JSON.stringify(payloadResult.data),
      cache: 'no-store',
    })

    const payload = (await response.json()) as {
      clientSecret?: string
      paymentIntentId?: string
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
      paymentIntentId: payload.paymentIntentId,
      totals: payload.totals,
    })
  } catch (error) {
    console.error('[stripe-checkout] failed to proxy request to Strapi', error)

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
