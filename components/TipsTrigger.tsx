'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import TipsOverlay from './TipsOverlay'
import { hasSeenTips } from '@/lib/tips-utils'

export default function TipsTrigger() {
  const [open, setOpen] = useState(false)
  const seen = hasSeenTips()

  return (
    <>
      <div className="px-2">
        <button
          onClick={() => setOpen(true)}
          title="How to Use"
          className="relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.color = 'var(--accent-blue)'
            el.style.background = 'var(--accent-blue-bg)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.color = 'var(--text-muted)'
            el.style.background = 'transparent'
          }}
        >
          <Info className="w-4 h-4" />
          <span>How to Use</span>
          {!seen && (
            <span className="ml-auto w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>
      </div>
      <TipsOverlay isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
