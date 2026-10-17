import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { sendLoginAlert } from '@/lib/email'
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, clientIp, createAdminSession, passwordMatches } from '@/lib/auth'

// Progressive backoff: each lockout round gets stricter
// round 0 → 5 attempts / 15 min lockout
// round 1 → 2 attempts / 30 min lockout
// round 2+ → 1 attempt / 60 min lockout (repeats indefinitely until correct login)
const ROUNDS = [
  { maxAttempts: 5, lockoutMs: 15 * 60 * 1000, lockoutMinutes: 15 },
  { maxAttempts: 2, lockoutMs: 30 * 60 * 1000, lockoutMinutes: 30 },
  { maxAttempts: 1, lockoutMs: 60 * 60 * 1000, lockoutMinutes: 60 },
]

interface AttemptRecord {
  count: number
  resetAt: number
  round: number
  lockedOut: boolean
}

// Attempts live in the admin_login_attempts table (scripts/sql/admin-login-attempts.sql)
// so lockouts survive serverless cold starts and are shared across instances.
// The in-memory map is only a fallback for when that table isn't reachable.
const memory = new Map<string, AttemptRecord>()

async function readRecord(ip: string): Promise<AttemptRecord | undefined> {
  try {
    const { data, error } = await getServiceClient()
      .from('admin_login_attempts')
      .select('count, round, reset_at, locked_out')
      .eq('ip', ip)
      .maybeSingle()
    if (error) return memory.get(ip)
    if (!data) return undefined
    return { count: data.count, round: data.round, resetAt: new Date(data.reset_at).getTime(), lockedOut: data.locked_out }
  } catch {
    return memory.get(ip)
  }
}

async function writeRecord(ip: string, rec: AttemptRecord) {
  memory.set(ip, rec)
  try {
    await getServiceClient()
      .from('admin_login_attempts')
      .upsert(
        { ip, count: rec.count, round: rec.round, reset_at: new Date(rec.resetAt).toISOString(), locked_out: rec.lockedOut },
        { onConflict: 'ip' }
      )
  } catch {}
}

async function clearRecord(ip: string) {
  memory.delete(ip)
  try {
    await getServiceClient().from('admin_login_attempts').delete().eq('ip', ip)
  } catch {}
}

async function getRecord(ip: string, now: number): Promise<AttemptRecord> {
  const existing = await readRecord(ip)
  if (!existing) return { count: 0, resetAt: 0, round: 0, lockedOut: false }
  if (existing.lockedOut && now >= existing.resetAt) {
    return { count: 0, resetAt: 0, round: existing.round, lockedOut: false }
  }
  return existing
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const now = Date.now()

  // Check permanent IP blocklist in Supabase
  try {
    const sb = getServiceClient()
    const { data: blocked } = await sb
      .from('blocked_ips')
      .select('ip')
      .eq('ip', ip)
      .single()
    if (blocked) {
      // Return generic error — don't reveal they're blocked
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
  } catch {
    // If table doesn't exist yet, skip the check
  }

  const rec = await getRecord(ip, now)

  // Still in a lockout window
  if (rec.lockedOut) {
    const retryAfter = Math.ceil((rec.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const { password } = await req.json().catch(() => ({}))

  if (!passwordMatches(password)) {
    const newCount = rec.count + 1
    const roundConfig = ROUNDS[Math.min(rec.round, ROUNDS.length - 1)]

    if (newCount >= roundConfig.maxAttempts) {
      const nextRound = Math.min(rec.round + 1, ROUNDS.length - 1)
      await writeRecord(ip, {
        count: newCount,
        resetAt: now + roundConfig.lockoutMs,
        round: nextRound,
        lockedOut: true,
      })

      // Fire alert email (non-blocking)
      sendLoginAlert({
        ip,
        attempts: newCount,
        lockoutMinutes: roundConfig.lockoutMinutes,
        round: rec.round + 1,
      }).catch(() => {})
    } else {
      await writeRecord(ip, { ...rec, count: newCount })
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  // Correct password — wipe all history for this IP
  await clearRecord(ip)

  const res = NextResponse.json({ success: true })
  res.cookies.set(ADMIN_COOKIE, createAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_SECONDS,
  })
  return res
}
