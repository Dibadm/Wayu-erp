'use client'

import { Info, BookOpen } from 'lucide-react'
import { tips, SECTIONS } from '@/lib/tips'

export default function HowToUseSection({ onShowTips }: { onShowTips: () => void }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-blue-400" />
        <h2 className="text-sm font-semibold text-zinc-100">How to Use</h2>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        Welcome to WAYU Inventory. Use the tips below to get started, or click <strong>Show Tips</strong> for a full walkthrough.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {SECTIONS.slice(0, 6).map(section => {
          const sectionTips = tips.filter(t => t.section === section)
          if (sectionTips.length === 0) return null
          const first = sectionTips[0]
          return (
            <div key={section} className="rounded-lg p-3" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium text-zinc-300 mb-1">{section}</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{first.description}</p>
            </div>
          )
        })}
      </div>
      <button onClick={onShowTips} className="btn-primary text-xs px-4 py-2 flex items-center gap-2">
        <Info className="w-3.5 h-3.5" />
        Show Tips
      </button>
    </div>
  )
}
