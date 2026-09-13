import 'server-only'

import { env } from '@/lib/config/env'
import type { AdminSession } from './auth'

export type FulfillmentStatus = 'pending_preparation' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentState = 'pending' | 'paid' | 'failed' | 'refunded'
export type OrderChange = { id: number; changeType: string; previousValue: string | null; newValue: string | null; actorName: string; actorEmail?: string; actorRole: string; note?: string; changedAt: string }
export type AdminOrder = {
  id: number; orderNumber: string; createdAt: string; updatedAt: string; currency: string; totalAmount: number;
  subtotal: number; discountAmount: number; taxAmount: number; shippingAmount: number; customerName: string;
  customerEmail: string; customerPhone?: string; shippingAddress: Record<string, string>; billingAddress?: Record<string, string>;
  shippingOption?: Record<string, unknown>; items?: Array<Record<string, unknown>>; orderItems?: Array<Record<string, unknown>>;
  paymentState: PaymentState; paymentStatus?: string; paidAt?: string; fulfillmentStatus: FulfillmentStatus;
  carrier?: string; trackingNumber?: string; shippedAt?: string; deliveredAt?: string; changeHistory?: OrderChange[];
}
export type OrderList = { data: AdminOrder[]; meta: { page: number; pageSize: number; total: number; pageCount: number } }

function adminHeaders(session: AdminSession, includeJson = false) {
  if (!env.adminInternalApiKey) throw new Error('ADMIN_INTERNAL_API_KEY is not configured')
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    'x-admin-api-key': env.adminInternalApiKey,
    'x-admin-name': encodeURIComponent(session.name),
    'x-admin-email': encodeURIComponent(session.email),
    'x-admin-role': session.role,
  }
}

async function upstream<T>(path: string, session: AdminSession, init?: RequestInit): Promise<T> {
  const response = await fetch(new URL(path, `${env.strapiUrl}/`), {
    ...init, headers: { ...adminHeaders(session, Boolean(init?.body)), ...init?.headers }, cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({ error: 'Invalid response from order service' }))
  if (!response.ok) throw new Error(payload.error || 'Order service request failed')
  return payload as T
}

export function listOrders(query: URLSearchParams, session: AdminSession) {
  return upstream<OrderList>(`api/admin/orders?${query.toString()}`, session)
}
export async function getOrder(id: string, session: AdminSession) {
  const payload = await upstream<{ data: AdminOrder }>(`api/admin/orders/${encodeURIComponent(id)}`, session)
  return payload.data
}
export async function updateOrder(id: string, data: Record<string, unknown>, session: AdminSession) {
  const payload = await upstream<{ data: AdminOrder }>(`api/admin/orders/${encodeURIComponent(id)}`, session, { method: 'PATCH', body: JSON.stringify(data) })
  return payload.data
}
