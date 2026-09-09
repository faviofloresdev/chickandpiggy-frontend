const CHECKOUT_NEWSLETTER_PREFERENCE_KEY = 'chick-piggy-checkout-newsletter'

interface CheckoutNewsletterPreference {
  email: string
}

export function saveCheckoutNewsletterPreference(email: string) {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    clearCheckoutNewsletterPreference()
    return
  }

  try {
    window.sessionStorage.setItem(
      CHECKOUT_NEWSLETTER_PREFERENCE_KEY,
      JSON.stringify({ email: normalizedEmail } satisfies CheckoutNewsletterPreference),
    )
  } catch {
    // Newsletter storage must never block checkout payment.
  }
}

export function readCheckoutNewsletterPreference(): CheckoutNewsletterPreference | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedValue = window.sessionStorage.getItem(CHECKOUT_NEWSLETTER_PREFERENCE_KEY)

    if (!storedValue) {
      return null
    }

    const parsedValue = JSON.parse(storedValue) as Partial<CheckoutNewsletterPreference>
    const email = typeof parsedValue.email === 'string' ? parsedValue.email.trim() : ''

    return email ? { email } : null
  } catch {
    clearCheckoutNewsletterPreference()
    return null
  }
}

export function clearCheckoutNewsletterPreference() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.removeItem(CHECKOUT_NEWSLETTER_PREFERENCE_KEY)
  } catch {
    // Newsletter storage must never block checkout payment.
  }
}
