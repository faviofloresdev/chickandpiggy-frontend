'use client'

import { useState } from 'react'
import { Mail, MessageCircle, Phone, Send } from 'lucide-react'

import type { ContactInfo } from '@/lib/api/contracts'

function toPhoneHref(value: string) {
  return `tel:${value.replace(/[^\d+]/g, '')}`
}

function toWhatsappHref(value: string) {
  return `https://wa.me/${value.replace(/\D/g, '')}`
}

export function ContactPageClient({
  contactInfo,
}: {
  contactInfo: ContactInfo
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)

    const form = event.currentTarget
    const formData = new FormData(form)
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const message = String(formData.get('message') ?? '').trim()

    try {
      const response = await fetch('/api/content/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          data: {
            name,
            email,
            message,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      form.reset()
      setSubmitted(true)
    } catch (error) {
      console.error('Failed to submit contact form', error)
      setSubmitError('We could not send your message right now. Please try again in a moment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-brand-500 mb-4">
          Contact Us
        </h1>
        <p className="text-xl md:text-2xl text-gray-500 font-serif">
          We are here to help. Write to us and we will get back to you soon.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-16">
        <div className="flex-1 space-y-12">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-brand-700 mb-8">
              Contact Information
            </h3>
            <div className="space-y-6">
              {contactInfo.contactEmail ? (
                <div className="flex items-start gap-4 text-gray-600">
                  <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-500 shrink-0 shadow-sm">
                    <Mail strokeWidth={1.5} />
                  </div>
                  <div className="pt-1">
                    <p className="font-medium text-gray-800 text-lg">Email</p>
                    <a
                      href={`mailto:${contactInfo.contactEmail}`}
                      className="text-gray-500 hover:text-brand-500 transition-colors"
                    >
                      {contactInfo.contactEmail}
                    </a>
                  </div>
                </div>
              ) : null}

              {contactInfo.contactPhone ? (
                <div className="flex items-start gap-4 text-gray-600">
                  <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-500 shrink-0 shadow-sm">
                    <Phone strokeWidth={1.5} />
                  </div>
                  <div className="pt-1">
                    <p className="font-medium text-gray-800 text-lg">Phone</p>
                    <a
                      href={toPhoneHref(contactInfo.contactPhone)}
                      className="text-gray-500 hover:text-brand-500 transition-colors"
                    >
                      {contactInfo.contactPhone}
                    </a>
                  </div>
                </div>
              ) : null}

              {contactInfo.contactWhatsapp ? (
                <div className="flex items-start gap-4 text-gray-600">
                  <div className="w-12 h-12 bg-success-50 rounded-full flex items-center justify-center text-success-500 shrink-0 shadow-sm">
                    <MessageCircle strokeWidth={1.5} />
                  </div>
                  <div className="pt-1">
                    <p className="font-medium text-gray-800 text-lg">WhatsApp</p>
                    <a
                      href={toWhatsappHref(contactInfo.contactWhatsapp)}
                      className="text-gray-500 hover:text-brand-500 transition-colors"
                    >
                      {contactInfo.contactWhatsapp}
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex-1 w-full max-w-lg mx-auto md:max-w-none">
          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.05)] border border-gray-50">
            <h3 className="text-2xl font-semibold tracking-tight text-brand-700 mb-8">
              Send us a message
            </h3>

            {submitted ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-success-50 rounded-full mb-4">
                  <Send className="text-success-500 w-8 h-8" />
                </div>
                <h4 className="text-xl font-semibold text-gray-800 mb-2">
                  Message sent!
                </h4>
                <p className="text-gray-500">
                  We will get back to you as soon as possible.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full name
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-shadow bg-gray-50/50 text-gray-800"
                    placeholder="e.g. John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-shadow bg-gray-50/50 text-gray-800"
                    placeholder="john@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    name="message"
                    rows={4}
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-shadow resize-none bg-gray-50/50 text-gray-800"
                    placeholder="How can we help you?"
                  />
                </div>
                {submitError ? (
                  <p className="text-sm text-red-600">{submitError}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-400 hover:bg-brand-450 disabled:opacity-70 disabled:cursor-not-allowed transition-colors text-white font-medium text-base px-8 py-4 rounded-full shadow-sm mt-4"
                >
                  {isSubmitting ? 'Sending...' : 'Send message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
