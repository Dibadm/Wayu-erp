'use client'

import { ReactNode } from 'react'
import Link from 'next/link'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  cta?: { label: string; href: string }
  className?: string
}

export default function EmptyState({ icon, title, description, cta, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className}`}>
      {icon && (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
          {icon}
        </div>
      )}
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
      {description && (
        <p className="text-xs font-mono max-w-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
      )}
      {cta && (
        <Link
          href={cta.href}
          className="mt-2 px-4 py-2 rounded-lg text-xs font-mono transition-colors"
          style={{ background: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue-border)' }}
        >
          {cta.label}
        </Link>
      )}
    </div>
  )
}
