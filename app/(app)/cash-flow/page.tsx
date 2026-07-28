import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StatCard from '@/components/StatCard'
import {
  Wallet, TrendingUp, TrendingDown, ArrowLeftRight, Target,
  PlusCircle, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight as ArrowTransfer,
  PiggyBank, Receipt, Building2,
} from 'lucide-react'

function formatCurrency(n: number) {
  return 'ETB ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function CashFlowDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today.getTime() + 86400000)

  const [
    bankAccounts,
    todayInflows,
    todayOutflows,
    totalBudgetPlanned,
    totalBudgetActual,
    recentInflows,
    recentOutflows,
  ] = await Promise.all([
    prisma.bankAccount.findMany({ where: { isActive: true }, orderBy: { accountName: 'asc' } }),
    prisma.cashInflow.aggregate({ where: { receivedAt: { gte: today, lt: tomorrow } }, _sum: { amount: true } }),
    prisma.cashOutflow.aggregate({ where: { paidAt: { gte: today, lt: tomorrow } }, _sum: { amount: true } }),
    prisma.budget.aggregate({ _sum: { plannedAmount: true } }),
    prisma.cashOutflow.aggregate({ where: { paidAt: { gte: today, lt: tomorrow } }, _sum: { amount: true } }),
    prisma.cashInflow.findMany({
      where: { receivedAt: { gte: today, lt: tomorrow } },
      take: 10, orderBy: { receivedAt: 'desc' },
      include: { bankAccount: { select: { accountName: true } }, createdBy: { select: { name: true } } },
    }),
    prisma.cashOutflow.findMany({
      where: { paidAt: { gte: today, lt: tomorrow } },
      take: 10, orderBy: { paidAt: 'desc' },
      include: { bankAccount: { select: { accountName: true } }, createdBy: { select: { name: true } } },
    }),
  ])

  const totalBankBalance = bankAccounts.reduce((s, a) => s + Number(a.currentBalance), 0)
  const inflowTotal = Number(todayInflows._sum?.amount ?? 0)
  const outflowTotal = Number(todayOutflows._sum?.amount ?? 0)
  const netCashFlow = inflowTotal - outflowTotal
  const budgetPlanned = Number(totalBudgetPlanned._sum?.plannedAmount ?? 0)
  const budgetUtilization = budgetPlanned > 0 ? ((outflowTotal / budgetPlanned) * 100) : 0

  const combinedTransactions = [
    ...recentInflows.map(t => ({ ...t, type: 'inflow' as const, date: new Date(t.receivedAt) })),
    ...recentOutflows.map(t => ({ ...t, type: 'outflow' as const, date: new Date(t.paidAt) })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Cash Position</h1>
        <p className="text-sm text-zinc-500 font-mono mt-0.5">
          {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Bank Balances" value={formatCurrency(totalBankBalance)} subtitle={`${bankAccounts.length} active accounts`} icon={Wallet} accent="blue" />
        <StatCard title="Today's Inflow" value={formatCurrency(inflowTotal)} subtitle="Cash received today" icon={TrendingUp} accent="emerald" />
        <StatCard title="Today's Outflow" value={formatCurrency(outflowTotal)} subtitle="Cash paid today" icon={TrendingDown} accent="red" />
        <StatCard title="Net Cash Flow" value={formatCurrency(Math.abs(netCashFlow))} subtitle={netCashFlow >= 0 ? 'Positive' : 'Negative'} icon={ArrowLeftRight} accent={netCashFlow >= 0 ? 'emerald' : 'red'} />
        <StatCard title="Budget Utilization" value={`${budgetUtilization.toFixed(1)}%`} subtitle={`of ${formatCurrency(budgetPlanned)} planned`} icon={Target} accent={budgetUtilization > 100 ? 'red' : 'amber'} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/cash-flow/inflows" className="glass-card p-4 hover:border-white/10 transition-colors group flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">New Inflow</p>
            <p className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-500">Record cash received</p>
          </div>
        </Link>
        <Link href="/cash-flow/outflows" className="glass-card p-4 hover:border-white/10 transition-colors group flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <ArrowUpFromLine className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">New Outflow</p>
            <p className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-500">Record cash paid</p>
          </div>
        </Link>
        <Link href="/cash-flow/transfers" className="glass-card p-4 hover:border-white/10 transition-colors group flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <ArrowTransfer className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">New Transfer</p>
            <p className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-500">Move between accounts</p>
          </div>
        </Link>
        <Link href="/cash-flow/budgets" className="glass-card p-4 hover:border-white/10 transition-colors group flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <PiggyBank className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">New Budget</p>
            <p className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-500">Set budget targets</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Bank Accounts</h2>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">{bankAccounts.length} active</p>
            </div>
            <Link href="/cash-flow/bank-accounts" className="text-xs font-mono text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {bankAccounts.map(acct => (
              <div key={acct.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02]">
                <div>
                  <p className="text-sm text-zinc-200">{acct.accountName}</p>
                  <p className="text-[10px] font-mono text-zinc-600">{acct.bankName} · {acct.accountType.replace('_', ' ')}</p>
                </div>
                <p className="stat-num text-sm" style={{ color: Number(acct.currentBalance) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>{formatCurrency(Number(acct.currentBalance))}</p>
              </div>
            ))}
            {bankAccounts.length === 0 && (
              <div className="py-10 text-center text-xs font-mono text-zinc-600">No bank accounts configured.</div>
            )}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Recent Transactions</h2>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">Last {combinedTransactions.length} today</p>
            </div>
            <Link href="/cash-flow/reports" className="text-xs font-mono text-blue-400 hover:text-blue-300">Reports →</Link>
          </div>
          {combinedTransactions.length > 0 ? (
            <div className="divide-y divide-zinc-800/50">
              {combinedTransactions.map(tx => (
                <div key={tx.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${tx.type === 'inflow' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                      {tx.type === 'inflow' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-200">{(tx as any).bankAccount?.accountName ?? '—'}</p>
                      <p className="text-[10px] font-mono text-zinc-600">{(tx as any).category?.replace('_', ' ') ?? (tx.type === 'inflow' ? 'Inflow' : 'Outflow')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className={`stat-num text-sm ${tx.type === 'inflow' ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(Number((tx as any).amount))}</p>
                    <p className="text-[10px] font-mono text-zinc-600">{(tx as any).createdBy?.name ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs font-mono text-zinc-600">No transactions recorded today.</div>
          )}
        </div>
      </div>
    </div>
  )
}
