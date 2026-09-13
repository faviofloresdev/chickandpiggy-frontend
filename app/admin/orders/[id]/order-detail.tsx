'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Box, Hash, Layers3 } from 'lucide-react'
import type { AdminOrder, FulfillmentStatus, OrderChange } from '@/lib/admin/orders'
import { fulfillmentLabels, paymentLabels, StatusBadge } from '../orders-table'

type OrderItem = Record<string, unknown>
type SelectedOption = {
  optionName?: string
  label?: string
  value?: string
}

function money(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value || 0))
}

function displayText(value: unknown, fallback = '—') {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
}

function itemSnapshot(item: OrderItem) {
  return (item.productSnapshot ?? item.product ?? {}) as Record<string, unknown>
}

function itemName(item: OrderItem) {
  const snapshot = itemSnapshot(item)
  return displayText(item.title ?? item.name ?? snapshot.name ?? snapshot.title, 'Producto')
}

function itemSku(item: OrderItem) {
  const snapshot = itemSnapshot(item)
  return displayText(item.sku ?? snapshot.sku, '')
}

function itemVariantId(item: OrderItem) {
  const snapshot = itemSnapshot(item)
  return displayText(item.variantId ?? snapshot.variantId, '')
}

function itemOptions(item: OrderItem): SelectedOption[] {
  const snapshot = itemSnapshot(item)
  const options = item.selectedOptions ?? snapshot.selectedOptions
  return Array.isArray(options) ? (options as SelectedOption[]) : []
}

function itemLineTotal(item: OrderItem) {
  if (item.lineTotal !== undefined) return Number(item.lineTotal) / 100
  return Number(item.subtotal ?? 0)
}

function itemUnitPrice(item: OrderItem) {
  if (item.lineTotal !== undefined) return Number(item.unitPrice ?? 0) / 100
  return Number(item.unitPrice ?? 0)
}

function optionLabel(option: SelectedOption) {
  const label = option.label || option.value || 'Opción'
  return option.optionName ? `${option.optionName}: ${label}` : label
}

function Address({ value }: { value?: Record<string, string> }) {
  if (!value) return <p>—</p>
  const cityLine = [value.city, value.state, value.postalCode].filter(Boolean).join(', ')
  return (
    <address className="not-italic text-slate-600">
      {[value.addressLine1, value.addressLine2, cityLine, value.country]
        .filter(Boolean)
        .map((line) => <div key={line}>{line}</div>)}
    </address>
  )
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  stripe: 'Stripe',
}

function translatedValue(change: OrderChange, value: string | null) {
  if (!value) return 'Sin asignar'
  if (change.changeType === 'fulfillment' && value in fulfillmentLabels) {
    return fulfillmentLabels[value as keyof typeof fulfillmentLabels]
  }
  if (change.changeType === 'payment' && value in paymentLabels) {
    return paymentLabels[value as keyof typeof paymentLabels]
  }
  return value
}

function shippingValue(value: string | null) {
  try {
    return JSON.parse(value || '{}') as { carrier?: string | null; trackingNumber?: string | null }
  } catch {
    return {}
  }
}

function isRedundantChange(change: OrderChange) {
  if (change.changeType !== 'shipping') return false
  const previous = shippingValue(change.previousValue)
  const next = shippingValue(change.newValue)
  return previous.carrier === next.carrier && previous.trackingNumber === next.trackingNumber
}

function HistoryEntry({ change }: { change: OrderChange }) {
  const role = roleLabels[change.actorRole] || change.actorRole
  const note = change.note === 'Synchronized from Stripe'
    ? 'Sincronizado automáticamente con Stripe.'
    : change.note

  if (change.changeType === 'shipping') {
    const previous = shippingValue(change.previousValue)
    const next = shippingValue(change.newValue)
    return (
      <li className="relative border-l-2 border-brand-300 pb-1 pl-5">
        <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-brand-500" />
        <p className="font-semibold text-slate-900">Datos de envío actualizados</p>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[7rem_1fr]">
          {previous.carrier !== next.carrier && <><dt className="text-slate-500">Transportista</dt><dd>{previous.carrier || 'Sin asignar'} → {next.carrier || 'Sin asignar'}</dd></>}
          {previous.trackingNumber !== next.trackingNumber && <><dt className="text-slate-500">Rastreo</dt><dd>{previous.trackingNumber || 'Sin asignar'} → {next.trackingNumber || 'Sin asignar'}</dd></>}
        </dl>
        <p className="mt-2 text-sm text-slate-500">{change.actorName} · {role} · {new Date(change.changedAt).toLocaleString()}</p>
        {note && <p className="mt-1 text-sm text-slate-600">{note}</p>}
      </li>
    )
  }

  const title = change.changeType === 'payment' ? 'Estado del pago' : 'Estado de cumplimiento'
  return (
    <li className="relative border-l-2 border-brand-300 pb-1 pl-5">
      <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-brand-500" />
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 font-semibold text-slate-900">
        {translatedValue(change, change.previousValue)} → {translatedValue(change, change.newValue)}
      </p>
      <p className="mt-2 text-sm text-slate-500">{change.actorName} · {role} · {new Date(change.changedAt).toLocaleString()}</p>
      {note && <p className="mt-1 text-sm text-slate-600">{note}</p>}
    </li>
  )
}

function ProductLine({ item, currency }: { item: OrderItem; currency: string }) {
  const sku = itemSku(item)
  const variantId = itemVariantId(item)
  const options = itemOptions(item)
  const quantity = Number(item.quantity || 0)

  return (
    <article className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="flex min-w-0 gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
          <Box className="size-5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-slate-900">{itemName(item)}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>Cantidad: <strong className="font-medium text-slate-700">{quantity}</strong></span>
            {sku && <span className="inline-flex items-center gap-1"><Hash className="size-3.5" />SKU: {sku}</span>}
            {!sku && variantId && <span>Variante #{variantId}</span>}
          </div>
          {options.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Atributos seleccionados">
              {options.map((option, index) => (
                <span
                  key={`${option.optionName || 'option'}-${option.label || option.value || index}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-sm font-medium text-cyan-900"
                >
                  <Layers3 className="size-3.5" />
                  {optionLabel(option)}
                </span>
              ))}
            </div>
          )}
          {options.length === 0 && !variantId && (
            <p className="mt-2 text-sm text-slate-400">Producto sin variante</p>
          )}
        </div>
      </div>
      <div className="text-left sm:text-right">
        <strong className="block text-base text-slate-900">{money(itemLineTotal(item), currency)}</strong>
        <span className="text-sm text-slate-500">{money(itemUnitPrice(item), currency)} c/u</span>
      </div>
    </article>
  )
}

export function OrderDetail({ id, role }: { id: string; role: string }) {
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`)
    const payload = await response.json()
    if (!response.ok) setError(payload.error || 'No se pudo cargar la orden.')
    else setOrder(payload.data)
  }, [id])

  useEffect(() => { void load() }, [load])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!order) return
    setSaving(true)
    setError('')
    const data = new FormData(event.currentTarget)
    const payload = {
      fulfillmentStatus: data.get('fulfillmentStatus'),
      carrier: data.get('carrier') || null,
      trackingNumber: data.get('trackingNumber') || null,
      note: data.get('note') || undefined,
    }
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await response.json()
    setSaving(false)
    if (!response.ok) {
      setError(result.error || 'No se pudo guardar.')
      return
    }
    setOrder(result.data)
  }

  if (!order && !error) return <p className="rounded-2xl border bg-white p-8">Cargando orden…</p>
  if (!order) return <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>

  // The checkout snapshot contains the product title, SKU and selected attributes.
  // Relational orderItems are retained as a fallback for older records.
  const items = order.items?.length ? order.items : order.orderItems ?? []
  const visibleHistory = order.changeHistory?.filter((change) => !isRedundantChange(change)) ?? []

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm font-semibold text-brand-700 hover:underline">← Volver a órdenes</Link>
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border bg-white p-6">
        <div><h2 className="text-2xl font-bold">{order.orderNumber}</h2><p className="text-slate-500">Creada {new Date(order.createdAt).toLocaleString()}</p></div>
        <div className="flex gap-2"><StatusBadge value={order.fulfillmentStatus} /><StatusBadge value={order.paymentState} payment /></div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border bg-white p-6">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Productos</h3><span className="text-sm text-slate-500">{items.length} líneas</span></div>
            <div className="mt-2 divide-y">{items.map((item, index) => <ProductLine key={displayText(item.id ?? `${itemName(item)}-${index}`)} item={item} currency={order.currency} />)}</div>
            <dl className="ml-auto mt-4 grid max-w-sm grid-cols-2 gap-2 border-t pt-4 text-sm">
              <dt>Subtotal</dt><dd className="text-right">{money(order.subtotal, order.currency)}</dd>
              <dt>Descuento</dt><dd className="text-right">−{money(order.discountAmount, order.currency)}</dd>
              <dt>Impuestos</dt><dd className="text-right">{money(order.taxAmount, order.currency)}</dd>
              <dt>Envío</dt><dd className="text-right">{money(order.shippingAmount, order.currency)}</dd>
              <dt className="font-bold">Total</dt><dd className="text-right font-bold">{money(order.totalAmount, order.currency)}</dd>
            </dl>
          </section>
          <section className="grid gap-6 rounded-2xl border bg-white p-6 md:grid-cols-2">
            <div><h3 className="mb-3 text-lg font-bold">Cliente</h3><p>{order.customerName}</p><a className="text-brand-700 hover:underline" href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a><p>{order.customerPhone || '—'}</p></div>
            <div><h3 className="mb-3 text-lg font-bold">Dirección de envío</h3><Address value={order.shippingAddress} /></div>
          </section>
          <section className="rounded-2xl border bg-white p-6">
            <h3 className="mb-4 text-lg font-bold">Historial</h3>
            <ol className="space-y-5">{visibleHistory.map((change) => <HistoryEntry key={change.id} change={change} />)}{visibleHistory.length === 0 && <li className="text-slate-500">Sin cambios registrados todavía.</li>}</ol>
          </section>
        </div>
        <aside>
          <form key={order.updatedAt} onSubmit={submit} className="sticky top-6 space-y-4 rounded-2xl border bg-white p-6">
            <h3 className="text-lg font-bold">Cumplimiento y envío</h3>
            <label className="block text-sm font-medium">Estado<select name="fulfillmentStatus" defaultValue={order.fulfillmentStatus} className="mt-1 w-full rounded-lg border px-3 py-2">{(Object.keys(fulfillmentLabels) as FulfillmentStatus[]).filter((value) => role === 'admin' || value !== 'cancelled').map((value) => <option key={value} value={value}>{fulfillmentLabels[value]}</option>)}</select></label>
            <label className="block text-sm font-medium">Transportista<input name="carrier" defaultValue={order.carrier || ''} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <label className="block text-sm font-medium">Número de rastreo<input name="trackingNumber" defaultValue={order.trackingNumber || ''} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <label className="block text-sm font-medium">Nota<textarea name="note" rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
            <button disabled={saving} className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar cambios'}</button>
            <p className="text-xs text-slate-500">El estado de pago se consulta y actualiza exclusivamente desde Stripe.</p>
            {order.shippedAt && <p className="text-sm">Enviada: {new Date(order.shippedAt).toLocaleString()}</p>}
            {order.deliveredAt && <p className="text-sm">Entregada: {new Date(order.deliveredAt).toLocaleString()}</p>}
          </form>
        </aside>
      </div>
    </div>
  )
}
