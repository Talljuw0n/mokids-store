'use client'
import { useEffect, useState } from 'react'

interface BlockedIP {
  id: string
  ip: string
  reason: string | null
  created_at: string
}

export default function SecurityPage() {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([])
  const [newIP, setNewIP] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/blocked-ips')
    if (res.ok) setBlockedIPs(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function blockIP(e: React.FormEvent) {
    e.preventDefault()
    if (!newIP.trim()) return
    setAdding(true)
    setError('')
    const res = await fetch('/api/admin/blocked-ips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: newIP.trim(), reason: reason.trim() || null }),
    })
    if (res.ok) {
      setNewIP('')
      setReason('')
      await load()
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to block IP')
    }
    setAdding(false)
  }

  async function unblockIP(ip: string) {
    await fetch('/api/admin/blocked-ips', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    })
    await load()
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
        Security
      </h1>
      <p className="text-sm text-gray-400 font-bold mb-8" style={{ fontFamily: "'Poppins', sans-serif" }}>
        Permanently block IP addresses from attempting to log in
      </p>

      {/* Block new IP */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="font-bold text-gray-900 mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Block an IP Address
        </h2>
        <form onSubmit={blockIP} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              IP Address
            </label>
            <input
              type="text"
              value={newIP}
              onChange={e => setNewIP(e.target.value)}
              placeholder="e.g. 102.89.45.12"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D9247A]"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Repeated login attempts"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#D9247A]"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            />
          </div>
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
          <button
            type="submit"
            disabled={adding || !newIP.trim()}
            className="self-start px-5 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {adding ? 'Blocking…' : 'Block IP'}
          </button>
        </form>
      </div>

      {/* Blocked IPs list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Blocked IPs {blockedIPs.length > 0 && <span className="text-gray-400 font-normal">({blockedIPs.length})</span>}
        </h2>

        {loading ? (
          <p className="text-sm text-gray-400 font-bold">Loading…</p>
        ) : blockedIPs.length === 0 ? (
          <p className="text-sm text-gray-400 font-bold">No IPs blocked yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {blockedIPs.map(entry => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 rounded-xl"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    {entry.ip}
                  </p>
                  {entry.reason && (
                    <p className="text-xs text-gray-400 font-bold truncate">{entry.reason}</p>
                  )}
                  <p className="text-xs text-gray-300 font-bold">
                    {new Date(entry.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                  </p>
                </div>
                <button
                  onClick={() => unblockIP(entry.ip)}
                  className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
