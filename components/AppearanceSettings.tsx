'use client'

import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { useTheme, type Theme } from '@/components/ThemeProvider'

const OPTIONS: {
  value: Theme
  icon: typeof Sun
  label: string
  desc: string
  preview: { bg: string; sidebar: string; card: string; text: string; accent: string }
}[] = [
  {
    value: 'light',
    icon:  Sun,
    label: 'Light',
    desc:  'Clean white background, high contrast text',
    preview: { bg: '#f4f6f9', sidebar: '#ffffff', card: '#ffffff', text: '#0f172a', accent: '#2563eb' },
  },
  {
    value: 'dark',
    icon:  Moon,
    label: 'Dark',
    desc:  'Deep zinc background, reduced eye strain',
    preview: { bg: '#09090b', sidebar: '#09090b', card: 'rgba(255,255,255,0.05)', text: '#fafafa', accent: '#3b82f6' },
  },
  {
    value: 'system',
    icon:  Monitor,
    label: 'System',
    desc:  'Follows your operating system preference',
    preview: { bg: 'linear-gradient(135deg,#f4f6f9 50%,#09090b 50%)', sidebar: '#f4f6f9', card: '#ffffff', text: '#0f172a', accent: '#2563eb' },
  },
]

function ThemePreview({
  preview, active,
}: {
  preview: (typeof OPTIONS)[0]['preview']
  active: boolean
}) {
  return (
    <div
      className="rounded-lg overflow-hidden border-2 transition-all duration-150"
      style={{
        borderColor: active ? 'var(--accent-blue)' : 'var(--border)',
        boxShadow:   active ? `0 0 0 3px var(--accent-blue-bg)` : 'none',
      }}
    >
      {/* Mini app chrome */}
      <div className="flex" style={{ height: 72, background: preview.bg }}>
        {/* Sidebar strip */}
        <div className="w-10 h-full" style={{ background: preview.sidebar, borderRight: '1px solid rgba(0,0,0,0.08)' }} />
        {/* Content area */}
        <div className="flex-1 p-2 space-y-1.5">
          {/* Top bar */}
          <div className="h-2.5 rounded" style={{ background: `${preview.accent}22`, width: '60%' }} />
          {/* Cards */}
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="flex-1 rounded"
                style={{ height: 18, background: preview.card, border: '1px solid rgba(0,0,0,0.06)' }}
              />
            ))}
          </div>
          {/* Table row mockup */}
          <div className="rounded" style={{ height: 10, background: preview.card, border: '1px solid rgba(0,0,0,0.06)', opacity: 0.8 }} />
          <div className="rounded" style={{ height: 10, background: preview.card, border: '1px solid rgba(0,0,0,0.06)', opacity: 0.5 }} />
        </div>
      </div>
    </div>
  )
}

export default function AppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--accent-blue-bg)', border: '1px solid var(--accent-blue-border)' }}
        >
          {resolvedTheme === 'dark'
            ? <Moon className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
            : <Sun  className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
          }
        </div>
        <div>
          <h2 className="text-sm font-semibold">Appearance</h2>
          <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Customize how WAYU looks on your device
          </p>
        </div>
      </div>

      {/* Theme cards */}
      <div className="grid grid-cols-3 gap-3">
        {OPTIONS.map(opt => {
          const active = theme === opt.value
          const Icon   = opt.icon

          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className="text-left space-y-2.5 p-0 bg-transparent border-0 cursor-pointer group"
            >
              <ThemePreview preview={opt.preview} active={active} />

              <div className="flex items-center gap-1.5 px-0.5">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background:   active ? 'var(--accent-blue)' : 'var(--bg-muted)',
                    border:       `1px solid ${active ? 'var(--accent-blue)' : 'var(--border-strong)'}`,
                  }}
                >
                  {active && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div>
                  <p className="text-xs font-medium leading-none" style={{ color: active ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                    {opt.label}
                  </p>
                </div>
              </div>

              <p className="text-[10px] font-mono px-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {opt.desc}
              </p>
            </button>
          )
        })}
      </div>

      {/* Current status */}
      <div
        className="mt-4 pt-4 flex items-center gap-2 text-xs font-mono"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--accent-emerald)' }}
        />
        Currently using <strong style={{ color: 'var(--text-secondary)' }}>{resolvedTheme}</strong> theme
        {theme === 'system' && (
          <span style={{ color: 'var(--text-muted)' }}>&nbsp;(system preference)</span>
        )}
      </div>
    </div>
  )
}
