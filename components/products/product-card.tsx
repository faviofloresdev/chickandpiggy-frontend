'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import type { Product } from '@/lib/api/contracts'

interface ProductCardProps {
  product: Product
  showDescription?: boolean
}

export function ProductCard({
  product,
  showDescription = false,
}: ProductCardProps) {
  const productHref = `/shop?product=${encodeURIComponent(product.slug || product.id)}#selected-product`
  const optionGroups = useMemo(
    () => (product.productOptions ?? []).filter((option) => option.values.length > 0),
    [product.productOptions]
  )

  return (
    <div className="group flex flex-col">
      <Link
        href={productHref}
        className="mb-4 block aspect-square overflow-hidden rounded-2xl bg-gray-50 relative"
      >
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>
      <div className="flex items-start gap-2">
        <div>
          <Link href={productHref}>
            <h3 className="mb-1 text-lg font-medium tracking-tight text-gray-900 transition-colors group-hover:text-brand-500">
              {product.name}
            </h3>
          </Link>
          <span className="font-semibold text-brand-500">${product.price.toFixed(2)}</span>
          {optionGroups.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2 text-[11px] text-gray-500">
              {optionGroups.slice(0, 3).map((option) => (
                <div
                  key={`${product.id}-${option.id}`}
                  className="flex items-center gap-2"
                >
                  <span className="min-w-0 text-[10px] uppercase tracking-[0.18em] text-gray-400">
                    {option.label}
                  </span>
                  {option.type === 'color' ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {option.values.slice(0, 5).map((value) => (
                        <span
                          key={`${product.id}-${option.type}-${value.value}`}
                          className="h-2.5 w-2.5 rounded-full border border-black/10"
                          style={{ backgroundColor: value.hexColor ?? value.value }}
                          title={value.label}
                          aria-label={value.label}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-wrap gap-1">
                      {option.values.slice(0, 3).map((value) => (
                        <span
                          key={`${product.id}-${option.type}-${value.value}`}
                          className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-gray-500"
                        >
                          {value.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
          {showDescription && (
            <p className="mt-2 text-base leading-relaxed text-gray-500">
              {product.description ?? 'Handcrafted soap made with natural ingredients for skin care.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
