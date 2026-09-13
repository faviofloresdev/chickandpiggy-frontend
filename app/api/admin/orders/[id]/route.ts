import { NextResponse } from 'next/server'
import { z } from 'zod'
import { assertSameOrigin, getAdminSession } from '@/lib/admin/auth'
import { getOrder, updateOrder } from '@/lib/admin/orders'

const updateSchema = z.object({
  fulfillmentStatus: z.enum(['pending_preparation', 'preparing', 'shipped', 'delivered', 'cancelled']).optional(),
  carrier: z.string().trim().max(100).nullable().optional(),
  trackingNumber: z.string().trim().max(200).nullable().optional(),
  shippedAt: z.string().datetime().nullable().optional(),
  deliveredAt: z.string().datetime().nullable().optional(),
  note: z.string().trim().max(1000).optional(),
}).strict()

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  try { return NextResponse.json({ data: await getOrder((await context.params).id, session) }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Orden no encontrada.' }, { status: 502 }) }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  try { assertSameOrigin(request) } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 403 }) }
  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos de actualización inválidos.' }, { status: 400 })
  try { return NextResponse.json({ data: await updateOrder((await context.params).id, parsed.data, session) }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo actualizar la orden.' }, { status: 409 }) }
}
