import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/auth'
import { LoginForm } from './login-form'

export const metadata = { title: 'Acceso administrativo', robots: { index: false, follow: false } }
export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect('/admin/orders')
  return <section className="mx-auto min-h-[70vh] max-w-md px-4 py-20"><div className="rounded-3xl border border-brand-200 bg-white p-8 shadow-xl"><p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Panel privado</p><h1 className="mt-2 text-3xl font-bold">Gestión de órdenes</h1><p className="mb-8 mt-2 text-gray-500">Acceso exclusivo para administradores y operadores.</p><LoginForm /></div></section>
}
