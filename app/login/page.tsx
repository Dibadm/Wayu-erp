'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, FlaskConical, Shield } from 'lucide-react'

export default function LoginPage() {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 surface-page"
    >
      {/* Subtle bg accent */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, var(--accent-blue-bg), transparent)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{
              background: 'var(--accent-blue-bg)',
              border:     '1px solid var(--accent-blue-border)',
            }}
          >
            <FlaskConical className="w-6 h-6" style={{ color: 'var(--accent-blue)' }} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">WAYU Inventory</h1>
          <p className="text-sm font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
            Pharmaceutical Management System
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-6">
          <div
            className="flex items-center gap-2 mb-5 pb-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <Shield className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Secure Sign-In
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Email
              </label>
              <input
                type="email"
                className="input"
                placeholder="user@wayu.ph"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Password
              </label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono"
                style={{
                  background:   'var(--accent-red-bg)',
                  border:       '1px solid var(--accent-red-border)',
                  color:        'var(--accent-red)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent-red)' }} />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Authenticating…</>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs font-mono text-center mb-2" style={{ color: 'var(--text-muted)' }}>
              Demo credentials
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {[
                { role: 'Admin',  email: 'admin@wayu.ph', pass: 'admin123' },
                { role: 'Staff',  email: 'staff@wayu.ph', pass: 'staff123' },
              ].map(c => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => { setEmail(c.email); setPassword(c.pass) }}
                  className="text-left px-2.5 py-2 rounded-lg transition-colors"
                  style={{
                    background: 'var(--bg-muted)',
                    border:     '1px solid var(--border)',
                    color:      'var(--text-secondary)',
                  }}
                >
                  <p style={{ color: 'var(--text-muted)' }}>{c.role}</p>
                  <p>{c.email}</p>
                  <p style={{ color: 'var(--text-muted)' }}>{c.pass}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs font-mono mt-6" style={{ color: 'var(--text-muted)' }}>
          v2.2.0 · WAYU Pharmaceutical Systems
        </p>
      </motion.div>
    </div>
  )
}
