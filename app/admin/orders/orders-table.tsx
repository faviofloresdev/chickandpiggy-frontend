'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import type { AdminOrder, OrderList } from '@/lib/admin/orders'

export const fulfillmentLabels = { pending_preparation: 'Pendiente de preparación', preparing: 'En preparación', shipped: 'Enviada', delivered: 'Entregada', cancelled: 'Cancelada' } as const
export const paymentLabels = { pending: 'Pendiente', paid: 'Pagada', failed: 'Fallida', refunded: 'Reembolsada' } as const
const badge = { pending_preparation: 'bg-amber-100 text-amber-800', preparing: 'bg-blue-100 text-blue-800', shipped: 'bg-violet-100 text-violet-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-slate-200 text-slate-700', pending: 'bg-amber-100 text-amber-800', paid: 'bg-green-100 text-green-800', failed: 'bg-red-100 text-red-800', refunded: 'bg-fuchsia-100 text-fuchsia-800' } as const
export function StatusBadge({ value, payment = false }: { value: keyof typeof badge; payment?: boolean }) { const label = payment ? paymentLabels[value as keyof typeof paymentLabels] : fulfillmentLabels[value as keyof typeof fulfillmentLabels]; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge[value]}`}>{label}</span> }

function money(order: AdminOrder) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency || 'USD' }).format(Number(order.totalAmount || 0)) }

export function OrdersTable() {
  const [result, setResult] = useState<OrderList | null>(null)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ search: '', fulfillmentStatus: '', paymentState: '', dateFrom: '', dateTo: '', page: '1' })
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setError(''); const entries = Object.entries(filters).filter(([, value]) => value); const params = new URLSearchParams(entries)
    if (filters.dateTo) params.set('dateTo', `${filters.dateTo}T23:59:59.999Z`)
    const response = await fetch(`/api/admin/orders?${params}`); const payload = await response.json()
    if (!response.ok) { setError(payload.error || 'No se pudieron cargar las órdenes.'); return }
    setResult(payload)
  }, [filters])
  useEffect(() => { void load() }, [load])
  function submit(event: FormEvent) { event.preventDefault(); setFilters((current) => ({ ...current, search: query, page: '1' })) }
  return <div className="space-y-5">
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-6">
      <input aria-label="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Orden, nombre o email" className="rounded-lg border px-3 py-2 md:col-span-2" />
      <select aria-label="Estado de cumplimiento" value={filters.fulfillmentStatus} onChange={(e) => setFilters({ ...filters, fulfillmentStatus: e.target.value, page: '1' })} className="rounded-lg border px-3 py-2"><option value="">Todo cumplimiento</option>{Object.entries(fulfillmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select aria-label="Estado de pago" value={filters.paymentState} onChange={(e) => setFilters({ ...filters, paymentState: e.target.value, page: '1' })} className="rounded-lg border px-3 py-2"><option value="">Todo pago</option>{Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input aria-label="Desde" type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, page: '1' })} className="rounded-lg border px-3 py-2" />
      <input aria-label="Hasta" type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, page: '1' })} className="rounded-lg border px-3 py-2" />
      <button className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">Buscar</button>
      <button type="button" onClick={() => { setQuery(''); setFilters({ search: '', fulfillmentStatus: '', paymentState: '', dateFrom: '', dateTo: '', page: '1' }) }} className="rounded-lg border px-4 py-2">Limpiar</button>
    </form>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr><th className="p-4">Orden</th><th className="p-4">Fecha</th><th className="p-4">Cliente</th><th className="p-4">Cumplimiento</th><th className="p-4">Pago</th><th className="p-4 text-right">Total</th></tr></thead><tbody>{result?.data.map((order) => <tr key={order.id} className="border-t hover:bg-slate-50"><td className="p-4 font-semibold"><Link className="text-brand-700 underline-offset-4 hover:underline" href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link></td><td className="p-4">{new Date(order.createdAt).toLocaleString()}</td><td className="p-4"><strong className="block">{order.customerName}</strong><span className="text-slate-500">{order.customerEmail}</span></td><td className="p-4"><StatusBadge value={order.fulfillmentStatus} /></td><td className="p-4"><StatusBadge value={order.paymentState} payment /></td><td className="p-4 text-right font-semibold">{money(order)}</td></tr>)}</tbody></table>{result && result.data.length === 0 && <p className="p-10 text-center text-slate-500">No hay órdenes con estos filtros.</p>}</div>
    {result && <div className="flex items-center justify-between text-sm"><span>{result.meta.total} órdenes</span><div className="flex gap-2"><button disabled={result.meta.page <= 1} onClick={() => setFilters({ ...filters, page: String(result.meta.page - 1) })} className="rounded border px-3 py-2 disabled:opacity-40">Anterior</button><span className="px-2 py-2">{result.meta.page} / {Math.max(1, result.meta.pageCount)}</span><button disabled={result.meta.page >= result.meta.pageCount} onClick={() => setFilters({ ...filters, page: String(result.meta.page + 1) })} className="rounded border px-3 py-2 disabled:opacity-40">Siguiente</button></div></div>}
  </div>
}
