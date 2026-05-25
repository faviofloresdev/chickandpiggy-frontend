import { NextResponse } from 'next/server'

import { strapiCatalogApi } from '@/lib/api/strapi'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawLimit = searchParams.get('limit')
  const limit = rawLimit ? Number(rawLimit) : undefined

  const result = await strapiCatalogApi.listFeaturedProducts({
    limit: Number.isFinite(limit) ? limit : undefined,
  })

  return NextResponse.json(result.data)
}
