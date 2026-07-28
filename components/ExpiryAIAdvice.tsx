'use client'

import { useState } from 'react'
import { Bot, Loader2, X, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ExpiryAIAdvice() {
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [advice, setAdvice]  = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)

  async function load() {
    if (advice) { setOpen(v => !v); return }
    setOpen(true)
    setLoading(true)
    try {
      const res  = await fetch('/api/ai/expiry-advice')
      const data = await res.json()
      setAdvice(data.advice ?? data.error ?? 'Could not load recommendations.')
      setProvider(data.provider ?? null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={load}
        className="btn-primary flex items-center gap-2"
      >
        <Bot className="w-4 h-4" />
        AI Recommendations
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full mt-2 w-[480px] glass-card shadow-2xl shadow-black/40 z-30 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-zinc-200">AI Expiry Recommendations</span>
                {provider && <span className="text-[10px] font-mono text-zinc-600">via {provider}</span>}
              </div>
              <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center gap-2 py-4 text-xs font-mono text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing expiry data from database…
                </div>
              ) : (
                <pre className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">{advice}</pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
