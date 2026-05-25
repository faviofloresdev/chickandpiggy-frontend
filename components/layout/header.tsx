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
    <header className="bg-brand-400 w-full h-[var(--header-height)] px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 overflow-visible">
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

      <div className="md:hidden flex items-center gap-5">
        <Link
          href="/cart"
          className="text-white hover:opacity-80 transition-opacity flex items-center gap-1.5"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="bg-white text-brand-400 text-[10px] leading-none font-bold px-1.5 py-1 rounded-full min-w-[20px] text-center">
            {isHydrated ? itemCount : 0}
          </span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-white hover:opacity-80 transition-opacity"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" strokeWidth={1.5} />
          ) : (
            <Menu className="w-6 h-6" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-brand-400 md:hidden">
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
