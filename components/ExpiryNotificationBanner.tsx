'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface Counts { expired: number; within7: number; within14: number; within30: number; total: number }

const SESSION_KEY = 'wayu_expiry_banner_dismissed'

export default function ExpiryNotificationBanner() {
  const [counts,  setCounts]  = useState<Counts | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return
    fetch('/api/expiry')
      .then(r => r.json())
      .then(data => {
        const c: Counts = data.counts
        if (c && c.total > 0) { setCounts(c); setVisible(true) }
      })
      .catch(() => {})
  }, [])

  function dismiss() {
    setVisible(false)
    sessionStorage.setItem(SESSION_KEY, '1')
  }

  if (!counts) return null

  const severity = counts.expired > 0 ? 'red' : counts.within7 > 0 ? 'orange' : 'amber'

  const styles = {
    red:    { bg: 'var(--accent-red-bg)',   border: 'var(--accent-red-border)',   text: 'var(--accent-red)'   },
    orange: { bg: 'var(--accent-amber-bg)', border: 'var(--accent-amber-border)', text: 'var(--accent-amber)' },
    amber:  { bg: 'var(--accent-amber-bg)', border: 'var(--accent-amber-border)', text: 'var(--accent-amber)' },
  }[severity]

  const messages: string[] = []
  if (counts.expired  > 0) messages.push(`${counts.expired} expired batch${counts.expired !== 1 ? 'es' : ''} require immediate removal`)
  if (counts.within7  > 0) messages.push(`${counts.within7} batch${counts.within7 !== 1 ? 'es' : ''} expire within 7 days`)
  if (counts.within14 > 0) messages.push(`${counts.within14} batch${counts.within14 !== 1 ? 'es' : ''} expire within 14 days`)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mx-6 mt-4 flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: styles.text }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: styles.text }}>Expiry Alert</p>
            <p className="text-xs mt-0.5" style={{ color: styles.text, opacity: 0.8 }}>
              {messages.join(' · ')}
            </p>
          </div>
          <Link href="/batches" className="flex items-center gap-1 text-xs font-mono flex-shrink-0 transition-opacity hover:opacity-100" style={{ color: styles.text, opacity: 0.8 }}>
            View <ChevronRight className="w-3 h-3" />
          </Link>
          <button onClick={dismiss} className="flex-shrink-0 transition-opacity hover:opacity-100" style={{ color: styles.text, opacity: 0.6 }}>
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
