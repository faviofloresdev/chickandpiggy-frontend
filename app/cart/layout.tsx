import type { Metadata } from 'next'

import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Your Cart',
  description: 'Review the products in your Chick & Piggy cart before checkout.',
  path: '/cart',
  noIndex: true,
})

export default function CartLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
