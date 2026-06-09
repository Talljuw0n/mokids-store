import { NextRequest } from 'next/server'

export function isAdminRequest(req: NextRequest): boolean {
  const token = req.cookies.get('admin_token')?.value
  return !!token && token === process.env.ADMIN_PASSWORD
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}
