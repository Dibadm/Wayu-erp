import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Users, TrendingUp, Receipt } from 'lucide-react'
import Breadcrumb from '@/components/Breadcrumb'

export default async function CommissionPerformancePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const role = (session.user as any).role
  if (!['ADMIN', 'FINANCE'].includes(role)) redirect('/dashboard')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const sales = await prisma.sale.findMany({
    where: { status: 'COMPLETED', createdAt: { gte: monthStart }, salespersonId: { not: null } },
    include: {
      salesperson: { select: { id: true, name: true, email: true } },
      items: { select: { commissionAmount: true, lineTotal: true } },
    },
  })

  const map = new Map<string, {
    salespersonId: string
    name: string
    email: string
    totalSales: number
    totalCommission: number
    saleCount: number
  }>()

  for (const sale of sales) {
    const sp = sale.salesperson!
    const key = sp.id
    const entry = map.get(key) ?? {
      salespersonId: sp.id,
      name: sp.name ?? sp.email.split('@')[0],
      email: sp.email,
      totalSales: 0,
      totalCommission: 0,
      saleCount: 0,
    }
    entry.totalSales += Number(sale.items.reduce((s, i) => s + Number(i.lineTotal), 0))
    entry.totalCommission += Number(sale.items.reduce((s, i) => s + Number(i.commissionAmount), 0))
    entry.saleCount += 1
    map.set(key, entry)
  }

  const rows = Array.from(map.values()).sort((a, b) => b.totalCommission - a.totalCommission)

  const totalCommission = rows.reduce((s, r) => s + r.totalCommission, 0)
  const totalSales = rows.reduce((s, r) => s + r.totalSales, 0)
  const totalSalesCount = rows.reduce((s, r) => s + r.saleCount, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb />
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Salesperson Performance</h1>
        <p className="text-sm text-zinc-500 font-mono mt-0.5">Commission report — {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
            <Receipt className="w-4 h-4 text-blue-400" />
          </div>
          <p className="stat-num text-xl text-zinc-100">{formatCurrency(totalSales)}</p>
          <p className="text-xs font-medium text-zinc-400 mt-1">Total Sales</p>
          <p className="text-[11px] font-mono text-zinc-600 mt-0.5">{totalSalesCount} transactions</p>
        </div>
        <div className="glass-card p-5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="stat-num text-xl text-zinc-100">{formatCurrency(totalCommission)}</p>
          <p className="text-xs font-medium text-zinc-400 mt-1">Total Commission</p>
          <p className="text-[11px] font-mono text-zinc-600 mt-0.5">This month</p>
        </div>
        <div className="glass-card p-5">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="stat-num text-xl text-zinc-100">{rows.length}</p>
          <p className="text-xs font-medium text-zinc-400 mt-1">Active Salespeople</p>
          <p className="text-[11px] font-mono text-zinc-600 mt-0.5">With sales this month</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Salesperson', 'Sales', 'Commission', 'Avg Sale', 'Rank'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {rows.map((r, i) => (
                <tr key={r.salespersonId} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-purple-400">#{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-200">{r.name}</p>
                        <p className="text-[10px] font-mono text-zinc-600">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 stat-num text-xs text-zinc-400">{r.saleCount}</td>
                  <td className="px-4 py-3 stat-num text-xs text-emerald-400">{formatCurrency(r.totalCommission)}</td>
                  <td className="px-4 py-3 stat-num text-xs text-zinc-500">{formatCurrency(r.saleCount ? r.totalSales / r.saleCount : 0)}</td>
                  <td className="px-4 py-3 text-xs font-mono text-zinc-500">#{i + 1}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No sales recorded this month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
