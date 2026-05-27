import { NextResponse } from 'next/server'

import { env } from '@/lib/config/env'
import { checkoutDiscountRequestSchema } from '@/lib/checkout/session'

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
    const payloadResult = checkoutDiscountRequestSchema.safeParse(requestBody)

    if (!payloadResult.success) {
      return NextResponse.json(
        {
          error: 'We could not apply the discount.',
        },
        { status: 400 }
      )
    }

    const strapiDiscountUrl = new URL(env.strapiCheckoutDiscountPath, `${env.strapiUrl}/`)
    const response = await fetch(strapiDiscountUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(originHeader ? { Origin: originHeader } : {}),
      },
      body: JSON.stringify(payloadResult.data),
      cache: 'no-store',
    })

    const payload = await parseJsonResponse(response)

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'We could not apply the discount.',
        },
        { status: response.status || 500 }
      )
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[discount] failed to validate discount code', error)

    return NextResponse.json(
      {
        error: 'We could not apply the discount.',
      },
      { status: 500 }
    )
  }
}
