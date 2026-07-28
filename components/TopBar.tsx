'use client'

import { Bell, Menu } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import GlobalSearch from '@/components/GlobalSearch'
import NotificationCenter from '@/components/NotificationCenter'
import { useSidebar } from '@/components/SidebarProvider'

interface Props {
  user?: { name?: string | null; email?: string | null }
}

export default function TopBar({ user }: Props) {
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? 'U'
  const { setOpen } = useSidebar()

  return (
    <header className="surface-topbar h-14 flex items-center gap-4 px-6 flex-shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
        style={{ color: 'var(--text-muted)', border: '1px solid transparent' }}
      >
        <Menu className="w-5 h-5" />
      </button>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-2">
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notification bell */}
        <NotificationCenter />

        {/* Avatar + user info */}
        <div className="flex items-center gap-2.5 pl-2" style={{ borderLeft: '1px solid var(--border)' }}>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background:   'var(--accent-blue-bg)',
              border:       '1px solid var(--accent-blue-border)',
            }}
          >
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent-blue)' }}>
              {initials}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium leading-none" style={{ color: 'var(--text-primary)' }}>
              {user?.name ?? 'User'}
            </p>
            <p className="text-[10px] font-mono leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
