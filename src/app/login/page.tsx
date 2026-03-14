'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (res.ok) {
      router.push('/')
    } else {
      const data = await res.json()
      setError(data.error || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🏀</span>
          <p className="font-display text-2xl tracking-wide mt-2" style={{ color: 'var(--accent)' }}>MARCH MADNESS</p>
        </div>
        <div className="card">
          <h2 className="font-display text-xl tracking-wide mb-6">SIGN IN</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest mb-1 block" style={{ color: 'rgba(240,237,232,0.5)' }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--net)', color: 'var(--chalk)' }}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest mb-1 block" style={{ color: 'rgba(240,237,232,0.5)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--net)', color: 'var(--chalk)' }}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="text-sm" style={{ color: 'var(--accent)' }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary mt-2">
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>
        </div>
        <p className="text-center mt-4 text-xs" style={{ color: 'rgba(240,237,232,0.3)' }}>
          <Link href="/" style={{ color: 'rgba(240,237,232,0.4)' }}>← Back to draft board</Link>
        </p>
      </div>
    </div>
  )
}
