'use client'

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  value: string
  subtitle?: string
  trend?: number        // % change vs prior period
  icon: LucideIcon
  accent?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'rose'
  scoreBar?: number     // 0-100 for health scores
}

const ACCENT = {
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: 'text-blue-400',    val: 'text-blue-100'    },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', val: 'text-emerald-100' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: 'text-amber-400',   val: 'text-amber-100'   },
  red:     { bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: 'text-red-400',     val: 'text-red-100'     },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  icon: 'text-purple-400',  val: 'text-purple-100'  },
  rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    icon: 'text-rose-400',    val: 'text-rose-100'    },
}

const SCORE_COLOR = (n: number) =>
  n >= 70 ? 'bg-emerald-500' : n >= 40 ? 'bg-amber-500' : 'bg-red-500'

export default function AnalyticsKPICard({ title, value, subtitle, trend, icon: Icon, accent = 'blue', scoreBar }: Props) {
  const c = ACCENT[accent]

  const TrendIcon   = trend === undefined || trend === 0 ? Minus : trend > 0 ? TrendingUp : TrendingDown
  const trendColor  = trend === undefined || trend === 0 ? 'text-zinc-500' : trend > 0 ? 'text-emerald-400' : 'text-red-400'
  const trendLabel  = trend === undefined ? '' : trend === 0 ? 'no change' : `${trend > 0 ? '+' : ''}${trend}% vs prior`

  return (
    <div className={cn('glass-card p-5 hover:border-white/10 transition-colors duration-200')}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center border', c.bg, c.border)}>
          <Icon className={cn('w-4 h-4', c.icon)} />
        </div>
        {trend !== undefined && (
          <div className={cn('flex items-center gap-1 text-[10px] font-mono', trendColor)}>
            <TrendIcon className="w-3 h-3" />
            {trendLabel}
          </div>
        )}
      </div>

      <p className={cn('text-2xl stat-num', c.val)}>{value}</p>
      <p className="text-xs font-medium text-zinc-400 mt-1">{title}</p>
      {subtitle && <p className="text-[11px] font-mono text-zinc-600 mt-0.5">{subtitle}</p>}

      {/* Health score bar */}
      {scoreBar !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', SCORE_COLOR(scoreBar))}
              style={{ width: `${scoreBar}%` }}
            />
          </div>
          <p className="text-[10px] font-mono text-zinc-600 mt-1">{scoreBar}/100</p>
        </div>
      )}
    </div>
  )
}
