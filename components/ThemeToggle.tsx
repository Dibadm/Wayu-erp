'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type Theme } from '@/components/ThemeProvider'
import { useState, useRef, useEffect } from 'react'

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light',  icon: Sun,     label: 'Light'  },
  { value: 'dark',   icon: Moon,    label: 'Dark'   },
  { value: 'system', icon: Monitor, label: 'System' },
]

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
        style={{
          color: 'var(--text-muted)',
          background: open ? 'var(--bg-muted)' : 'transparent',
          border: '1px solid transparent',
        }}
        title="Switch theme"
      >
        <CurrentIcon className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 rounded-xl overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: '140px',
          }}
        >
          {OPTIONS.map(({ value, icon: Icon, label }) => {
            const active = theme === value
            return (
              <button
                key={value}
                onClick={() => { setTheme(value); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                style={{
                  color:      active ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  background: active ? 'var(--accent-blue-bg)' : 'transparent',
                  fontWeight: active ? '500' : '400',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-blue)' }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
