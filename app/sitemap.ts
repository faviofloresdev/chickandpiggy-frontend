import type { MetadataRoute } from 'next'

import { env } from '@/lib/config/env'
import { strapiCatalogApi } from '@/lib/api/strapi'

const PUBLIC_ROUTES = ['/', '/shop', '/faq', '/contact', '/privacy', '/terms-and-conditions']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()
  const staticRoutes = PUBLIC_ROUTES.map((route) => ({
    url: new URL(route, env.siteUrl).toString(),
    lastModified,
    changeFrequency: (route === '/' ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
    priority: route === '/' ? 1 : route === '/shop' ? 0.9 : 0.6,
  }))
  const { data: products } = await strapiCatalogApi.listProducts()
  const productRoutes = products.map((product) => ({
    url: new URL(`/shop/${product.slug || product.id}`, env.siteUrl).toString(),
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...productRoutes]
}
