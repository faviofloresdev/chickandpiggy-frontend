import { getAdminSession } from '@/lib/admin/auth'
import { OrderDetail } from './order-detail'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  return <OrderDetail id={(await params).id} role={session?.role || 'operator'} />
}
