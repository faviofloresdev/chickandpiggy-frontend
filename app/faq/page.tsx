import type { Metadata } from 'next'
import { ChevronDown } from 'lucide-react'

import { JsonLd } from '@/components/seo/json-ld'
import { strapiContentApi } from '@/lib/api/strapi'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { buildFaqSchema } from '@/lib/seo/schema'

export const revalidate = 300

export const metadata: Metadata = buildPageMetadata({
  title: 'Frequently Asked Questions',
  description:
    'Find quick answers about products, ingredients, shipping, and ordering from Chick & Piggy.',
  path: '/faq',
})

export default async function FaqPage() {
  const { data: faqs } = await strapiContentApi.listFaqs()
  const faqSchema = buildFaqSchema(faqs)

  return (
    <section className="max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
      <JsonLd data={faqSchema} />
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-brand-500 mb-12 text-center">
        Frequently Asked Questions
      </h1>
      <div className="space-y-6">
        {faqs.map((faq) => (
          <details key={faq.id} className="group border-b border-gray-200 pb-6">
            <summary className="flex justify-between items-center font-medium cursor-pointer list-none text-xl text-gray-800 [&::-webkit-details-marker]:hidden">
              <span>{faq.question}</span>
              <span className="transition group-open:rotate-180">
                <ChevronDown className="w-6 h-6 text-brand-500" />
              </span>
            </summary>
            <p className="text-gray-500 mt-4 leading-relaxed">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
