import type { MetadataRoute } from 'next'

import { env } from '@/lib/config/env'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/cart', '/checkout', '/thank-you'],
      },
    ],
    sitemap: `${env.siteUrl}/sitemap.xml`,
  }
}
