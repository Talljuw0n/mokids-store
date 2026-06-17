import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { isAdminRequest, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized()
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('blocked_ips')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized()
  const { ip, reason } = await req.json()
  if (!ip) return NextResponse.json({ error: 'IP is required' }, { status: 400 })

  const sb = getServiceClient()
  const { data, error } = await sb
    .from('blocked_ips')
    .insert({ ip: ip.trim(), reason: reason ?? null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized()
  const { ip } = await req.json()
  if (!ip) return NextResponse.json({ error: 'IP is required' }, { status: 400 })

  const sb = getServiceClient()
  const { error } = await sb.from('blocked_ips').delete().eq('ip', ip)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
