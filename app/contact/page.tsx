import type { Metadata } from 'next'

import { ContactPageClient } from '@/components/contact/contact-page-client'
import { strapiContentApi } from '@/lib/api/strapi'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 300

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact & Order Help',
  description:
    'A little question? We are here to help. Contact Chick and Piggy about our handcrafted soaps, your order, shipping, or a special gift for your little one.',
  path: '/contact',
})

export default async function ContactPage() {
  const contactInfo = await strapiContentApi
    .getContactInfo()
    .then((result) => result.data)

  return <ContactPageClient contactInfo={contactInfo} />
}
