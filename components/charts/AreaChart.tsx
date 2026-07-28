'use client'

import {
  AreaChart as ReAreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

interface Series {
  key: string; label: string; color: string; type?: 'monotone' | 'linear'
}

interface Props {
  data: Record<string, any>[]
  series: Series[]
  xKey?: string
  height?: number
  format?: 'currency' | 'units' | 'number'
}

function CustomTooltip({ active, payload, label, format }: any) {
  if (!active || !payload?.length) return null
  const formatY = (v: number) => {
    if (format === 'currency') return `ETB ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
    if (format === 'units') return `${v} units`
    return String(v)
  }
  return (
    <div style={{
      background:   'var(--bg-card)',
      border:       '1px solid var(--border)',
      borderRadius: 10,
      padding:      '10px 14px',
      boxShadow:    'var(--shadow-lg)',
    }}>
      <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, fontSize: 11, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          {p.name}: <strong>{formatY(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

export default function AreaChart({ data, series, xKey = 'date', height = 220, format = 'number' }: Props) {
  const formatY = (v: number) => {
    if (format === 'currency') return `ETB ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
    if (format === 'units') return `${v} units`
    return String(v)
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReAreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          {series.map(s => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={s.color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={false} tickLine={false}
          tickFormatter={formatX}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={false} tickLine={false} width={60}
          tickFormatter={formatY}
        />
        <Tooltip content={<CustomTooltip format={format} />} />
        {series.map(s => (
          <Area
            key={s.key}
            type={s.type ?? 'monotone'}
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
            dot={false}
            activeDot={{ r: 4, fill: s.color, strokeWidth: 0 }}
          />
        ))}
      </ReAreaChart>
    </ResponsiveContainer>
  )
}
