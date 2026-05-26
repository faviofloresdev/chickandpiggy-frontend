import type { Metadata, Viewport } from 'next'
import { Suspense, cache } from 'react'
import { Fredoka } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { GoogleAnalytics } from '@/components/analytics/google-analytics'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { JsonLd } from '@/components/seo/json-ld'
import { Toaster } from '@/components/ui/toaster'
import { env } from '@/lib/config/env'
import { bffApi } from '@/lib/api/bff'
import { strapiContentApi } from '@/lib/api/strapi'
import { buildOrganizationSchema } from '@/lib/seo/schema'
import { BRAND_COLORS } from '@/lib/theme/brand'
import './globals.css'

const fredoka = Fredoka({ 
  subsets: ['latin'],
  variable: '--font-fredoka',
})

const getGlobalContent = cache(async () => {
  const { data } = await strapiContentApi.getGlobal()
  return data
})

export async function generateMetadata(): Promise<Metadata> {
  const globalContent = await getGlobalContent()
  const siteName = globalContent.siteName || 'Chick & Piggy'
  const siteDescription =
    globalContent.siteDescription ||
    'Handcrafted soaps made with love to care for your little ones skin. Natural and safe ingredients.'

  return {
    metadataBase: new URL(env.siteUrl),
    applicationName: siteName,
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    keywords: ['handcrafted soaps', 'soaps for kids', 'sensitive skin', 'natural soaps'],
    openGraph: {
      type: 'website',
      siteName,
      title: siteName,
      description: siteDescription,
      url: env.siteUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: siteName,
      description: siteDescription,
    },
    icons: globalContent.faviconUrl
      ? {
          icon: [{ url: globalContent.faviconUrl }],
        }
      : {
          icon: [
            {
              url: '/icon-light-32x32.png',
              media: '(prefers-color-scheme: light)',
            },
            {
              url: '/icon-dark-32x32.png',
              media: '(prefers-color-scheme: dark)',
            },
            {
              url: '/icon.svg',
              type: 'image/svg+xml',
            },
          ],
          apple: '/apple-icon.png',
        },
  }
}

export const viewport: Viewport = {
  themeColor: BRAND_COLORS.brand400,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [headerContent, footerContent] = await Promise.all([
    strapiContentApi.getHeader().then((result) => result.data),
    bffApi.getFooter(),
  ])
  const organizationSchema = buildOrganizationSchema(footerContent)

  return (
    <html lang="en" className="bg-background">
      <body className={`${fredoka.variable} font-sans antialiased text-gray-800`}>
        <Header content={headerContent} />
        <main>{children}</main>
        <Footer content={footerContent} />
        <JsonLd data={organizationSchema} />
        <Toaster />
        <Suspense fallback={null}>
          <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ''} />
        </Suspense>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
