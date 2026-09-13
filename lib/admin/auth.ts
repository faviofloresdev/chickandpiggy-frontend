import 'server-only'

import { cookies } from 'next/headers'
import { createHmac, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { env } from '@/lib/config/env'

const scrypt = promisify(scryptCallback)
export const ADMIN_COOKIE = 'cp_admin_session'
const SESSION_SECONDS = 8 * 60 * 60

export type AdminRole = 'admin' | 'operator'
export type AdminSession = { email: string; name: string; role: AdminRole; exp: number }
type AdminUser = Omit<AdminSession, 'exp'> & { passwordHash: string }

function users(): AdminUser[] {
  if (!env.adminUsersJson) return []
  try {
    const parsed = JSON.parse(env.adminUsersJson) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((user): user is AdminUser => {
      if (!user || typeof user !== 'object') return false
      const candidate = user as Record<string, unknown>
      return typeof candidate.email === 'string' && typeof candidate.name === 'string' &&
        (candidate.role === 'admin' || candidate.role === 'operator') &&
        typeof candidate.passwordHash === 'string'
    })
  } catch {
    return []
  }
}

function sessionSecret() {
  if (!env.adminSessionSecret || env.adminSessionSecret.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must contain at least 32 characters')
  }
  return env.adminSessionSecret
}

function sign(encodedPayload: string) {
  return createHmac('sha256', sessionSecret()).update(encodedPayload).digest('base64url')
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function authenticateAdmin(email: string, password: string): Promise<AdminSession | null> {
  const user = users().find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase())
  if (!user) return null
  // Colon is the preferred delimiter because Next.js expands unescaped `$NAME`
  // sequences in .env files. Dollar-delimited hashes remain supported when escaped.
  const [algorithm, saltHex, expectedHex] = user.passwordHash.split(/[:$]/)
  if (algorithm !== 'scrypt' || !saltHex || !expectedHex) return null
  const actual = (await scrypt(password, Buffer.from(saltHex, 'hex'), 64)) as Buffer
  if (!safeEqual(actual.toString('hex'), expectedHex)) return null
  return { email: user.email, name: user.name, role: user.role, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }
}

export function encodeAdminSession(session: AdminSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function decodeAdminSession(value: string | undefined): AdminSession | null {
  if (!value) return null
  try {
    const [payload, signature] = value.split('.')
    if (!payload || !signature || !safeEqual(sign(payload), signature)) return null
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminSession
    if (!session.email || !session.name || !['admin', 'operator'].includes(session.role) || session.exp <= Date.now() / 1000) return null
    return session
  } catch {
    return null
  }
}

export async function getAdminSession() {
  return decodeAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)
}

export function adminCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge: SESSION_SECONDS }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!origin || !host || new URL(origin).host !== host) throw new Error('Invalid request origin')
}
