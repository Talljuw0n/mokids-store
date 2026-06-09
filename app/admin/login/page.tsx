'use client'
import { useState } from 'react'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      window.location.replace('/admin')
    } else {
      setError('Invalid password. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFBEF] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-4xl" style={{ fontFamily: "'Fredoka One', cursive" }}>
            <span className="text-black">Mo</span>
            <span className="text-[#D9247A]">Kids</span>
            <span className="text-[#F5C000]"> Admin</span>
          </h1>
          <p className="text-sm text-gray-500 font-bold mt-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
            Store Management Dashboard
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border-[2.5px] border-black shadow-[6px_6px_0_#000] p-6"
        >
          <div className="mb-4">
            <label className="block text-sm font-bold mb-1" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Admin Password
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                className="w-full px-4 py-2.5 pr-12 text-sm font-bold border-[2.5px] border-black rounded-xl bg-[#FFFBEF] focus:outline-none focus:border-[#F5C000] transition-colors"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition-colors text-lg select-none"
                tabIndex={-1}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 font-bold mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-bold rounded-xl border-[2.5px] border-black shadow-[4px_4px_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] transition-all disabled:opacity-50"
            style={{ fontFamily: "'Fredoka One', cursive", backgroundColor: '#F5C000', color: '#000', fontSize: '1rem' }}
          >
            {loading ? '⏳ Logging in...' : '🔐 Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
