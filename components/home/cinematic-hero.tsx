'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import type { HeroContent } from '@/lib/api/contracts'

type HeroStage = 1 | 2 | 3

const STAGE_TWO_DELAY_MS = 300
const STAGE_THREE_DELAY_MS = 1200

interface CinematicHeroProps {
  hero: HeroContent
}

interface BubbleParticle {
  id: number
  size: number
  left: number
  duration: number
  delay: number
  drift: number
  color: string
}

const BUBBLE_COLORS = ['#bee0e0', '#f7dccf', '#d4eafb', '#e8cde1', '#cabaec']

function createSeededRandom(seed: string) {
  let hash = 2166136261

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return () => {
    hash += 0x6d2b79f5
    let value = hash
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function buildBubbleParticles(seed: string, total: number) {
  const random = createSeededRandom(seed)

  return Array.from({ length: total }, (_, index) => ({
    id: index,
    size: random() * 60 + 20,
    left: random() * 100,
    duration: 6 + random() * 10,
    delay: random() * 5,
    drift: random() * 50 - 10,
    color: BUBBLE_COLORS[Math.floor(random() * BUBBLE_COLORS.length)],
  }))
}

function BubbleScene({ active, seed }: { active: boolean; seed: string }) {
  const bubbles = useMemo<BubbleParticle[]>(
    () => buildBubbleParticles(seed, 35),
    [seed],
  )

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-[2] transition-all duration-[1300ms] ease-out ${
        active ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
      }`}
    >
      {bubbles.map((bubble) => (
        <span
          key={bubble.id}
          className="hero-bubble absolute rounded-full"
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            left: `${bubble.left}%`,
            bottom: '-100px',
            animationDuration: `${bubble.duration}s`,
            animationDelay: `${bubble.delay}s`,
            ['--bubble-drift' as string]: `${bubble.drift}px`,
            ['--bubble-color' as string]: bubble.color,
          }}
        />
      ))}
    </div>
  )
}

export function CinematicHero({ hero }: CinematicHeroProps) {
  const [stage, setStage] = useState<HeroStage>(1)
  const hasSplitHeadline = Boolean(hero.accent || hero.highlight)
  const desktopImage = hero.image
  const mobileImage = hero.mobileImage || hero.image
  const hasDesktopImage = Boolean(desktopImage)
  const hasMobileImage = Boolean(mobileImage)

  useEffect(() => {
    const stageTwoTimer = window.setTimeout(() => setStage(2), STAGE_TWO_DELAY_MS)
    const stageThreeTimer = window.setTimeout(() => setStage(3), STAGE_THREE_DELAY_MS)

    return () => {
      window.clearTimeout(stageTwoTimer)
      window.clearTimeout(stageThreeTimer)
    }
  }, [])

  return (
    <section className="home-section relative isolate h-[var(--home-section-height)] overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-brand-50" />

      {hasDesktopImage ? (
        <div
          className={`pointer-events-none absolute inset-0 z-0 hidden transition-all duration-[1100ms] delay-200 ease-[cubic-bezier(0.22,1,0.36,1)] md:block ${
            stage >= 2 ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0'
          }`}
        >
          <img
            src={desktopImage}
            alt={hero.imageAlt || hero.title}
            className="h-full w-full object-cover object-center"
          />
        </div>
      ) : null}

      {hasMobileImage ? (
        <div
          className={`pointer-events-none absolute inset-0 z-0 transition-all duration-[1100ms] delay-200 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
            stage >= 2 ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0'
          }`}
        >
          <img
            src={mobileImage}
            alt={hero.imageAlt || hero.title}
            className="h-full w-full object-cover object-center"
          />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.86)_26%,rgba(255,255,255,0.58)_42%,rgba(255,255,255,0.18)_56%,rgba(255,255,255,0)_68%)]" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-start px-6 pt-8 pb-16 md:items-center md:px-12 md:py-10">
        <div className="w-full">
          <div className="relative max-w-2xl text-center md:max-w-[36rem] md:text-left">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-white/70 blur-2xl md:hidden" />
            <div className="relative z-10 py-8 md:py-16">
              <div
                className={`space-y-5 transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  stage >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}
              >
                <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1] text-balance">
                  {hasSplitHeadline ? (
                    <>
                      <span className="text-brand-500">{hero.title}</span>{' '}
                      <span className="text-brand-700">{hero.accent}</span>
                      <br />
                      <span className="text-brand-700">{hero.highlight}</span>
                    </>
                  ) : (
                    <span className="text-brand-500">{hero.title}</span>
                  )}
                </h1>
              </div>

              <p
                className={`mt-5 text-3xl md:text-5xl font-medium tracking-tight text-mint-200 font-serif text-pretty transition-all duration-[900ms] delay-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  stage >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}
              >
                {hero.subtitle}
              </p>

              <div
                className={`mt-8 flex flex-col items-center gap-4 transition-all duration-[900ms] delay-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:items-start ${
                  stage >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}
              >
                {hero.ctaHref && hero.ctaLabel ? (
                  <Link
                    href={hero.ctaHref}
                    className="inline-block rounded-full bg-brand-400 px-8 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-450"
                  >
                    {hero.ctaLabel}
                  </Link>
                ) : null}

                {hero.shippingNote ? (
                  <p className="text-base text-gray-400">
                    {hero.shippingNote}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <BubbleScene active={stage >= 3} seed={hero.id} />
    </section>
  )
}
