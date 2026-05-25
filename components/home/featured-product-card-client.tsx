'use client'

import type { Product } from '@/lib/api/contracts'
import { FeaturedProductCard } from '@/components/home/featured-product-card'

interface FeaturedProductCardClientProps {
  product: Product
  index: number
  isVisible: boolean
}

export function FeaturedProductCardClient({
  product,
  index,
  isVisible,
}: FeaturedProductCardClientProps) {
  return <FeaturedProductCard product={product} index={index} isVisible={isVisible} />
}
