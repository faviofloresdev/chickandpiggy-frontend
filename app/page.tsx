import type { Metadata } from 'next'

import { Hero } from '@/components/home/hero'
import { PromoBanner } from '@/components/home/promo-banner'
import { FeaturedProducts } from '@/components/home/featured-products'
import { NewsletterSignup } from '@/components/home/newsletter-signup'
import { strapiContentApi } from '@/lib/api/strapi'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const [{ data: hero }, { data: global }] = await Promise.all([
    strapiContentApi.getLandingHero(),
    strapiContentApi.getGlobal(),
  ])
  const cmsTitle = hero.metaTitle?.trim() || global.defaultSeo?.metaTitle?.trim()
  const metadata = buildPageMetadata({
    title: cmsTitle || 'Handcrafted Soaps for Kids',
    description:
      hero.metaDescription?.trim() || global.defaultSeo?.metaDescription?.trim() ||
      'Discover handcrafted soaps for kids and thoughtful gift sets, inspired by our little ones and made with love for yours.',
    image: hero.ogImage || global.defaultSeo?.shareImage,
    path: '/',
  })

  return {
    ...metadata,
    // CMS titles are complete; keep the layout from adding the brand again.
    title: cmsTitle ? { absolute: cmsTitle } : metadata.title,
  }
}

export default async function HomePage() {
  const contactInfo = await strapiContentApi
    .getContactInfo()
    .then((result) => result.data)

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
