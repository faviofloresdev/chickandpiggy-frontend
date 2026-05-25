import { bffApi } from '@/lib/api/bff'

export async function PromoBanner() {
  const promoBanner = await bffApi.getPromoBanner()
  const promoTitle = typeof promoBanner.promoTitle === 'string' ? promoBanner.promoTitle.trim() : ''

  if (!promoBanner.promoActive || !promoTitle) {
    return null
  }

  return (
    <section className="bg-brand-100 w-full min-h-20 md:min-h-24 px-6 md:px-12 flex items-center justify-center text-center shrink-0">
      <p className="w-full max-w-6xl text-brand-700 text-2xl md:text-4xl font-medium tracking-tight font-serif leading-tight">
        {promoTitle}
      </p>
    </section>
  )
}
