import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow the login page itself through — otherwise we'd redirect loop
  if (pathname === '/admin/login') return NextResponse.next()

  const token = req.cookies.get('admin_token')?.value
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    const loginUrl = new URL('/admin/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
