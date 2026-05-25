import type { MetadataRoute } from 'next'

import { env } from '@/lib/config/env'

const PUBLIC_ROUTES = ['/', '/shop', '/faq', '/contact', '/privacy', '/terms-and-conditions']

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return PUBLIC_ROUTES.map((route) => ({
    url: new URL(route, env.siteUrl).toString(),
    lastModified,
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route === '/shop' ? 0.9 : 0.6,
  }))
}
