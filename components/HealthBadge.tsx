'use client'

import { useState, useEffect } from 'react'

export default function HealthBadge() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        setStatus(res.ok ? 'ok' : 'error')
      } catch {
        setStatus('error')
      }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-500/10 border border-zinc-500/20 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        <span className="text-xs font-mono text-zinc-400">CHECKING…</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        <span className="text-xs font-mono text-red-400">SYSTEM OFFLINE</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-xs font-mono text-emerald-400">SYSTEM ONLINE</span>
    </div>
  )
}
