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
    const payloadResult = checkoutQuoteRequestSchema.safeParse(requestBody)

    if (!payloadResult.success) {
      const validationDetails = payloadResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))

      console.error('[checkout-quote] invalid payload', {
        body: requestBody,
        validationDetails,
      })

      return NextResponse.json(
        {
          error: validationDetails[0]?.message ?? 'Please complete the shipping address before requesting rates.',
          details: validationDetails,
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
      return NextResponse.json(
        {
          error:
            payload.error ??
            payload.message ??
            'Unable to load shipping options from Strapi.',
        },
        { status: response.status || 500 }
      )
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[checkout-quote] failed to proxy request to Strapi', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to load shipping options.',
      },
      { status: 500 }
    )
  }
}
