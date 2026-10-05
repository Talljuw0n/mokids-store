import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { isAdminRequest, unauthorized } from '@/lib/auth'

// Single-row settings table — one shared end-date for the whole sale
// campaign, applied to every product flagged on_sale (see decision 3: one
// seasonal event, not per-product end dates).
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized()
  const sb = getServiceClient()
  const { data, error } = await sb.from('sale_settings').select('ends_at').eq('id', 1).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ends_at: data?.ends_at ?? null })
}

export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized()
  const sb = getServiceClient()
  const { ends_at } = await req.json() as { ends_at: string | null }

  const { error } = await sb.from('sale_settings').upsert({ id: 1, ends_at }, { onConflict: 'id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
