import type { Metadata } from 'next'

import { RichText } from '@/components/content/rich-text'
import { bffApi } from '@/lib/api/bff'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 300

export const metadata: Metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description:
    'Read the Chick & Piggy privacy policy to understand how we collect, use, and protect your information.',
  path: '/privacy',
})

export default async function PrivacyPage() {
  const footerContent = await bffApi.getFooter()

  return (
    <section className="mx-auto max-w-4xl px-6 py-16 md:px-12 md:py-24">
      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_0_40px_rgba(0,0,0,0.04)] md:p-12">
        <RichText content={footerContent.privacy} />
      </div>
    </section>
  )
}
