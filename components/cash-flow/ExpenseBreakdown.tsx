'use client'

import { useMemo } from 'react'
import DonutChart from '@/components/charts/DonutChart'

interface Segment {
  name: string
  value: number
  color: string
}

interface Props {
  data: { category: string; total: number }[]
  formatValue?: (v: number) => string
  height?: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

export default function ExpenseBreakdown({ data, formatValue, height = 220 }: Props) {
  const segments = useMemo(() => {
    const valid = data.filter(d => (d.total ?? 0) > 0).slice(0, 10)
    return valid.map((d, i) => ({
      name: d.category.replace(/_/g, ' '),
      value: Number(d.total),
      color: COLORS[i % COLORS.length],
    }))
  }, [data])

  if (segments.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-xs font-mono text-zinc-600">
        No expense data available
      </div>
    )
  }

  return (
    <DonutChart data={segments} height={height} formatValue={formatValue} />
  )
}
