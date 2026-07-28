'use client'

import { useState } from 'react'
import { Bot, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDate } from '@/lib/utils'

interface Props {
  period: string
  from?: string
  to?: string
}

export default function AIAnalyticsReport({ period, from, to }: Props) {
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [report, setReport]     = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [genAt, setGenAt]       = useState<string | null>(null)
  const [error, setError]       = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ period })
      if (from) params.set('from', from)
      if (to)   params.set('to', to)

      const res  = await fetch(`/api/ai/analytics-report?${params}`)
      const data = await res.json()

      if (!res.ok) { setError(data.error ?? 'Failed to generate report'); return }
      setReport(data.report)
      setProvider(data.provider)
      setGenAt(data.generatedAt)
      setOpen(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header — always visible */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">AI Analytics Report</h3>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">
              {genAt ? `Generated ${formatDate(genAt)}${provider ? ` · via ${provider}` : ''}` : 'Executive summary with business insights'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error && <p className="text-xs font-mono text-red-400">{error}</p>}
          <button
            onClick={generate}
            disabled={loading}
            className="btn-primary flex items-center gap-2 text-xs"
          >
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating…</>
              : report
                ? <><RefreshCw className="w-3.5 h-3.5" />Regenerate</>
                : <><Bot className="w-3.5 h-3.5" />Generate AI Report</>
            }
          </button>
          {report && (
            <button
              onClick={() => setOpen(v => !v)}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Collapsible report body */}
      <AnimatePresence initial={false}>
        {open && report && (
          <motion.div
            key="report"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-800 px-5 py-5">
              <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-relaxed">{report}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
