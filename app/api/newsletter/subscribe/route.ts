import { NextResponse } from 'next/server'
import { z } from 'zod'

import { env } from '@/lib/config/env'

const newsletterSubscriptionSchema = z.object({
  email: z.string().trim().email('A valid email address is required.'),
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

function collectMessages(value: unknown): string[] {
  if (typeof value === 'string') {
    const message = value.trim()
    return message ? [message] : []
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectMessages)
  }

  if (!value || typeof value !== 'object') {
    return []
  }

  return Object.values(value).flatMap(collectMessages)
}

function extractErrorMessage(payload: Record<string, unknown>) {
  const directMessage = collectMessages(payload.error)[0] ?? collectMessages(payload.message)[0]

  if (directMessage) {
    return directMessage
  }

  const nestedError =
    payload.error && typeof payload.error === 'object'
      ? (payload.error as Record<string, unknown>)
      : undefined

  return (
    collectMessages(nestedError?.message)[0] ??
    collectMessages(nestedError?.details)[0] ??
    collectMessages(payload.details)[0] ??
    null
  )
}

function isDuplicateSubscription(payload: Record<string, unknown>) {
  const combinedMessage = collectMessages(payload).join(' ').toLowerCase()

  return (
    combinedMessage.includes('already subscribed') ||
    combinedMessage.includes('already exists') ||
    combinedMessage.includes('must be unique') ||
    combinedMessage.includes('duplicate')
  )
}

export async function POST(request: Request) {
  try {
    const requestBody = await request.json()
    const payloadResult = newsletterSubscriptionSchema.safeParse(requestBody)

    if (!payloadResult.success) {
      return NextResponse.json(
        {
          error: 'Please enter a valid email address.',
        },
        { status: 400 }
      )
    }

    const strapiNewsletterUrl = new URL(env.strapiNewsletterSubscriptionPath, `${env.strapiUrl}/`)
    const response = await fetch(strapiNewsletterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(env.strapiToken ? { Authorization: `Bearer ${env.strapiToken}` } : {}),
      },
      body: JSON.stringify({
        data: {
          email: payloadResult.data.email,
        },
      }),
      cache: 'no-store',
    })

    const payload = await parseJsonResponse(response)

    if (!response.ok) {
      if ((response.status === 400 || response.status === 409) && isDuplicateSubscription(payload)) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
        })
      }

      const errorMessage = extractErrorMessage(payload)

      console.error(
        '[newsletter-subscribe] strapi rejected payload',
        JSON.stringify(
          {
            status: response.status,
            requestBody: payloadResult.data,
            responsePayload: payload,
          },
          null,
          2
        )
      )

      return NextResponse.json(
        {
          error:
            response.status === 404
              ? 'Newsletter storage is not configured in Strapi yet.'
              : errorMessage ?? 'We could not save your subscription right now. Please try again in a moment.',
        },
        { status: response.status || 500 }
      )
    }

    return NextResponse.json({
      ok: true,
    })
  } catch (error) {
    console.error('[newsletter-subscribe] failed to save subscription', error)

    return NextResponse.json(
      {
        error: 'We could not save your subscription right now. Please try again in a moment.',
      },
      { status: 500 }
    )
  }
}
