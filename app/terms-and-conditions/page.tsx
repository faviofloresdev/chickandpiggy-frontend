import type { Metadata } from 'next'

import { RichText } from '@/components/content/rich-text'
import { strapiContentApi } from '@/lib/api/strapi'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 300

export const metadata: Metadata = buildPageMetadata({
  title: 'Terms and Conditions',
  description:
    'Review the Chick & Piggy terms and conditions for purchases, shipping, and website use.',
  path: '/terms-and-conditions',
})

export default async function TermsAndConditionsPage() {
  const footerContent = await strapiContentApi.getFooter().then((result) => result.data)

  return (
    <section className="mx-auto max-w-4xl px-6 py-16 md:px-12 md:py-24">
      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_0_40px_rgba(0,0,0,0.04)] md:p-12">
        <RichText content={footerContent.termConditions} />
      </div>
    </section>
  )
}
