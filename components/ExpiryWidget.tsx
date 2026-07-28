'use client'

import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, XCircle, CheckCircle, Loader2, Bot } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface Counts { expired: number; within7: number; within14: number; within30: number; total: number }

const TIERS = [
  { key: 'expired',  label: 'Already Expired',  icon: XCircle,       color: 'var(--accent-red)'   },
  { key: 'within7',  label: 'Expires ≤ 7 days', icon: AlertTriangle, color: 'var(--accent-red)'   },
  { key: 'within14', label: 'Expires ≤ 14 days', icon: Clock,        color: 'var(--accent-amber)'  },
  { key: 'within30', label: 'Expires ≤ 30 days', icon: Clock,        color: 'var(--accent-amber)'  },
] as const

export default function ExpiryWidget() {
  const [counts,       setCounts]       = useState<Counts | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [advice,       setAdvice]       = useState<string | null>(null)
  const [adviceLoading, setAdviceLoading] = useState(false)
  const [showAdvice,   setShowAdvice]   = useState(false)

  useEffect(() => {
    fetch('/api/expiry')
      .then(r => r.json())
      .then(d => setCounts(d.counts))
      .finally(() => setLoading(false))
  }, [])

  async function loadAdvice() {
    if (advice) { setShowAdvice(v => !v); return }
    setAdviceLoading(true)
    setShowAdvice(true)
    try {
      const res  = await fetch('/api/ai/expiry-advice')
      const data = await res.json()
      setAdvice(data.advice ?? data.error ?? 'Could not load advice.')
    } finally {
      setAdviceLoading(false)
    }
  }

  const hasIssues = counts && counts.total > 0

  return (
    <div className="glass-card overflow-hidden h-full flex flex-col">
      <div
        className="px-5 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h2 className="text-sm font-semibold">Expiry Alerts</h2>
          <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>Real-time batch expiry tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {hasIssues && (
            <button
              onClick={loadAdvice}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors"
              style={{
                background: 'var(--accent-blue-bg)',
                border:     '1px solid var(--accent-blue-border)',
                color:      'var(--accent-blue)',
              }}
            >
              <Bot className="w-3 h-3" /> AI Advice
            </button>
          )}
          <Link href="/batches" className="text-xs font-mono transition-colors" style={{ color: 'var(--accent-blue)' }}>
            View all →
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 p-4">
            {TIERS.map(tier => {
              const count = counts?.[tier.key] ?? 0
              const Icon  = tier.icon
              const active = count > 0
              return (
                <Link
                  key={tier.key}
                  href="/batches"
                  className="flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.02]"
                  style={{
                    background:   active ? `color-mix(in srgb, ${tier.color} 10%, transparent)` : 'var(--bg-muted)',
                    border:       `1px solid ${active ? `color-mix(in srgb, ${tier.color} 25%, transparent)` : 'var(--border)'}`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: active ? tier.color : 'var(--text-muted)', opacity: active ? 1 : 0.4 }} />
                  <div>
                    <p className="stat-num text-lg leading-none" style={{ color: active ? tier.color : 'var(--text-muted)' }}>
                      {count}
                    </p>
                    <p className="text-[10px] font-mono mt-0.5 leading-none" style={{ color: 'var(--text-muted)' }}>
                      {tier.label}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>

          {!hasIssues && (
            <div className="flex items-center gap-2 px-5 pb-4 text-xs font-mono" style={{ color: 'var(--accent-emerald)' }}>
              <CheckCircle className="w-3.5 h-3.5" />
              All batches within safe expiry windows
            </div>
          )}

          <AnimatePresence>
            {showAdvice && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden flex-shrink-0"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-3.5 h-3.5" style={{ color: 'var(--accent-blue)' }} />
                    <span className="text-xs font-mono" style={{ color: 'var(--accent-blue)' }}>AI Expiry Recommendations</span>
                  </div>
                  {adviceLoading ? (
                    <div className="flex items-center gap-2 text-xs font-mono py-2" style={{ color: 'var(--text-muted)' }}>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing expiry data…
                    </div>
                  ) : (
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans" style={{ color: 'var(--text-secondary)' }}>
                      {advice}
                    </pre>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
