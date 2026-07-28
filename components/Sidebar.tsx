'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/components/SidebarProvider'
import {
  FlaskConical, LayoutDashboard, Package, ArrowLeftRight,
  MapPin, FlaskRound, Shield, FileBarChart, HardDrive, Settings,
  LogOut, Bot, Zap, Building2, ShoppingCart, BarChart3,
  ShoppingBag, Users, Receipt, TrendingUp, Percent, Landmark,
  FileSpreadsheet, ShieldCheck,
  Wallet, ArrowDownToLine, ArrowUpFromLine, CircleDollarSign, Target,
  CreditCard, FileText, AlertTriangle,
  UserCheck, FileCheck, CalendarDays, ClipboardList,
  X, ChevronDown, Info,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { logoutAction } from '@/app/actions'
import OCRScanner from '@/components/OCRScanner'
import TipsTrigger from '@/components/TipsTrigger'

const NAV = [
  { href: '/dashboard',       label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/analytics',       label: 'Analytics',       icon: BarChart3 },
  { href: '/inventory',       label: 'Inventory',       icon: Package },
  { href: '/movements',       label: 'Movements',       icon: ArrowLeftRight },
  { href: '/batches',         label: 'Expiry',          icon: FlaskRound },
  { href: '/suppliers',       label: 'Suppliers',       icon: Building2 },
  { href: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
  { href: '/locations',       label: 'Locations',       icon: MapPin },
  { href: '/reports',         label: 'Reports',         icon: FileBarChart },
]

const FINANCE_NAV = [
  { href: '/gross-profit',       label: 'Gross Profit',  icon: TrendingUp },
  { href: '/commission',         label: 'Commission',    icon: Percent },
  { href: '/commission/performance', label: 'Salesperson Performance', icon: Users },
  { href: '/weekly-gp',          label: 'Weekly GP',     icon: BarChart3 },
  { href: '/sales-plan',         label: 'Sales Plan',    icon: ShoppingBag },
  { href: '/ar',                 label: 'AR / Credit',   icon: Receipt },
  { href: '/expenses',           label: 'Expenses',      icon: Landmark },
  { href: '/bank-reconciliation',label: 'Bank Rec',      icon: FileSpreadsheet },
]

const CASH_FLOW_NAV = [
  { href: '/cash-flow',                label: 'Cash Position',    icon: Wallet },
  { href: '/cash-flow/bank-accounts',  label: 'Bank Accounts',    icon: Building2 },
  { href: '/cash-flow/inflows',        label: 'Inflows',          icon: ArrowDownToLine },
  { href: '/cash-flow/outflows',       label: 'Outflows',         icon: ArrowUpFromLine },
  { href: '/cash-flow/transfers',      label: 'Transfers',        icon: ArrowLeftRight },
  { href: '/cash-flow/budgets',        label: 'Budgets',          icon: Target },
  { href: '/cash-flow/loans',          label: 'Loans',            icon: CircleDollarSign },
  { href: '/cash-flow/investments',    label: 'Investments',      icon: TrendingUp },
  { href: '/cash-flow/reports',        label: 'Cash Flow Reports', icon: FileBarChart },
]

const POS_NAV = [
  { href: '/pos',       label: 'POS',       icon: ShoppingBag },
  { href: '/sales',     label: 'Sales',     icon: Receipt },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/import-export', label: 'Import / Export', icon: FileSpreadsheet },
]

const AI_NAV = [
  { href: '/ai-report', label: 'AI Report', icon: Bot },
]

const ADMIN_NAV = [
  { href: '/audit',    label: 'Audit Log', icon: Shield },
  { href: '/backup',   label: 'Backups',   icon: HardDrive },
  { href: '/settings', label: 'Settings',  icon: Settings },
  { href: '/trust-verification', label: 'Trust Verify', icon: ShieldCheck },
]

const CREDIT_NAV = [
  { href: '/credit',                label: 'Credit Dashboard',  icon: Wallet },
  { href: '/credit/profiles',       label: 'Credit Profiles',   icon: UserCheck },
  { href: '/credit/applications',   label: 'Applications',      icon: FileCheck },
  { href: '/credit/aging',          label: 'Aging Report',      icon: CalendarDays },
  { href: '/credit/collections',    label: 'Collections',       icon: ClipboardList },
  { href: '/credit/reports',        label: 'Credit Reports',    icon: FileBarChart },
]

type Accent = 'blue' | 'emerald' | 'purple'

function NavLink({
  href, label, icon: Icon, accent = 'blue',
}: {
  href: string; label: string; icon: any; accent?: Accent
}) {
  const path   = usePathname()
  const active = path === href || path.startsWith(href + '/')

  const activeColors: Record<Accent, { bg: string; color: string; border: string; dot: string }> = {
    blue: {
      bg:     'var(--accent-blue-bg)',
      color:  'var(--accent-blue)',
      border: 'var(--accent-blue-border)',
      dot:    'var(--accent-blue)',
    },
    emerald: {
      bg:     'var(--accent-emerald-bg)',
      color:  'var(--accent-emerald)',
      border: 'var(--accent-emerald-border)',
      dot:    'var(--accent-emerald)',
    },
    purple: {
      bg:     'var(--accent-purple-bg)',
      color:  'var(--accent-purple)',
      border: 'var(--accent-purple-border)',
      dot:    'var(--accent-purple)',
    },
  }

  const ac = activeColors[accent]

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-120"
      style={{
        color:      active ? ac.color : 'var(--text-secondary)',
        background: active ? ac.bg    : 'transparent',
        border:     `1px solid ${active ? ac.border : 'transparent'}`,
      }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
      {active && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full"
          style={{ background: ac.dot }}
        />
      )}
    </Link>
  )
}

function SectionHeader({
  label, icon: Icon, color, isOpen, onToggle,
}: {
  label: string
  icon: any
  color: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="nav-section-label flex items-center gap-1.5 mt-2 w-full text-left"
    >
      <Icon className="w-3 h-3" style={{ color }} />
      <span className="flex-1">{label}</span>
      <ChevronDown
        className="w-3 h-3 transition-transform duration-200"
        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--text-muted)' }}
      />
    </button>
  )
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024)
    const handler = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isDesktop
}

export default function Sidebar() {
  const { data: session } = useSession()
  const { isOpen, setOpen } = useSidebar()
  const isDesktop = useIsDesktop()
  const role = session?.user.role ?? ''
  const isAdmin = role === 'ADMIN'
  const showFinance = ['ADMIN', 'FINANCE', 'CREDIT_OFFICER', 'SALES'].includes(role)
  const showCashFlow = ['ADMIN', 'FINANCE'].includes(role)
  const showInventory = ['ADMIN', 'INVENTORY'].includes(role)
  const showPOS = ['ADMIN', 'SALES'].includes(role)
  const showAI = ['ADMIN', 'STAFF', 'FINANCE'].includes(role)
  const showCredit = ['ADMIN', 'FINANCE', 'CREDIT_OFFICER', 'SALES'].includes(role)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    main: true,
    pos: false,
    finance: false,
    cashFlow: false,
    credit: false,
    ai: false,
    admin: false,
  })

  useEffect(() => {
    setOpenSections({
      main: true,
      pos: isDesktop,
      finance: isDesktop,
      cashFlow: isDesktop,
      credit: isDesktop,
      ai: isDesktop,
      admin: isDesktop,
    })
  }, [isDesktop])

  function toggleSection(key: string) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-56 flex-shrink-0 flex flex-col
          transform transition-transform duration-200 ease-out
          lg:static lg:translate-x-0 lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          background:   'var(--bg-sidebar)',
          borderRight:  '1px solid var(--border)',
        }}
      >
        <div
          className="h-14 flex items-center gap-2.5 px-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: 'var(--accent-blue-bg)',
              border:     '1px solid var(--accent-blue-border)',
            }}
          >
            <FlaskConical className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
              WAYU
            </p>
            <p className="text-[10px] font-mono tracking-widest uppercase leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Inventory
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="nav-section-label">Main</p>
        {NAV.map(n => <NavLink key={n.href} {...n} />)}

        {showPOS && (
          <div>
            <SectionHeader label="Point of Sale" icon={ShoppingBag} color="var(--accent-emerald)" isOpen={openSections.pos} onToggle={() => toggleSection('pos')} />
            <div
              className="overflow-hidden transition-all duration-200 ease-in-out"
              style={{
                maxHeight: openSections.pos ? '500px' : '0px',
                opacity: openSections.pos ? 1 : 0,
              }}
            >
              {POS_NAV.map(n => <NavLink key={n.href} {...n} accent="emerald" />)}
            </div>
          </div>
        )}

        {showFinance && (
          <div>
            <SectionHeader label="Finance" icon={TrendingUp} color="var(--accent-emerald)" isOpen={openSections.finance} onToggle={() => toggleSection('finance')} />
            <div
              className="overflow-hidden transition-all duration-200 ease-in-out"
              style={{
                maxHeight: openSections.finance ? '500px' : '0px',
                opacity: openSections.finance ? 1 : 0,
              }}
            >
              {FINANCE_NAV.map(n => <NavLink key={n.href} {...n} accent="emerald" />)}
            </div>
          </div>
        )}

        {showCashFlow && (
          <div>
            <SectionHeader label="Cash Flow" icon={Wallet} color="var(--accent-blue)" isOpen={openSections.cashFlow} onToggle={() => toggleSection('cashFlow')} />
            <div
              className="overflow-hidden transition-all duration-200 ease-in-out"
              style={{
                maxHeight: openSections.cashFlow ? '500px' : '0px',
                opacity: openSections.cashFlow ? 1 : 0,
              }}
            >
              {CASH_FLOW_NAV.map(n => <NavLink key={n.href} {...n} accent="blue" />)}
            </div>
          </div>
        )}

        {showCredit && (
          <div>
            <SectionHeader label="Credit Management" icon={CreditCard} color="var(--accent-blue)" isOpen={openSections.credit} onToggle={() => toggleSection('credit')} />
            <div
              className="overflow-hidden transition-all duration-200 ease-in-out"
              style={{
                maxHeight: openSections.credit ? '500px' : '0px',
                opacity: openSections.credit ? 1 : 0,
              }}
            >
              {CREDIT_NAV.map(n => <NavLink key={n.href} {...n} accent="blue" />)}
            </div>
          </div>
        )}

        {showAI && (
          <div>
            <SectionHeader label="AI Features" icon={Zap} color="var(--accent-blue)" isOpen={openSections.ai} onToggle={() => toggleSection('ai')} />
            <div
              className="overflow-hidden transition-all duration-200 ease-in-out"
              style={{
                maxHeight: openSections.ai ? '500px' : '0px',
                opacity: openSections.ai ? 1 : 0,
              }}
            >
              {AI_NAV.map(n => <NavLink key={n.href} {...n} />)}
            </div>
          </div>
        )}

        <div className="px-1 mt-1">
          <OCRScanner />
        </div>

        {isAdmin && (
          <div>
            <SectionHeader label="Admin" icon={Shield} color="var(--accent-purple)" isOpen={openSections.admin} onToggle={() => toggleSection('admin')} />
            <div
              className="overflow-hidden transition-all duration-200 ease-in-out"
              style={{
                maxHeight: openSections.admin ? '500px' : '0px',
                opacity: openSections.admin ? 1 : 0,
              }}
            >
              {ADMIN_NAV.map(n => <NavLink key={n.href} {...n} accent="purple" />)}
            </div>
          </div>
        )}
      </nav>

      <div className="p-2 flex-shrink-0 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
        <TipsTrigger />
        <button
          onClick={async () => {
            await logoutAction()
            signOut({ callbackUrl: '/login' })
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.color      = 'var(--accent-red)'
            el.style.background = 'var(--accent-red-bg)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.color      = 'var(--text-muted)'
            el.style.background = 'transparent'
          }}
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
    </>
  )
}
