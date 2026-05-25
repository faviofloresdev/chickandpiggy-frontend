import Link from 'next/link'

import { FeaturedProductsGridClient } from '@/components/home/featured-products-grid-client'
import { strapiCatalogApi, strapiContentApi } from '@/lib/api/strapi'

interface FeaturedProductsProps {
  showTitle?: boolean
  limit?: number
}

export async function FeaturedProducts({
  showTitle = true,
  limit,
}: FeaturedProductsProps) {
  const featuredContent = await strapiContentApi
    .getFeaturedProductsContent()
    .then((result) => result.data)
  const resolvedLimit = limit ?? featuredContent.featuredProductLimit
  const displayProducts = await strapiCatalogApi
    .listFeaturedProducts({ limit: resolvedLimit })
    .then((result) => result.data)

  if (displayProducts.length === 0) {
    return (
      <section className="max-w-7xl mx-auto w-full px-6 md:px-12 pt-10 pb-8 md:pt-12 md:pb-10 flex flex-col justify-start items-center gap-6 md:gap-8 overflow-visible">
        {showTitle && featuredContent.featuredProductTitle ? (
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-brand-500 text-center">
            {featuredContent.featuredProductTitle}
          </h2>
        ) : null}
        <p className="text-base md:text-lg text-gray-500 text-center">
          No hay productos exclusivos disponibles en este momento.
        </p>
      </section>
    )
  }

  return (
    <section className="max-w-7xl mx-auto w-full px-6 md:px-12 pt-10 pb-8 md:pt-12 md:pb-10 flex flex-col justify-start items-center gap-8 md:gap-10 overflow-visible">
      {showTitle && (
        <div className="flex flex-col items-center">
          {featuredContent.featuredProductTitle ? (
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-brand-500 mb-8 text-center">
              {featuredContent.featuredProductTitle}
            </h2>
          ) : null}
          {featuredContent.featuredProductTopButtonLabel &&
          featuredContent.featuredProductTopButtonHref ? (
            <Link
              href={featuredContent.featuredProductTopButtonHref}
              className="bg-brand-400 hover:bg-brand-450 transition-colors text-white font-medium text-base px-8 py-3 rounded-full shadow-sm"
            >
              {featuredContent.featuredProductTopButtonLabel}
            </Link>
          ) : null}
        </div>
      )}

      <FeaturedProductsGridClient products={displayProducts} />

      {featuredContent.featuredProductBottomButtonLabel &&
      featuredContent.featuredProductBottomButtonHref ? (
        <Link
          href={featuredContent.featuredProductBottomButtonHref}
          className="bg-brand-400 hover:bg-brand-450 transition-colors text-white font-medium text-base px-10 py-4 rounded-full shadow-sm"
        >
          {featuredContent.featuredProductBottomButtonLabel}
        </Link>
      ) : null}
    </section>
  )
}
