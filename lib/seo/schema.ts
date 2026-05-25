import type { FaqItem, FooterContent } from '@/lib/api/contracts'

import { absoluteUrl, siteMetadata } from '@/lib/seo/metadata'

export function buildOrganizationSchema(footerContent: FooterContent) {
  const sameAs = footerContent.socialLinks
    .map((link) => link.href)
    .filter((href) => /^https?:\/\//i.test(href))
  const contactPoints = [
    footerContent.phone
      ? {
          '@type': 'ContactPoint',
          telephone: footerContent.phone,
          contactType: 'customer support',
        }
      : null,
    footerContent.email
      ? {
          '@type': 'ContactPoint',
          email: footerContent.email,
          contactType: 'customer support',
        }
      : null,
  ].filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: footerContent.brandName || siteMetadata.name,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/apple-icon.png'),
    description: footerContent.description || siteMetadata.description,
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(contactPoints.length > 0 ? { contactPoint: contactPoints } : {}),
  }
}

export function buildFaqSchema(faqs: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}
