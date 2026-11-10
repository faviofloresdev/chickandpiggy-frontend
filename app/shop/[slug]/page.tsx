import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { notFound } from 'next/navigation'

import { ShopProductConfigurator } from '@/components/products/shop-product-configurator'
import { JsonLd } from '@/components/seo/json-ld'
import type { Product } from '@/lib/api/contracts'
import { strapiCatalogApi } from '@/lib/api/strapi'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { buildProductSchema } from '@/lib/seo/schema'

export const revalidate = 300

async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const { data: products } = await strapiCatalogApi.listProducts()

  return products.find((product) => product.slug === slug || product.id === slug)
}

export async function generateStaticParams() {
  const { data: products } = await strapiCatalogApi.listProducts()

  return products
    .map((product) => product.slug || product.id)
    .filter(Boolean)
    .map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    return buildPageMetadata({
      title: 'Product Not Found',
      description: 'The requested product could not be found.',
      path: `/shop/${slug}`,
      noIndex: true,
    })
  }

  return buildPageMetadata({
    title: product.metaTitle || product.name,
    description:
      product.metaDescription ||
      product.description ||
      `Shop ${product.name} from Chick & Piggy.`,
    path: `/shop/${product.slug || product.id}`,
    image: product.ogImage || product.image,
    type: 'article',
  })
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const productSchema = buildProductSchema(product)

  return (
    <>
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-12">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="transition-colors hover:text-brand-500">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/shop" className="transition-colors hover:text-brand-500">
              Shop
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900">{product.name}</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-brand-500">
            {product.name}
          </h1>
          {product.categories && product.categories.length > 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              {product.categories.map((category) => category.name).join(' · ')}
            </p>
          ) : null}
        </div>
      </div>

      <section className="mx-auto w-full max-w-7xl px-6 py-12 md:px-12">
        <JsonLd data={productSchema} />
        <ShopProductConfigurator product={product} />

        <div className="mt-6 flex justify-start">
          <Link
            href="/shop"
            className="rounded-full border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
          >
            Continue shopping
          </Link>
        </div>
      </section>
    </>
  )
}
