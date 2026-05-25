import { NextResponse } from 'next/server'

import { strapiCatalogApi } from '@/lib/api/strapi'

export async function GET() {
  const result = await strapiCatalogApi.listCategories()
  return NextResponse.json(result.data)
}
