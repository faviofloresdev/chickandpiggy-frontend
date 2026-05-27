'use client'

import Link from 'next/link'

import type { Product } from '@/lib/api/contracts'

interface FeaturedProductCardProps {
  product: Product
  index: number
  isVisible: boolean
}

export function FeaturedProductCard({
  product,
  index,
  isVisible,
}: FeaturedProductCardProps) {
  return (
    <Link
      href={`/shop?product=${encodeURIComponent(product.slug || product.id)}#selected-product`}
      data-featured-card
      data-index={index}
      className="featured-stagger-card group flex min-w-[78vw] max-w-[22rem] snap-start flex-col rounded-[2rem] border p-4 shadow-[0_12px_30px_rgba(190,224,224,0.18)] backdrop-blur-[2px] transition-transform duration-300 hover:-translate-y-1 sm:min-w-[22rem] md:min-w-0 md:max-w-none md:p-5"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-brand-400) 16%, white)',
        borderColor: 'color-mix(in srgb, var(--color-brand-400) 52%, var(--color-brand-300))',
        opacity: isVisible ? 1 : 0,
        filter: isVisible ? 'blur(0px)' : 'blur(14px)',
        transform: isVisible
          ? 'translateY(0) scale(1)'
          : 'translateY(88px) scale(0.92)',
      }}
    >
      <div
        className="relative mb-5 aspect-[4/5] overflow-hidden rounded-[1.5rem]"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-brand-400) 34%, var(--color-brand-300))',
        }}
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transform-gpu transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
        />
      </div>
      <h3 className="text-xl font-medium tracking-tight text-brand-500 mb-2">
        {product.name}
      </h3>
      <p className="sr-only">Price: ${product.price.toFixed(2)}</p>
      {product.description ? <p className="sr-only">{product.description}</p> : null}
    </Link>
  )
}
