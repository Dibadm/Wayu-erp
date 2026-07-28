'use client'

import { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}

export default function ChartCard({ title, subtitle, children, action, className = '' }: Props) {
  return (
    <div className={`glass-card overflow-hidden ${className}`}>
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
