import type { Metadata } from 'next'

import { ContactPageClient } from '@/components/contact/contact-page-client'
import { bffApi } from '@/lib/api/bff'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 300

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Chick & Piggy',
  description:
    'Get in touch with Chick & Piggy for product questions, shipping support, and order help.',
  path: '/contact',
})

export default async function ContactPage() {
  const contactInfo = await bffApi.getContactInfo()

  return <ContactPageClient contactInfo={contactInfo} />
}
