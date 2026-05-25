const strapiUrl = process.env.STRAPI_URL ?? 'http://localhost:1337'
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: strapiAssetPattern ? [strapiAssetPattern] : [],
  },
}

export default nextConfig
