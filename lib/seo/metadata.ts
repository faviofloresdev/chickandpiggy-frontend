import type { Metadata } from 'next'

import { env } from '@/lib/config/env'

const DEFAULT_SITE_NAME = 'Chick & Piggy'
const DEFAULT_DESCRIPTION =
  'Handcrafted soaps and artisan self-care products made with gentle ingredients for the whole family.'
const DEFAULT_OG_IMAGE_PATH = '/apple-icon.png'

function normalizePath(path: string) {
  if (!path || path === '/') {
    return '/'
  }

  return path.startsWith('/') ? path : `/${path}`
}

function trimDescription(description?: string) {
  if (!description) {
    return DEFAULT_DESCRIPTION
  }

  const normalizedDescription = description.replace(/\s+/g, ' ').trim()

  if (normalizedDescription.length <= 160) {
    return normalizedDescription
  }

  return `${normalizedDescription.slice(0, 157).trimEnd()}...`
}

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  return new URL(normalizePath(path), env.siteUrl).toString()
}

export const siteMetadata = {
  name: DEFAULT_SITE_NAME,
  description: DEFAULT_DESCRIPTION,
  ogImage: DEFAULT_OG_IMAGE_PATH,
}

interface BuildPageMetadataInput {
  title: string
  description?: string
  path?: string
  image?: string
  noIndex?: boolean
  type?: 'website' | 'article'
}

export function buildPageMetadata({
  title,
  description,
  path = '/',
  image,
  noIndex = false,
  type = 'website',
}: BuildPageMetadataInput): Metadata {
  const normalizedPath = normalizePath(path)
  const resolvedDescription = trimDescription(description)
  const resolvedImage = absoluteUrl(image ?? siteMetadata.ogImage)

  return {
    title,
    description: resolvedDescription,
    alternates: {
      canonical: normalizedPath,
    },
    robots: noIndex
      ? {
          index: false,
          follow: true,
        }
      : undefined,
    openGraph: {
      type,
      title,
      description: resolvedDescription,
      url: absoluteUrl(normalizedPath),
      siteName: siteMetadata.name,
      locale: 'en_US',
      images: [
        {
          url: resolvedImage,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: resolvedDescription,
      images: [resolvedImage],
    },
  }
}
