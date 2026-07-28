'use client'

import { useState } from 'react'

interface BudgetProgressProps {
  category: string
  planned: number
  actual: number
  formatCurrency?: (n: number) => string
}

export default function BudgetProgress({ category, planned, actual, formatCurrency = (n) => 'ETB ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 }) }: BudgetProgressProps) {
  const [hovered, setHovered] = useState(false)
  const pct = planned > 0 ? Math.min((actual / planned) * 100, 100) : 0
  const overBudget = actual > planned
  const variance = planned - actual

  return (
    <div
      className="space-y-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{category.replace(/_/g, ' ')}</span>
        <span className="text-[10px] font-mono text-zinc-600">
          {hovered ? `${pct.toFixed(1)}%` : `${formatCurrency(actual)} / ${formatCurrency(planned)}`}
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: overBudget ? 'var(--accent-red)' : 'var(--accent-emerald)',
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-zinc-600">
          Variance: {formatCurrency(Math.abs(variance))} ({variance >= 0 ? 'under' : 'over'})
        </span>
        {overBudget && (
          <span className="text-[10px] font-mono text-red-400">Over budget</span>
        )}
      </div>
    </div>
  )
}
