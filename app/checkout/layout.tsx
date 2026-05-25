import type { Metadata } from 'next'

import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Checkout',
  description: 'Secure checkout for Chick & Piggy orders.',
  path: '/checkout',
  noIndex: true,
})

export default function CheckoutLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
