'use client'

import { useState } from 'react'
import { AreaChart as ReAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis as ReXAxis, YAxis as ReYAxis, CartesianGrid as ReCartesianGrid, Tooltip as ReTooltip, ResponsiveContainer as ReResponsiveContainer } from 'recharts'

interface DataPoint {
  name: string
  inflow: number
  outflow: number
  net: number
  [key: string]: any
}

interface Props {
  data: DataPoint[]
  type?: 'area' | 'bar'
  height?: number
  formatY?: (v: number) => string
  formatX?: (v: string) => string
}

function CustomTooltip({ active, payload, label, formatY }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: 'var(--shadow-lg)',
    }}>
      <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 6, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill || p.color, fontSize: 11, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: p.fill || p.color }} />
          {p.name}: <strong>{formatY ? formatY(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function CashFlowChart({ data, type = 'area', height = 220, formatY, formatX }: Props) {
  if (type === 'bar') {
    return (
      <ReResponsiveContainer width="100%" height={height}>
        <ReBarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <ReCartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <ReXAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
          <ReYAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={60} tickFormatter={formatY} />
          <ReTooltip content={<CustomTooltip formatY={formatY} />} cursor={{ fill: 'var(--bg-muted)' }} />
          <Bar dataKey="inflow" name="Inflow" fill="var(--accent-emerald)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="outflow" name="Outflow" fill="var(--accent-red)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </ReBarChart>
      </ReResponsiveContainer>
    )
  }

  return (
    <ReResponsiveContainer width="100%" height={height}>
      <ReAreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="grad-inflow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent-emerald)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--accent-emerald)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-outflow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent-red)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--accent-red)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
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
        <Tooltip content={<CustomTooltip formatY={formatY} />} />
        <Area type="monotone" dataKey="inflow" name="Inflow" stroke="var(--accent-emerald)" strokeWidth={2} fill="url(#grad-inflow)" dot={false} activeDot={{ r: 4, fill: 'var(--accent-emerald)', strokeWidth: 0 }} />
        <Area type="monotone" dataKey="outflow" name="Outflow" stroke="var(--accent-red)" strokeWidth={2} fill="url(#grad-outflow)" dot={false} activeDot={{ r: 4, fill: 'var(--accent-red)', strokeWidth: 0 }} />
      </ReAreaChart>
    </ReResponsiveContainer>
  )
}
