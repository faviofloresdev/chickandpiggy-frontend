'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, ShoppingCart, X } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart-store'
import type { HeaderContent } from '@/lib/api/contracts'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
]

interface HeaderProps {
  content?: HeaderContent
}

export function Header({ content }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const itemCount = useCartStore((state) => state.getItemCount())

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return (
    <header className="sticky top-0 z-50 flex h-[var(--header-height)] w-full max-w-full items-center justify-between overflow-visible bg-brand-400 px-4 sm:px-6 md:px-12">
      <Link
        href="/"
        className="relative flex h-16 w-16 shrink-0 items-center justify-center md:h-20 md:w-20"
      >
        {content?.logoUrl ? (
          <div className="absolute left-0 top-1/2 h-16 w-16 -translate-y-[50%] overflow-hidden rounded-full bg-white shadow-lg md:h-20 md:w-20">
            <img
              src={content.logoUrl}
              alt={content.logoAlt || 'Logo'}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="absolute left-0 top-1/2 flex h-16 w-16 -translate-y-[35%] items-center justify-center rounded-full bg-white text-2xl font-semibold tracking-tight text-brand-400 shadow-lg font-serif md:h-20 md:w-20">
            C&P
          </div>
        )}
      </Link>

      <nav className="hidden md:flex gap-8 text-white font-medium text-base items-center">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="hover:opacity-80 transition-opacity"
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/cart"
          className="hover:opacity-80 transition-opacity flex items-center gap-1.5 ml-4"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="bg-white text-brand-400 text-[10px] leading-none font-bold px-1.5 py-1 rounded-full min-w-[20px] text-center">
            {isHydrated ? itemCount : 0}
          </span>
        </Link>
      </nav>

      <div className="flex items-center gap-2 md:hidden">
        <Link
          href="/cart"
          className="flex min-h-11 items-center gap-1.5 rounded-full px-2 text-white transition-opacity hover:opacity-80"
          aria-label={`Cart with ${isHydrated ? itemCount : 0} items`}
        >
          <ShoppingCart className="h-7 w-7" strokeWidth={1.75} />
          <span className="min-w-6 rounded-full bg-white px-1.5 py-1 text-center text-xs font-bold leading-none text-brand-400">
            {isHydrated ? itemCount : 0}
          </span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
        >
          {mobileMenuOpen ? (
            <X className="h-7 w-7" strokeWidth={1.75} />
          ) : (
            <Menu className="h-7 w-7" strokeWidth={1.75} />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="fixed inset-x-0 top-[var(--header-height)] max-w-[100vw] border-t border-white/20 bg-brand-400 shadow-lg md:hidden"
        >
          <nav className="flex flex-col py-4 px-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-white font-medium py-3 border-b border-white/20 hover:opacity-80 transition-opacity"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
