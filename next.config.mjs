const strapiUrl = process.env.STRAPI_URL ?? 'http://localhost:1337'
const isDevelopment = process.env.NODE_ENV !== 'production'
const strapiOrigin = (() => {
  try {
    return new URL(strapiUrl).origin
  } catch {
    return null
  }
})()
const strapiAssetPattern = (() => {
  try {
    const { protocol, hostname, port } = new URL(strapiUrl)

    return {
      protocol: protocol.replace(':', ''),
      hostname,
      port,
      pathname: '/uploads/**',
    }
  } catch {
    return null
  }
})()

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''} https://js.stripe.com https://maps.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: https:${strapiOrigin ? ` ${strapiOrigin}` : ''}`,
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://api.stripe.com https://maps.googleapis.com https://maps.gstatic.com https://places.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://vitals.vercel-insights.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "form-action 'self' https://js.stripe.com https://hooks.stripe.com",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), geolocation=(), microphone=()',
  },
  ...(isDevelopment
    ? []
    : [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        },
      ]),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: strapiAssetPattern ? [strapiAssetPattern] : [],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
