import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin/auth'
import { listOrders } from '@/lib/admin/orders'

const allowed = new Set(['search', 'fulfillmentStatus', 'paymentState', 'dateFrom', 'dateTo', 'page', 'pageSize'])

export async function GET(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  try {
    const incoming = new URL(request.url).searchParams
    const query = new URLSearchParams()
    for (const [key, value] of incoming) if (allowed.has(key) && value) query.set(key, value.slice(0, 200))
    return NextResponse.json(await listOrders(query, session))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron cargar las órdenes.' }, { status: 502 })
  }
}
