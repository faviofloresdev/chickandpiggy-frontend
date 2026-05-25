import type { Metadata } from 'next'

import { Hero } from '@/components/home/hero'
import { PromoBanner } from '@/components/home/promo-banner'
import { FeaturedProducts } from '@/components/home/featured-products'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 300

export const metadata: Metadata = buildPageMetadata({
  title: 'Handcrafted Soaps for Everyday Care',
  description:
    'Discover artisan soaps and gentle self-care essentials made with thoughtfully selected ingredients.',
  path: '/',
})

export default function HomePage() {
  return (
    <>
      <Hero />
      <section className="min-h-[var(--home-section-height)] flex flex-col overflow-visible">
        <PromoBanner />
        <FeaturedProducts />
      </section>
    </>
  )
}
