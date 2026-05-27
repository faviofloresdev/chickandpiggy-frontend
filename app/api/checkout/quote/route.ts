import { NextResponse } from 'next/server'

import { env } from '@/lib/config/env'
import { checkoutQuoteRequestSchema } from '@/lib/checkout/session'

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
    const requestBody = await request.json()
    const originHeader = request.headers.get('origin')?.trim()
    const payloadResult = checkoutQuoteRequestSchema.safeParse(requestBody)

    if (!payloadResult.success) {
      console.error('[checkout-quote] invalid payload', {
        body: requestBody,
        validationDetails: payloadResult.error.issues,
      })

      return NextResponse.json(
        {
          error: 'We could not process checkout.',
        },
        { status: 400 }
      )
    }

    const strapiQuoteUrl = new URL(env.strapiCheckoutQuotePath, `${env.strapiUrl}/`)
    const response = await fetch(strapiQuoteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(env.strapiToken ? { Authorization: `Bearer ${env.strapiToken}` } : {}),
        ...(originHeader ? { Origin: originHeader } : {}),
      },
      body: JSON.stringify(payloadResult.data),
      cache: 'no-store',
    })

    const payload = (await parseJsonResponse(response)) as {
      totals?: unknown
      shippingOptions?: unknown
      originLabel?: string
      error?: string
      message?: string
    }

    if (!response.ok) {
      console.error(
        '[checkout-quote] strapi rejected payload',
        JSON.stringify(
          {
            status: response.status,
            originHeader,
            requestBody: payloadResult.data,
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

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[checkout-quote] failed to proxy request to Strapi', error)

    return NextResponse.json(
      {
        error: 'We could not process checkout.',
      },
      { status: 500 }
    )
  }
}
