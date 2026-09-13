import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ADMIN_COOKIE, adminCookieOptions, assertSameOrigin, authenticateAdmin, encodeAdminSession } from '@/lib/admin/auth'

const schema = z.object({ email: z.string().email(), password: z.string().min(1).max(256) }).strict()
const attempts = new Map<string, number[]>()

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const key = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const now = Date.now()
    const recent = (attempts.get(key) ?? []).filter((value) => value > now - 15 * 60_000)
    if (recent.length >= 10) return NextResponse.json({ error: 'Demasiados intentos. Inténtalo más tarde.' }, { status: 429 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 400 })
    const session = await authenticateAdmin(parsed.data.email, parsed.data.password)
    if (!session) {
      attempts.set(key, [...recent, now])
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 })
    }
    attempts.delete(key)
    const response = NextResponse.json({ user: { name: session.name, email: session.email, role: session.role } })
    response.cookies.set(ADMIN_COOKIE, encodeAdminSession(session), adminCookieOptions())
    return response
  } catch {
    return NextResponse.json({ error: 'El acceso administrativo no está configurado.' }, { status: 503 })
  }
}

export async function DELETE(request: Request) {
  try { assertSameOrigin(request) } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 403 }) }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE, '', { ...adminCookieOptions(), maxAge: 0 })
  return response
}
