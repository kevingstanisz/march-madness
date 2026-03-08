'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // Verify admin
    const { data: playerData } = await supabase.from('players').select('is_admin').eq('email', email).single()
    if (!playerData?.is_admin) {
      await supabase.auth.signOut()
      setError('Access denied. Admin only.')
      setLoading(false)
      return
    }
    router.push('/admin')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm slide-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚙️</div>
          <h1 className="font-display text-4xl tracking-wide" style={{ color: 'var(--accent)' }}>ADMIN</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(240,237,232,0.4)' }}>Commissioner access only</p>
        </div>
        <div className="card">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest mb-1 block" style={{ color: 'rgba(240,237,232,0.5)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest mb-1 block" style={{ color: 'rgba(240,237,232,0.5)' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <p className="text-sm" style={{ color: 'var(--accent)' }}>{error}</p>}
            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>
        </div>
        <div className="text-center mt-4">
          <Link href="/" className="text-xs" style={{ color: 'rgba(240,237,232,0.3)' }}>← Back to public site</Link>
        </div>
      </div>
    </div>
  )
}
