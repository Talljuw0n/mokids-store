import { getServiceClient, isConfigured } from '@/lib/supabase'
import { DELIVERY_ZONES, HEAVY_ORDER_THRESHOLD, formatPrice, ShippingRate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getRates(): Promise<Record<string, ShippingRate>> {
  const map: Record<string, ShippingRate> = {}
  for (const zone of DELIVERY_ZONES) {
    for (const state of zone.states) {
      map[state] = { fee: zone.defaultFee, heavy_fee: zone.defaultHeavyFee }
    }
  }
  try {
    if (!isConfigured()) return map
    const sb = getServiceClient()
    const { data } = await sb.from('shipping_rates').select('state, fee, heavy_fee')
    for (const row of (data ?? [])) {
      map[row.state] = { fee: row.fee, heavy_fee: row.heavy_fee ?? row.fee }
    }
  } catch {
    // fall back to defaults already in map
  }
  return map
}

// A zone's displayed fee is its most common (modal) rate — states occasionally
// have a one-off override, but the zone card should show what most customers pay
function modalFee(states: readonly string[], rates: Record<string, ShippingRate>, key: 'fee' | 'heavy_fee') {
  const counts = new Map<number, number>()
  for (const s of states) {
    const v = rates[s]?.[key]
    if (v == null) continue
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  let best = 0, bestCount = -1
  for (const [v, c] of counts) if (c > bestCount) { best = v; bestCount = c }
  return best
}

export default async function ShippingInfoPage() {
  const rates = await getRates()
  const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '2348000000000').replace(/^\+/, '')

  return (
    <div className="bg-white">
      <div className="max-w-4xl mx-auto px-4 py-14">
        <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Shipping Info
        </h1>
        <p className="text-gray-500 font-bold mb-10" style={{ fontFamily: "'Poppins', sans-serif" }}>
          We ship nationwide across all 36 states + FCT. Delivery fees depend on your state and order size.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {DELIVERY_ZONES.map((zone) => (
            <div key={zone.id} className="rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="w-8 h-1.5 rounded-full mb-3" style={{ backgroundColor: zone.color }} />
              <p className="font-bold text-gray-900 mb-0.5" style={{ fontFamily: "'Poppins', sans-serif" }}>{zone.name}</p>
              <p className="text-xs text-gray-400 font-bold mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>via {zone.carrier}</p>
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {formatPrice(modalFee(zone.states, rates, 'fee'))}
              </p>
              <p className="text-xs text-gray-400 font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>standard order</p>
              <p className="text-sm text-gray-600 font-bold mt-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {formatPrice(modalFee(zone.states, rates, 'heavy_fee'))} <span className="text-gray-400 font-normal">for {HEAVY_ORDER_THRESHOLD}+ items</span>
              </p>
              {zone.note && <p className="text-xs text-gray-400 mt-2">{zone.note}</p>}
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-gray-50 p-5 mb-10">
          <p className="text-sm text-gray-700 font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Your exact delivery fee is calculated at checkout based on the state you select — it's shown before you pay, no surprises.
          </p>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Rate by state
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mb-10">
          {DELIVERY_ZONES.flatMap(z => z.states).sort().map((state) => (
            <div key={state} className="flex items-center justify-between py-1.5 border-b border-gray-50 text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>
              <span className="text-gray-600 font-bold">{state}</span>
              <span className="text-gray-900 font-bold">{formatPrice(rates[state]?.fee ?? 0)}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-500" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Questions about your delivery? <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="font-bold text-[#25D366] hover:underline">Message us on WhatsApp</a>.
        </p>
      </div>
    </div>
  )
}
