import { NextResponse } from 'next/server'

import { env } from '@/lib/config/env'

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function readString(source: Record<string, unknown> | undefined, key: string) {
  const value = source?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

export async function GET() {
  try {
    const strapiOriginUrl = new URL(env.strapiActiveShippingOriginPath, `${env.strapiUrl}/`)
    const response = await fetch(strapiOriginUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(env.strapiToken ? { Authorization: `Bearer ${env.strapiToken}` } : {}),
      },
      cache: 'no-store',
    })

    const payload = (await response.json()) as {
      data?: unknown
      originLabel?: string
      label?: string
      city?: string
      state?: string
      error?: string
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: payload.error ?? 'Unable to load active shipping origin from Strapi.',
        },
        { status: response.status || 500 }
      )
    }

    const root = asRecord(payload)
    const data = asRecord(root?.data)
    const attributes = asRecord(data?.attributes)
    const source = attributes ?? data ?? root

    const originLabel =
      readString(source, 'originLabel') ||
      readString(source, 'label') ||
      [
        readString(source, 'city'),
        readString(source, 'state'),
      ]
        .filter(Boolean)
        .join(', ')
        .trim() ||
      ''

    return NextResponse.json({
      ...root,
      originLabel,
    })
  } catch (error) {
    console.error('[shipping-origin] failed to proxy request to Strapi', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load active shipping origin.',
      },
      { status: 500 }
    )
  }
}
