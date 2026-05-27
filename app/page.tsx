import type { Metadata } from 'next'

import { Hero } from '@/components/home/hero'
import { PromoBanner } from '@/components/home/promo-banner'
import { FeaturedProducts } from '@/components/home/featured-products'
import { NewsletterSignup } from '@/components/home/newsletter-signup'
import { bffApi } from '@/lib/api/bff'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 300

export const metadata: Metadata = buildPageMetadata({
  title: 'Handcrafted Soaps for Everyday Care',
  description:
    'Discover artisan soaps and gentle self-care essentials made with thoughtfully selected ingredients.',
  path: '/',
})

export default async function HomePage() {
  const contactInfo = await bffApi.getContactInfo()

  return (
    <>
      <Hero />
      <section className="min-h-[var(--home-section-height)] flex flex-col overflow-visible">
        <PromoBanner />
        <FeaturedProducts />
        <NewsletterSignup contactEmail={contactInfo.contactEmail} />
      </section>
    </>
  )
}
