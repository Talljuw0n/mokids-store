import { NextRequest } from 'next/server'
import { createHash, createHmac, timingSafeEqual } from 'crypto'

export const ADMIN_COOKIE = 'admin_token'
export const ADMIN_SESSION_SECONDS = 60 * 60 * 24 * 7

// Sessions are signed with ADMIN_SESSION_SECRET when set, otherwise with the
// admin password itself — either way the cookie never contains the password,
// and changing the secret/password logs every existing session out.
function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || ''
}

function sign(expires: number): Buffer {
  return createHmac('sha256', sessionSecret()).update(`admin:${expires}`).digest()
}

// Token format: "<unix expiry seconds>.<hex HMAC of the expiry>"
export function createAdminSession(): string {
  const expires = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS
  return `${expires}.${sign(expires).toString('hex')}`
}

export function verifyAdminSession(token: string | undefined): boolean {
  if (!token || !sessionSecret()) return false
  const [exp, sig] = token.split('.')
  const expires = Number(exp)
  if (!Number.isInteger(expires) || expires * 1000 < Date.now()) return false
  if (!/^[0-9a-f]{64}$/.test(sig ?? '')) return false
  return timingSafeEqual(Buffer.from(sig, 'hex'), sign(expires))
}

// Constant-time password check — hashing first gives both sides equal length
export function passwordMatches(input: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || typeof input !== 'string') return false
  const a = createHash('sha256').update(input).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export function isAdminRequest(req: NextRequest): boolean {
  return verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value)
}

// Client IP for rate limiting. x-real-ip is set by the hosting platform
// (Vercel overwrites it), so it can't be forged by the client the way the
// first entry of x-forwarded-for can.
export function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ||
    'unknown'
  )
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}
