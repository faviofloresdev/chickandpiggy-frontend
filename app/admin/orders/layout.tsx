import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/auth'
import { AdminShell } from './admin-shell'

export const metadata = { title: 'Órdenes', robots: { index: false, follow: false } }
export default async function OrdersLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return <AdminShell name={session.name} role={session.role}>{children}</AdminShell>
}
