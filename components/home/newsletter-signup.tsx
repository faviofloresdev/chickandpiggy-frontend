'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface NewsletterSignupProps {
  contactEmail?: string
}

export function NewsletterSignup({ contactEmail }: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? `Request failed with status ${response.status}`)
      }

      setSubmitted(true)
      setEmail('')
    } catch (error) {
      console.error('Failed to submit newsletter signup', error)
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'We could not save your subscription right now. Please try again in a moment.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="w-full px-6 pb-16 md:px-12 md:pb-24">
      <div className="mx-auto max-w-7xl rounded-[2rem] bg-brand-75 px-6 py-12 md:px-12 md:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-brand-500 md:text-4xl">
            A little note from Chick and Piggy
          </h2>
          <p className="mt-4 text-xl font-serif text-brand-700/80 md:text-2xl">
            Get new soap arrivals, little stories, and news from our family to yours.
          </p>

          {submitted ? (
            <div className="mx-auto mt-8 max-w-xl rounded-[1.5rem] bg-white px-6 py-6 text-center">
              <p className="text-base font-semibold text-brand-500">You’re on the list!</p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Thanks for joining our little corner. We’ll be in touch with news from Chick and Piggy.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 md:flex-row"
            >
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Your email address"
                className="h-12 rounded-full border-white bg-white px-5 text-brand-800 placeholder:text-gray-400"
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 rounded-full bg-brand-400 px-6 text-white shadow-sm hover:bg-brand-450 md:min-w-40"
              >
                {isSubmitting ? 'Subscribing...' : 'Keep me in the loop'}
              </Button>
            </form>
          )}

          {submitError ? <p className="mt-3 text-sm text-red-600">{submitError}</p> : null}

          {contactEmail ? (
            <p className="mt-4 text-sm text-gray-500">
              Or write to{' '}
              <a
                href={`mailto:${contactEmail}?subject=Newsletter subscription`}
                className="font-medium text-brand-500 transition-colors hover:text-brand-700"
              >
                {contactEmail}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
