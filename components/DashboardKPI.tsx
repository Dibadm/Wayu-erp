import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendIndicator {
  direction: 'up' | 'down' | 'neutral'
  value: string
}

interface Props {
  label: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  accent: 'blue' | 'emerald' | 'amber' | 'red' | 'purple'
  trend?: TrendIndicator
  isZero?: boolean
  valueMono?: boolean
  valueSize?: 'lg' | 'xl' | '2xl'
}

const ACCENT: Record<Props['accent'], { iconBg: string; iconBorder: string; iconColor: string; numColor: string }> = {
  blue:    { iconBg: 'var(--accent-blue-bg)',    iconBorder: 'var(--accent-blue-border)',    iconColor: 'var(--accent-blue)',    numColor: 'var(--accent-blue)'    },
  emerald: { iconBg: 'var(--accent-emerald-bg)', iconBorder: 'var(--accent-emerald-border)', iconColor: 'var(--accent-emerald)', numColor: 'var(--accent-emerald)' },
  amber:   { iconBg: 'var(--accent-amber-bg)',   iconBorder: 'var(--accent-amber-border)',   iconColor: 'var(--accent-amber)',   numColor: 'var(--accent-amber)'   },
  red:     { iconBg: 'var(--accent-red-bg)',     iconBorder: 'var(--accent-red-border)',     iconColor: 'var(--accent-red)',     numColor: 'var(--accent-red)'     },
  purple:  { iconBg: 'var(--accent-purple-bg)',  iconBorder: 'var(--accent-purple-border)',  iconColor: 'var(--accent-purple)',  numColor: 'var(--accent-purple)'  },
}

const TrendIcon: Record<TrendIndicator['direction'], LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
}

const VALUE_SIZE: Record<NonNullable<Props['valueSize']>, string> = {
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
}

export default function DashboardKPI({
  label,
  value,
  subtitle,
  icon: Icon,
  accent = 'blue',
  trend,
  isZero = false,
  valueMono = true,
  valueSize = '2xl',
}: Props) {
  const c = ACCENT[accent]
  const zeroState = isZero

  return (
    <div
      className={cn(
        'glass-card p-5 transition-all duration-200',
        zeroState && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: c.iconBg, border: `1px solid ${c.iconBorder}` }}
        >
          <Icon className="w-4 h-4" style={{ color: c.iconColor }} />
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 text-[10px] font-mono"
            style={{
              color: trend.direction === 'up'
                ? 'var(--accent-emerald)'
                : trend.direction === 'down'
                ? 'var(--accent-red)'
                : 'var(--text-muted)',
            }}
          >
            {(() => {
              const TI = TrendIcon[trend.direction]
              return <TI className="w-3 h-3" />
            })()}
            {trend.value}
          </div>
        )}
      </div>
      <p
        className={cn(
          'mt-2',
          VALUE_SIZE[valueSize],
          valueMono && 'stat-num',
        )}
        style={{ color: c.numColor }}
      >
        {value}
      </p>
      <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
    </div>
  )
}
