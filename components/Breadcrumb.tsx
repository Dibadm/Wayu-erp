'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const PATH_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  movements: 'Movements',
  batches: 'Batches & Expiry',
  pos: 'POS',
  sales: 'Sales',
  reports: 'Reports',
  settings: 'Settings',
  credit: 'Credit',
  customers: 'Customers',
  suppliers: 'Suppliers',
  'purchase-orders': 'Purchase Orders',
  locations: 'Locations',
  analytics: 'Analytics',
  bank: 'Bank Accounts',
  expenses: 'Expenses',
  loans: 'Loans',
  investments: 'Investments',
  ai: 'AI Features',
  'ai-report': 'AI Report',
}

function formatSegment(segment: string): string {
  return PATH_LABELS[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function Breadcrumb({ productName }: { productName?: string }) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1
    const label = isLast && productName ? productName : formatSegment(segment)
    return { href, label, isLast }
  })

  if (crumbs.length <= 1) return null

  return (
    <nav className="flex items-center gap-1.5 text-xs font-mono mb-4" style={{ color: 'var(--text-muted)' }}>
      <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">
        Home
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3" />
          {crumb.isLast ? (
            <span style={{ color: 'var(--text-primary)' }}>{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-zinc-300 transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
