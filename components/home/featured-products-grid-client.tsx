'use client'

import { useEffect, useRef, useState } from 'react'

import type { Product } from '@/lib/api/contracts'
import { FeaturedProductCardClient } from '@/components/home/featured-product-card-client'

interface FeaturedProductsGridClientProps {
  products: Product[]
}

export function FeaturedProductsGridClient({
  products,
}: FeaturedProductsGridClientProps) {
  const [visibleCount, setVisibleCount] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gridLayoutClassName =
    products.length >= 3
      ? 'md:grid md:w-full md:grid-cols-2 lg:grid-cols-3'
      : products.length === 2
        ? 'md:grid md:w-full md:max-w-4xl md:grid-cols-2 md:mx-auto'
        : 'md:grid md:w-full md:max-w-sm md:grid-cols-1 md:mx-auto'

  useEffect(() => {
    setVisibleCount(0)

    const container = containerRef.current

    if (!container) {
      return
    }

    const timeoutIds: number[] = []
    let hasStarted = false
    let frameId = 0

    const runStagger = () => {
      if (hasStarted) {
        return
      }

      hasStarted = true
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)

      products.forEach((_, index) => {
        const timeoutId = window.setTimeout(() => {
          setVisibleCount((current) => Math.max(current, index + 1))
        }, 120 + index * 170)

        timeoutIds.push(timeoutId)
      })
    }

    const isGridInRevealBand = () => {
      const rect = container.getBoundingClientRect()
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight
      const revealLine = viewportHeight * 0.78
      const lowerBound = viewportHeight * 0.2

      return rect.top <= revealLine && rect.bottom >= lowerBound
    }

    const checkVisibility = () => {
      frameId = 0

      if (window.scrollY <= 24) {
        return
      }

      if (isGridInRevealBand()) {
        runStagger()
      }
    }

    const onScroll = () => {
      if (frameId) {
        return
      }

      frameId = window.requestAnimationFrame(checkVisibility)
    }

    if (window.scrollY > 24 && isGridInRevealBand()) {
      const timeoutId = window.setTimeout(() => {
        runStagger()
      }, 120)

      timeoutIds.push(timeoutId)
    } else {
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)
    }

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      timeoutIds.forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
    }
  }, [products.length])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto pb-2 md:overflow-visible md:pb-0"
    >
      <div
        className={`flex w-max snap-x snap-mandatory gap-5 px-1 items-stretch md:gap-8 md:px-0 lg:gap-10 ${gridLayoutClassName}`}
      >
        {products.map((product, index) => (
          <FeaturedProductCardClient
            key={product.id}
            product={product}
            index={index}
            isVisible={index < visibleCount}
          />
        ))}
      </div>
    </div>
  )
}
