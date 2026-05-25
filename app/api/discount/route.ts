import { NextResponse } from 'next/server'
import { z } from 'zod'

import { env } from '@/lib/config/env'
import {
  checkoutDiscountCodeSchema,
  checkoutItemsSchema,
} from '@/lib/checkout/session'

const discountRequestSchema = z.object({
  discountCode: checkoutDiscountCodeSchema,
  items: checkoutItemsSchema.optional(),
  shipping: z
    .object({
      city: z.string().trim().min(2, 'City is required.'),
      state: z.string().trim().min(2, 'State is required.').max(3),
      postalCode: z.string().trim().min(3, 'Postal code is required.').max(12),
      country: z.string().trim().min(2, 'Country is required.').max(2),
    })
    .optional(),
})

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
    const payloadResult = discountRequestSchema.safeParse(requestBody)

    if (!payloadResult.success) {
      const validationDetails = payloadResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))

      return NextResponse.json(
        {
          error: validationDetails[0]?.message ?? 'Please enter a valid discount code.',
          details: validationDetails,
        },
        { status: 400 }
      )
    }

    const strapiDiscountUrl = new URL(env.strapiDiscountPath, `${env.strapiUrl}/`)
    const response = await fetch(strapiDiscountUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(env.strapiToken ? { Authorization: `Bearer ${env.strapiToken}` } : {}),
      },
      body: JSON.stringify(payloadResult.data),
      cache: 'no-store',
    })

    const payload = await parseJsonResponse(response)

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            typeof payload.error === 'string'
              ? payload.error
              : typeof payload.message === 'string'
                ? payload.message
              : 'Unable to validate the discount code.',
          details: payload.details,
        },
        { status: response.status || 500 }
      )
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[discount] failed to validate discount code', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to validate the discount code.',
      },
      { status: 500 }
    )
  }
}
