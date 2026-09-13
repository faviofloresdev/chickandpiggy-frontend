'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('')
    const data = new FormData(event.currentTarget)
    const response = await fetch('/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), password: data.get('password') }) })
    const payload = await response.json()
    if (!response.ok) { setError(payload.error || 'No se pudo iniciar sesión.'); setLoading(false); return }
    router.push('/admin/orders'); router.refresh()
  }
  return <form onSubmit={submit} className="space-y-5">
    <label className="block text-sm font-medium">Correo<input name="email" type="email" autoComplete="username" required className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3" /></label>
    <label className="block text-sm font-medium">Contraseña<input name="password" type="password" autoComplete="current-password" required className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3" /></label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={loading} className="w-full rounded-xl bg-brand-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? 'Accediendo…' : 'Acceder'}</button>
  </form>
}
