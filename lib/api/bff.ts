import 'server-only'

import type {
  Category,
  ContactInfo,
  FaqItem,
  FooterContent,
  FeaturedProductsContent,
  HeaderContent,
  HeroContent,
  PromoBannerContent,
  Product,
} from '@/lib/api/contracts'
import { env } from '@/lib/config/env'
import { bffEndpoints } from '@/lib/api/endpoints'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(new URL(path, env.siteUrl), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Internal API request failed for ${path}: ${response.status}`)
  }

  return (await response.json()) as T
}

export const bffApi = {
  getHeader() {
    return apiFetch<HeaderContent>(bffEndpoints.header, {
      next: { revalidate: 300 },
    })
  },

  getFooter() {
    return apiFetch<FooterContent>(bffEndpoints.footer, {
      next: { revalidate: 300 },
    })
  },

  getContactInfo() {
    return apiFetch<ContactInfo>(bffEndpoints.contact, {
      next: { revalidate: 300 },
    })
  },

  getLandingHero() {
    return apiFetch<HeroContent>(bffEndpoints.landing, {
      next: { revalidate: 300 },
    })
  },

  getPromoBanner() {
    return apiFetch<PromoBannerContent>(bffEndpoints.promoBanner, {
      next: { revalidate: 60 },
    })
  },

  getFeaturedProductContent() {
    return apiFetch<FeaturedProductsContent>(bffEndpoints.featuredProduct, {
      next: { revalidate: 300 },
    })
  },

  getProducts(limit?: number) {
    const search = typeof limit === 'number' ? `?limit=${limit}` : ''
    return apiFetch<Product[]>(`${bffEndpoints.products}${search}`, {
      next: { revalidate: 60 },
    })
  },

  getFeaturedProducts(limit?: number) {
    const search = typeof limit === 'number' ? `?limit=${limit}` : ''
    return apiFetch<Product[]>(`${bffEndpoints.featuredProducts}${search}`, {
      next: { revalidate: 300 },
    })
  },

  getCategories() {
    return apiFetch<Category[]>(bffEndpoints.categories, {
      next: { revalidate: 60 },
    })
  },

  getFaqs() {
    return apiFetch<FaqItem[]>(bffEndpoints.faqs, {
      next: { revalidate: 60 },
    })
  },
}
