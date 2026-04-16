'use client'

import { useState, useEffect, type ReactNode } from 'react'

const SESSION_KEY = 'karmyog-admin-session'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

function isSessionValid(): boolean {
  if (typeof window === 'undefined') return false
  const session = localStorage.getItem(SESSION_KEY)
  if (!session) return false
  try {
    const { expiresAt } = JSON.parse(session)
    return Date.now() < expiresAt
  } catch {
    return false
  }
}

function createSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ expiresAt: Date.now() + SESSION_DURATION }))
}

export function clearAdminSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function AdminGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setAuthenticated(isSessionValid())
    setChecking(false)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })

    if (res.ok) {
      createSession()
      setAuthenticated(true)
    } else {
      setError('Invalid PIN. Please try again.')
      setPin('')
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full mx-4">
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-stone-800">KarmYog Gallery</h1>
            <p className="text-sm text-stone-500 mt-1">Enter admin PIN to continue</p>
          </div>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-2xl tracking-[0.5em] border border-stone-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-stone-800 focus:border-transparent"
              placeholder="------"
              autoFocus
            />

            {error && (
              <p className="text-red-600 text-sm text-center mb-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={pin.length < 4}
              className="w-full bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300 text-white py-3 rounded-lg text-sm font-medium transition"
            >
              Enter
            </button>
          </form>

          <p className="text-xs text-stone-400 text-center mt-6">
            KarmYog Vatika Gardens - Admin Access
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
