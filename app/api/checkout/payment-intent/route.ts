import { NextResponse } from 'next/server'

import { env } from '@/lib/config/env'
import { getCheckoutUpstreamOrigin } from '@/lib/checkout/proxy-origin'
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
    const originHeader = getCheckoutUpstreamOrigin(request, env.siteUrl)

    if (!originHeader) {
      return NextResponse.json(
        { error: 'We could not process checkout.' },
        { status: 403 }
      )
    }
    const requestBody = await request.json()
    const payloadResult = checkoutPaymentIntentRequestSchema.safeParse(requestBody)

    if (!payloadResult.success) {
      return NextResponse.json(
        { error: 'We could not process checkout.' },
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
        Origin: originHeader,
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
      console.error(
        '[checkout-payment-intent] strapi rejected payload',
        JSON.stringify(
          {
            status: response.status,
            originHeader,
            requestBody: payloadResult.success ? payloadResult.data : requestBody,
            responsePayload: payload,
          },
          null,
          2
        )
      )

      return NextResponse.json(
        {
          error: 'We could not process checkout.',
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
        error: 'We could not process checkout.',
      },
      { status: 500 }
    )
  }
}
