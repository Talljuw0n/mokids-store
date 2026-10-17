import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE } from '@/lib/auth'

// POST only — a GET logout can be triggered by any other site via an <img> tag
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin/login', req.url), 303)
  res.cookies.delete(ADMIN_COOKIE)
  return res
}
