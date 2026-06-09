import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { isAdminRequest, unauthorized } from '@/lib/auth'
import { NIGERIAN_STATES, DEFAULT_SHIPPING_RATES, ShippingRate } from '@/lib/utils'

// Public — returns { [state]: { fee, heavy_fee } }
export async function GET() {
  try {
    const sb = getServiceClient()
    const { data } = await sb.from('shipping_rates').select('state, fee, heavy_fee')

    const map: Record<string, ShippingRate> = {}
    // Seed with defaults
    for (const [state, rate] of Object.entries(DEFAULT_SHIPPING_RATES)) {
      map[state] = rate
    }
    // Override with DB values
    for (const row of (data ?? [])) {
      map[row.state] = { fee: row.fee, heavy_fee: row.heavy_fee ?? row.fee }
    }
    // Ensure every Nigerian state has an entry
    for (const s of NIGERIAN_STATES) {
      if (!(s in map)) map[s] = { fee: 5500, heavy_fee: 7500 }
    }
    return NextResponse.json(map)
  } catch {
    return NextResponse.json(DEFAULT_SHIPPING_RATES)
  }
}

// Admin only — body: { rates: { [state]: { fee, heavy_fee } } }
export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized()
  const { rates } = await req.json() as { rates: Record<string, ShippingRate> }

  const sb = getServiceClient()
  const rows = Object.entries(rates).map(([state, r]) => ({
    state,
    fee: r.fee,
    heavy_fee: r.heavy_fee,
  }))
  const { error } = await sb.from('shipping_rates').upsert(rows, { onConflict: 'state' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
