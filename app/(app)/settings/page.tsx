import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { Shield, Database } from 'lucide-react'
import AppearanceSettings from '@/components/AppearanceSettings'
import AdminSettings from '@/components/AdminSettings'
import Breadcrumb from '@/components/Breadcrumb'
import HowToUseSectionClient from '@/components/HowToUseSectionClient'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'

  const [userCount, productCount, movementCount] = await Promise.all([
    isAdmin ? prisma.user.count() : Promise.resolve(null),
    prisma.product.count(),
    prisma.movement.count(),
  ])

  const labelCls = 'text-[10px] font-mono uppercase tracking-widest mb-1'
  const sectionIconStyle = { color: 'var(--accent-blue)' }
  const sectionIconStyleGreen = { color: 'var(--accent-emerald)' }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <Breadcrumb />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
          System configuration and account management
        </p>
      </div>

      {/* ── How to Use ── */}
      <HowToUseSectionClient />

      {/* ── Appearance ── */}
      <AppearanceSettings />

      {/* ── Account ── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4" style={sectionIconStyle} />
          <h2 className="text-sm font-semibold">Your Account</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className={labelCls} style={{ color: 'var(--text-muted)' }}>Name</p>
            <p>{(session.user as any)?.name ?? '—'}</p>
          </div>
          <div>
            <p className={labelCls} style={{ color: 'var(--text-muted)' }}>Email</p>
            <p className="font-mono text-sm">{session.user?.email}</p>
          </div>
          <div>
            <p className={labelCls} style={{ color: 'var(--text-muted)' }}>Role</p>
            <span className={`badge ${(session.user as any)?.role === 'ADMIN' ? 'badge-in' : 'badge-warning'}`}>
              {(session.user as any)?.role}
            </span>
          </div>
        </div>
      </div>

      {/* ── Database stats ── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4" style={sectionIconStyleGreen} />
          <h2 className="text-sm font-semibold">Database</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Products',  value: productCount },
            { label: 'Movements', value: movementCount },
            { label: 'Users',     value: userCount ?? '—' },
          ].map(s => (
            <div key={s.label} className="rounded-lg p-3" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
              <p className="stat-num text-xl">{s.value}</p>
              <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Users (admin only) ── */}
      {isAdmin && <AdminSettings />}
    </div>
  )
}

