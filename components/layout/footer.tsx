import Link from 'next/link'
import { Facebook, Globe, Instagram, Linkedin, Twitter } from 'lucide-react'
import type { FooterContent } from '@/lib/api/contracts'

interface FooterProps {
  content: FooterContent
}

function getSocialIcon(platform: string) {
  switch (platform.trim().toLowerCase()) {
    case 'instagram':
      return Instagram
    case 'linkedin':
      return Linkedin
    case 'twitter':
    case 'x':
      return Twitter
    case 'facebook':
      return Facebook
    default:
      return Globe
  }
}

function isInternalHref(href: string) {
  return href.startsWith('/')
}

export function Footer({ content }: FooterProps) {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
        <div className="md:col-span-5 space-y-6">
          <h4 className="text-4xl font-semibold tracking-tight text-brand-500 font-serif">
            {content.brandName}
          </h4>
          <p className="text-base text-gray-500 max-w-sm">
            {content.description}
          </p>
          <div className="space-y-2">
            {content.email ? (
              <a
                href={`mailto:${content.email}`}
                className="block text-base text-gray-500 hover:text-gray-900 transition-colors"
              >
                {content.email}
              </a>
            ) : null}
            {content.phone ? (
              <a
                href={`tel:${content.phone.replace(/\s+/g, '')}`}
                className="block text-base text-gray-500 hover:text-gray-900 transition-colors"
              >
                {content.phone}
              </a>
            ) : null}
          </div>
          <div className="flex gap-4 text-gray-400">
            {content.socialLinks.map((socialLink) => {
              const SocialIcon = getSocialIcon(socialLink.platform)

              return (
                <a
                  key={socialLink.id}
                  href={socialLink.href}
                  className="hover:text-gray-600 transition-colors"
                  aria-label={socialLink.platform}
                  target={socialLink.href.startsWith('http') ? '_blank' : undefined}
                  rel={socialLink.href.startsWith('http') ? 'noreferrer' : undefined}
                >
                  <SocialIcon strokeWidth={1.5} className="w-6 h-6" />
                </a>
              )
            })}
          </div>
        </div>

        <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8">
          {content.linkGroups.map((group) => (
            <div key={group.id} className="space-y-4">
              <h5 className="text-base font-semibold tracking-tight text-brand-500">
                {group.title}
              </h5>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.id}>
                    {isInternalHref(link.href) ? (
                      <Link
                        href={link.href}
                        className="text-base text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-base text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}

              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-brand-400 py-5 px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 text-center md:flex-row md:gap-3">
          <p className="text-white text-base font-medium">{content.copyrightText}</p>
          {content.bottomLinks.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-3 text-white">
              {content.bottomLinks.map((link) =>
                isInternalHref(link.href) ? (
                  <Link
                    key={link.id}
                    href={link.href}
                    className="text-base font-medium transition-opacity hover:opacity-80"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.id}
                    href={link.href}
                    className="text-base font-medium transition-opacity hover:opacity-80"
                  >
                    {link.label}
                  </a>
                )
              )}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
