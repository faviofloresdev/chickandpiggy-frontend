import { NextResponse } from 'next/server'

import { strapiContentApi } from '@/lib/api/strapi'

export async function GET() {
  const result = await strapiContentApi.getHeader()
  return NextResponse.json(result.data)
}
