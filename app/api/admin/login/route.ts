import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { sendLoginAlert } from '@/lib/email'

// Progressive backoff: each lockout round gets stricter
// round 0 → 5 attempts / 15 min lockout
// round 1 → 2 attempts / 30 min lockout
// round 2+ → 1 attempt / 60 min lockout (repeats indefinitely until correct login)
const ROUNDS = [
  { maxAttempts: 5, lockoutMs: 15 * 60 * 1000, lockoutMinutes: 15 },
  { maxAttempts: 2, lockoutMs: 30 * 60 * 1000, lockoutMinutes: 30 },
  { maxAttempts: 1, lockoutMs: 60 * 60 * 1000, lockoutMinutes: 60 },
]

interface Record {
  count: number
  resetAt: number
  round: number
  lockedOut: boolean
}

const tracker = new Map<string, Record>()

function getRecord(ip: string, now: number): Record {
  const existing = tracker.get(ip)
  if (!existing) return { count: 0, resetAt: 0, round: 0, lockedOut: false }
  if (existing.lockedOut && now >= existing.resetAt) {
    return { count: 0, resetAt: 0, round: existing.round, lockedOut: false }
  }
  return existing
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
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

  const rec = getRecord(ip, now)

  // Still in a lockout window
  if (rec.lockedOut) {
    const retryAfter = Math.ceil((rec.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const { password } = await req.json()

  if (password !== process.env.ADMIN_PASSWORD) {
    const newCount = rec.count + 1
    const roundConfig = ROUNDS[Math.min(rec.round, ROUNDS.length - 1)]

    if (newCount >= roundConfig.maxAttempts) {
      const nextRound = Math.min(rec.round + 1, ROUNDS.length - 1)
      tracker.set(ip, {
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
      tracker.set(ip, { ...rec, count: newCount })
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  // Correct password — wipe all history for this IP
  tracker.delete(ip)

  const res = NextResponse.json({ success: true })
  res.cookies.set('admin_token', process.env.ADMIN_PASSWORD!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
