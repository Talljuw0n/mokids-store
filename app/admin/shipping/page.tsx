'use client'
import { useState, useEffect, useCallback } from 'react'
import { DELIVERY_ZONES, ShippingRate, formatPrice } from '@/lib/utils'

export default function AdminShippingPage() {
  const [rates, setRates] = useState<Record<string, ShippingRate>>({})
  const [original, setOriginal] = useState<Record<string, ShippingRate>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/shipping-rates')
    const data = await res.json()
    setRates(data)
    setOriginal(JSON.parse(JSON.stringify(data)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const setZoneRates = (states: readonly string[], value: number) => {
    setRates(prev => {
      const next = { ...prev }
      for (const s of states) {
        next[s] = { fee: value }
      }
      return next
    })
  }

  const setStateRate = (state: string, value: number) => {
    setRates(prev => ({
      ...prev,
      [state]: { fee: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await fetch('/api/shipping-rates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rates }),
    })
    setOriginal(JSON.parse(JSON.stringify(rates)))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const isDirty = JSON.stringify(rates) !== JSON.stringify(original)

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Rates</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            saved
              ? 'bg-green-100 text-green-700'
              : isDirty
              ? 'bg-gray-900 text-white hover:bg-gray-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      {/* Column headers explanation */}
      <div className="hidden sm:grid grid-cols-[1fr_160px] gap-4 px-5 pb-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
        <span>State</span>
        <span>Delivery Fee</span>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 font-bold">Loading rates…</div>
      ) : (
        <div className="flex flex-col gap-5">
          {DELIVERY_ZONES.map((zone) => {
            const fees = zone.states.map(s => rates[s]?.fee ?? zone.defaultFee)
            const allFeeSame = fees.every(f => f === fees[0])

            return (
              <div key={zone.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Zone header */}
                <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: zone.color }} />
                    <div>
                      <span className="font-bold text-gray-800">{zone.name}</span>
                      <span className="ml-2 text-xs text-gray-400 font-bold">via {zone.carrier}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-bold">
                      · {zone.states.length} state{zone.states.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Set-all input for the zone */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 font-bold hidden sm:inline">Set all:</span>
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <span className="px-2 text-xs text-gray-400 bg-gray-50 font-bold border-r border-gray-200">₦</span>
                      <input
                        type="number"
                        step="500"
                        min="0"
                        placeholder={allFeeSame ? String(fees[0]) : 'Mixed'}
                        key={`${zone.id}-${allFeeSame ? fees[0] : ''}`}
                        onChange={e => {
                          const v = parseInt(e.target.value)
                          if (!isNaN(v) && v >= 0) setZoneRates(zone.states, v)
                        }}
                        className="w-24 px-2 py-1.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
                        title="Delivery fee"
                      />
                    </div>
                  </div>
                </div>

                {/* Per-state rows */}
                <div className="divide-y divide-gray-50">
                  {zone.states.map(state => {
                    const r = rates[state] ?? { fee: zone.defaultFee }
                    const feeChanged = r.fee !== original[state]?.fee
                    return (
                      <div
                        key={state}
                        className={`grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-2 sm:gap-4 items-center px-5 py-3 ${feeChanged ? 'bg-yellow-50' : ''}`}
                      >
                        <span className="text-sm font-bold text-gray-700">{state}</span>

                        <div className="flex items-center gap-1.5">
                          <div className={`flex items-center border rounded-lg overflow-hidden ${feeChanged ? 'border-amber-400' : 'border-gray-200'}`}>
                            <span className="px-2 text-xs text-gray-400 bg-gray-50 font-bold border-r border-gray-200">₦</span>
                            <input
                              type="number"
                              step="500"
                              min="0"
                              value={r.fee}
                              onChange={e => {
                                const v = parseInt(e.target.value)
                                if (!isNaN(v) && v >= 0) setStateRate(state, v)
                              }}
                              className="w-24 px-2 py-1.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
                            />
                          </div>
                          {feeChanged && (
                            <span className="text-[10px] text-amber-600 font-bold">
                              was {formatPrice(original[state]?.fee ?? 0)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isDirty && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl z-50">
          <span className="text-sm font-bold">Unsaved changes</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-white text-gray-900 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Now'}
          </button>
        </div>
      )}
    </div>
  )
}
