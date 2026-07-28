import { LucideIcon } from 'lucide-react'

interface Props {
  title:    string
  value:    string
  subtitle: string
  icon:     LucideIcon
  accent?:  'blue' | 'emerald' | 'amber' | 'red'
  alert?:   boolean
}

// CSS-var driven accents — work in both light and dark themes
const ACCENT: Record<string, { bg: string; border: string; iconColor: string; numColor: string }> = {
  blue:    { bg: 'var(--accent-blue-bg)',    border: 'var(--accent-blue-border)',    iconColor: 'var(--accent-blue)',    numColor: 'var(--accent-blue)'    },
  emerald: { bg: 'var(--accent-emerald-bg)', border: 'var(--accent-emerald-border)', iconColor: 'var(--accent-emerald)', numColor: 'var(--accent-emerald)' },
  amber:   { bg: 'var(--accent-amber-bg)',   border: 'var(--accent-amber-border)',   iconColor: 'var(--accent-amber)',   numColor: 'var(--accent-amber)'   },
  red:     { bg: 'var(--accent-red-bg)',     border: 'var(--accent-red-border)',     iconColor: 'var(--accent-red)',     numColor: 'var(--accent-red)'     },
}

export default function StatCard({ title, value, subtitle, icon: Icon, accent = 'blue', alert }: Props) {
  const c = ACCENT[accent]
  return (
    <div
      className="glass-card p-5 transition-all duration-200"
      style={alert ? { borderColor: 'var(--accent-red-border)' } : undefined}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}
        >
          <Icon className="w-4 h-4" style={{ color: c.iconColor }} />
        </div>
        {alert && (
          <span
            className="w-2 h-2 rounded-full animate-pulse-slow mt-1"
            style={{ background: 'var(--accent-red)' }}
          />
        )}
      </div>
      <p className="text-2xl stat-num" style={{ color: c.numColor }}>{value}</p>
      <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
    </div>
  )
}
