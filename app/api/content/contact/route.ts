import { NextResponse } from 'next/server'

import { strapiEndpoints } from '@/lib/api/endpoints'
import { strapiContentApi } from '@/lib/api/strapi'
import { env } from '@/lib/config/env'

export async function GET() {
  const result = await strapiContentApi.getContactInfo()
  return NextResponse.json(result.data)
}

export async function POST(request: Request) {
  const body = await request.text()
  const response = await fetch(new URL(strapiEndpoints.contact, `${env.strapiUrl}/`), {
    method: 'POST',
    body,
    headers: {
      Accept: 'application/json',
      'Content-Type': request.headers.get('content-type') ?? 'application/json',
      ...(env.strapiToken ? { Authorization: `Bearer ${env.strapiToken}` } : {}),
    },
  })

  const responseBody = await response.text()

  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  })
}
