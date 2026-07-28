import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Receipt, TrendingUp, BadgeDollarSign, ShoppingCart } from 'lucide-react'
import Breadcrumb from '@/components/Breadcrumb'
import SalesTable from '@/components/SalesTable'

export default async function SalesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const now       = new Date()
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now.getTime() - 7 * 86400000)
  const monthStart= new Date(now.getTime() - 30 * 86400000)

  const [sales, todayAgg, weekAgg, monthAgg] = await Promise.all([
    prisma.sale.findMany({
      orderBy:  { createdAt: 'desc' },
      take:     100,
      include: {
        customer: { select: { name: true } },
        cashier:  { select: { name: true, email: true } },
        salesperson: { select: { name: true, email: true } },
        payments: { select: { method: true, amount: true } },
        _count:   { select: { items: true } },
      },
    }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: today } },
      _sum:  { total: true, profit: true, discountAmount: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: weekStart } },
      _sum:  { total: true, profit: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum:  { total: true, profit: true },
      _count: true,
    }),
  ])

  const fmt = (n: number | null | undefined) =>
    `₱${(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb />
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Sales History</h1>
        <p className="text-sm text-zinc-500 font-mono mt-0.5">{sales.length} recent transactions</p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            period: 'Today',
            revenue: Number(todayAgg._sum.total ?? 0),
            profit:  Number(todayAgg._sum.profit ?? 0),
            count:   todayAgg._count,
            discount:Number(todayAgg._sum.discountAmount ?? 0),
            icon: ShoppingCart, accent: 'blue',
          },
          {
            period: 'Last 7 Days',
            revenue: Number(weekAgg._sum.total ?? 0),
            profit:  Number(weekAgg._sum.profit ?? 0),
            count:   weekAgg._count,
            icon: TrendingUp, accent: 'emerald',
          },
          {
            period: 'Last 30 Days',
            revenue: Number(monthAgg._sum.total ?? 0),
            profit:  Number(monthAgg._sum.profit ?? 0),
            count:   monthAgg._count,
            icon: BadgeDollarSign, accent: 'purple',
          },
        ].map(t => {
          const Icon = t.icon
          const colors: Record<string, string> = {
            blue:   'bg-blue-500/10 border-blue-500/20 text-blue-400',
            emerald:'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
            purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
          }
          const cls = colors[t.accent]
          return (
            <div key={t.period} className="glass-card p-5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border mb-4 ${cls}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-2">{t.period}</p>
              <p className="stat-num text-xl text-zinc-100">{fmt(t.revenue)}</p>
              <p className="text-xs font-mono text-zinc-500 mt-1">revenue · {t.count} sales</p>
              <p className="text-xs font-mono text-emerald-500 mt-0.5">{fmt(t.profit)} profit</p>
               {'discount' in t && (t as any).discount > 0 && (
                <p className="text-xs font-mono text-amber-500 mt-0.5">-{fmt(t.discount)} discounts</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Sales table */}
      <SalesTable sales={sales} />
    </div>
  )
}
