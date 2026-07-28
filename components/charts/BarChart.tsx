'use client'

import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

interface Props {
  data: Record<string, any>[]
  bars: { key: string; label: string; color: string }[]
  xKey?: string
  height?: number
  layout?: 'horizontal' | 'vertical'
  formatY?: (v: number) => string
  formatX?: (v: string) => string
}

function CustomTooltip({ active, payload, label, formatY }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:   'var(--bg-card)',
      border:       '1px solid var(--border)',
      borderRadius: 10,
      padding:      '10px 14px',
      boxShadow:    'var(--shadow-lg)',
    }}>
      <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 6, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill, fontSize: 11, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: p.fill }} />
          {p.name}: <strong>{formatY ? formatY(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function BarChart({ data, bars, xKey = 'name', height = 220, layout = 'horizontal', formatY, formatX }: Props) {
  const isVertical = layout === 'vertical'
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} layout={isVertical ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={!isVertical} vertical={isVertical} />
        {isVertical ? (
          <>
            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={formatY} />
            <YAxis type="category" dataKey={xKey} tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={120}
              tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 16) + '…' : v} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false}
              tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + '…' : (formatX ? formatX(v) : v)} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={60} tickFormatter={formatY} />
          </>
        )}
        <Tooltip content={<CustomTooltip formatY={formatY} />} cursor={{ fill: 'var(--bg-muted)' }} />
        {bars.map(b => (
          <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  )
}
