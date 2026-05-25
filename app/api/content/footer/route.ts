import { NextResponse } from 'next/server'

import { strapiContentApi } from '@/lib/api/strapi'

export async function GET() {
  const [footerResult, contactResult] = await Promise.all([
    strapiContentApi.getFooter(),
    strapiContentApi.getContactInfo(),
  ])

  return NextResponse.json({
    ...footerResult.data,
    email: contactResult.data.contactEmail ?? footerResult.data.email,
    phone: contactResult.data.contactPhone ?? footerResult.data.phone,
  })
}
