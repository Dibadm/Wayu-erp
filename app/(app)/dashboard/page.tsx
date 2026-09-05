import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import StatCard from '@/components/StatCard'
import DashboardKPI from '@/components/DashboardKPI'
import MovementsTable from '@/components/MovementsTable'
import LowStockAlert from '@/components/LowStockAlert'
import ExpiryWidget from '@/components/ExpiryWidget'
import ReorderPanel from '@/components/ReorderPanel'
import AreaChart from '@/components/charts/AreaChart'
import BarChart from '@/components/charts/BarChart'
import DonutChart from '@/components/charts/DonutChart'
import Link from 'next/link'
import Breadcrumb from '@/components/Breadcrumb'
import HealthBadge from '@/components/HealthBadge'
import {
  Package, Wallet, ShoppingCart, CreditCard,
  TrendingUp, Receipt, Percent, Activity,
  AlertTriangle, Clock, Eye,
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  Users, FileText, ShieldCheck, BadgeDollarSign,
} from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const role = session.user.role as string
  const isAdmin = role === 'ADMIN'
  const isFinance = role === 'FINANCE'
  const isCreditOfficer = role === 'CREDIT_OFFICER'
  const isInventory = role === 'INVENTORY'
  const isSales = role === 'SALES'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today.getTime() - 30 * 86400000)

  const [
    totalProducts,
    totalStock,
    lowStockProducts,
    bankAccounts,
    todaySales,
    monthlySales,
    totalCustomers,
    cashInflows,
    cashOutflows,
    outstandingAR,
    expensesThisMonth,
    recentMovements,
    saleItems,
    expensesByCategory,
    arAging,
    movementsByDate,
    commissionOwedThisMonth,
    topSalesperson,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.aggregate({ _sum: { quantity: true } }),
    prisma.$queryRaw<{ id: string; sku: string; name: string; quantity: number; minStockLevel: number }[]>`
      SELECT "id", "sku", "name", "quantity", "minStockLevel"
      FROM "products"
      WHERE "quantity" <= "minStockLevel"
      LIMIT 10
    `,
    prisma.bankAccount.findMany({ where: { isActive: true }, select: { accountName: true, currentBalance: true } }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: today }, status: 'COMPLETED' },
      _sum: { total: true, profit: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { status: 'COMPLETED', createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } },
      _sum: { total: true, profit: true },
    }),
    prisma.customer.count(),
    prisma.cashInflow.aggregate({ where: { receivedAt: { gte: today } }, _sum: { amount: true } }),
    prisma.cashOutflow.aggregate({ where: { paidAt: { gte: today } }, _sum: { amount: true } }),
    prisma.aRStatement.aggregate({ where: { status: { not: 'PAID' } }, _sum: { amount: true } }),
    prisma.expense.aggregate({
      where: { incurredAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) }, type: 'DEBIT' },
      _sum: { amount: true },
    }),
    prisma.movement.findMany({
      take: 10, orderBy: { timestamp: 'desc' },
      include: { product: { select: { name: true, sku: true } }, user: { select: { name: true } } },
    }),
    prisma.saleItem.findMany({
      where: { sale: { status: 'COMPLETED', createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } } },
      include: { product: { select: { name: true, sku: true } } },
    }),
    prisma.expense.groupBy({
      by: ['category'],
      where: { incurredAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) }, type: 'DEBIT' },
      _sum: { amount: true },
    }),
    prisma.aRStatement.groupBy({
      by: ['status'],
      where: { status: { not: 'PAID' } },
      _sum: { amount: true },
    }),
    prisma.movement.groupBy({
      by: ['timestamp'],
      where: { timestamp: { gte: startDate } },
      _sum: { quantity: true },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.saleItem.aggregate({
      where: { sale: { status: 'COMPLETED', createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } } },
      _sum: { commissionAmount: true },
    }),
    prisma.sale.findMany({
      where: { status: 'COMPLETED', createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } },
      select: { salespersonId: true, items: { select: { commissionAmount: true } } },
    }),
  ])

  const salesTrend = await prisma.sale.findMany({
    where: { status: 'COMPLETED', createdAt: { gte: startDate } },
    select: { createdAt: true, total: true, profit: true },
    orderBy: { createdAt: 'asc' },
  })

  const expenseTrend = await prisma.expense.findMany({
    where: { incurredAt: { gte: startDate }, type: 'DEBIT' },
    select: { incurredAt: true, amount: true },
    orderBy: { incurredAt: 'asc' },
  })

  const cashFlowTrend = await prisma.cashInflow.findMany({
    where: { receivedAt: { gte: startDate } },
    select: { receivedAt: true, amount: true },
    orderBy: { receivedAt: 'asc' },
  })

  const cashOutflowTrend = await prisma.cashOutflow.findMany({
    where: { paidAt: { gte: startDate } },
    select: { paidAt: true, amount: true },
    orderBy: { paidAt: 'asc' },
  })

  const topProducts = saleItems.reduce((acc: any[], item: any) => {
    const existing = acc.find(p => p.productId === item.productId)
    if (existing) {
      existing.revenue += Number(item.lineTotal)
      existing.qty += item.quantity
    } else {
      acc.push({ productId: item.productId, name: item.product.name, sku: item.product.sku, revenue: Number(item.lineTotal), qty: item.quantity })
    }
    return acc
  }, []).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  const totalCashPosition = bankAccounts.reduce((s, a) => s + Number(a.currentBalance), 0)

  const commissionBySalesperson = new Map<string, number>()
  for (const sale of topSalesperson) {
    const spId = sale.salespersonId
    if (!spId) continue
    const commission = sale.items.reduce((s: number, i: any) => s + Number(i.commissionAmount || 0), 0)
    commissionBySalesperson.set(spId, (commissionBySalesperson.get(spId) || 0) + commission)
  }

  let topSalespersonId: string | null = null
  let topSalespersonCommission = 0
  commissionBySalesperson.forEach((commission, spId) => {
    if (commission > topSalespersonCommission) {
      topSalespersonCommission = commission
      topSalespersonId = spId
    }
  })

  const topSalespersonUser = topSalespersonId
    ? await prisma.user.findUnique({ where: { id: topSalespersonId }, select: { name: true, email: true } })
    : null

  const kpis = {
    totalInventoryValue: Number(totalStock._sum.quantity ?? 0),
    currentCashPosition: totalCashPosition,
    dailySales: Number(todaySales._sum.total ?? 0),
    outstandingCredit: Number(outstandingAR._sum?.amount ?? 0),
    monthlyRevenue: Number(monthlySales._sum.total ?? 0),
    monthlyExpenses: Number(expensesThisMonth._sum?.amount ?? 0),
    grossProfitMargin: monthlySales._sum.total ? ((Number(monthlySales._sum.profit ?? 0) / Number(monthlySales._sum.total)) * 100) : 0,
    bankAccountsCount: bankAccounts.length,
  }

  const creditProfiles = isCreditOfficer || isAdmin || isFinance
    ? await prisma.creditProfile.count()
    : 0

  const collectionCases = isCreditOfficer || isAdmin || isFinance
    ? await prisma.collectionCase.count({ where: { status: { not: 'RESOLVED' } } })
    : 0

  const overdueNotifications = isCreditOfficer || isAdmin || isFinance
    ? await prisma.overdueNotification.count()
    : 0

  const creditApps = isCreditOfficer || isAdmin || isFinance
    ? await prisma.creditApplication.count({ where: { status: 'PENDING' } })
    : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Dashboard</h1>
           <p className="text-sm text-zinc-600 dark:text-zinc-500 font-mono mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <HealthBadge />
      </div>

      {/* Row 1: Core Business KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKPI
          label="Total Inventory Value"
          value={(kpis.totalInventoryValue ?? 0).toLocaleString()}
          subtitle="Units in stock"
          icon={Package}
          accent="blue"
          isZero={kpis.totalInventoryValue === 0}
        />
        <DashboardKPI
          label="Current Cash Position"
          value={formatCurrency(kpis.currentCashPosition ?? 0)}
          subtitle="Sum of all bank balances"
          icon={Wallet}
          accent="emerald"
          isZero={kpis.currentCashPosition === 0}
        />
        <DashboardKPI
          label="Daily Sales"
          value={formatCurrency(kpis.dailySales ?? 0)}
          subtitle="Today's revenue"
          icon={ShoppingCart}
          accent="amber"
          isZero={kpis.dailySales === 0}
        />
        {(isAdmin || isFinance || isCreditOfficer || isSales) && (
          <DashboardKPI
            label="Outstanding Credit"
            value={formatCurrency(kpis.outstandingCredit ?? 0)}
            subtitle="AR total"
            icon={CreditCard}
            accent="purple"
            isZero={kpis.outstandingCredit === 0}
          />
        )}
      </div>

      {/* Row 2: Role-specific KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {!isInventory && (
          <>
            <DashboardKPI
              label="Monthly Revenue"
              value={formatCurrency(kpis.monthlyRevenue ?? 0)}
              subtitle="This month"
              icon={TrendingUp}
              accent="emerald"
              isZero={kpis.monthlyRevenue === 0}
            />
            <DashboardKPI
              label="Expense Summary"
              value={formatCurrency(kpis.monthlyExpenses ?? 0)}
              subtitle="This month"
              icon={Receipt}
              accent="red"
              isZero={kpis.monthlyExpenses === 0}
            />
            <DashboardKPI
              label="Gross Profit Margin"
              value={`${(kpis.grossProfitMargin ?? 0).toFixed(1)}%`}
              subtitle="This month"
              icon={Percent}
              accent="blue"
              isZero={kpis.grossProfitMargin === 0}
            />
            <DashboardKPI
              label="Bank Balances"
              value={kpis.bankAccountsCount ?? 0}
              subtitle="Active accounts"
              icon={Activity}
              accent="amber"
              isZero={kpis.bankAccountsCount === 0}
            />
          </>
        )}

        {(isCreditOfficer || isAdmin || isFinance) && (
          <>
            <DashboardKPI
              label="Credit Profiles"
              value={creditProfiles}
              subtitle="Active customers"
              icon={Users}
              accent="blue"
              isZero={creditProfiles === 0}
            />
            <DashboardKPI
              label="Pending Applications"
              value={creditApps}
              subtitle="Awaiting review"
              icon={FileText}
              accent="amber"
              isZero={creditApps === 0}
            />
            <DashboardKPI
              label="Open Collections"
              value={collectionCases}
              subtitle="Active cases"
              icon={ShieldCheck}
              accent="red"
              isZero={collectionCases === 0}
            />
            <DashboardKPI
              label="Overdue Alerts"
              value={overdueNotifications}
              subtitle="System notifications"
              icon={AlertTriangle}
              accent="purple"
              isZero={overdueNotifications === 0}
            />
          </>
        )}
      </div>

      {(isAdmin || isFinance) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DashboardKPI
            label="Commission Owed This Month"
            value={formatCurrency(Number(commissionOwedThisMonth._sum.commissionAmount ?? 0))}
            subtitle="Total commission earned"
            icon={BadgeDollarSign}
            accent="emerald"
            isZero={Number(commissionOwedThisMonth._sum.commissionAmount ?? 0) === 0}
            valueSize="xl"
          />
          <DashboardKPI
            label="Top Salesperson"
            value={topSalespersonUser?.name ?? topSalespersonUser?.email?.split('@')[0] ?? '—'}
            subtitle={formatCurrency(topSalespersonCommission)}
            icon={Users}
            accent="blue"
            valueSize="xl"
            valueMono={false}
          />
        </div>
      )}

      {/* Row 3: Charts - conditional */}
      {(isAdmin || isFinance) && (
        <div className="grid grid-cols-1 gap-6">
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Sales Trend (Last 30 Days)</h2>
            <AreaChart
              data={salesTrend}
              series={[
                { key: 'revenue', label: 'Revenue', color: 'var(--accent-emerald)' },
                { key: 'profit', label: 'Profit', color: 'var(--accent-blue)' },
              ]}
              xKey="date"
              height={220}
              format="currency"
            />
          </div>
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Expense Trend (Last 30 Days)</h2>
            <BarChart
              data={expenseTrend}
              bars={[{ key: 'amount', label: 'Expenses', color: 'var(--accent-red)' }]}
              xKey="date"
              height={220}
              format="currency"
            />
          </div>
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Cash Flow Trend (Last 30 Days)</h2>
            <AreaChart
              data={cashFlowTrend}
              series={[
                { key: 'inflow', label: 'Inflow', color: 'var(--accent-emerald)' },
                { key: 'outflow', label: 'Outflow', color: 'var(--accent-red)' },
              ]}
              xKey="date"
              height={220}
              format="currency"
            />
          </div>
        </div>
      )}

      {/* Row 4: Alerts & Lists - conditional */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!isInventory && (
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Low Stock Alerts</h2>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">{lowStockProducts.length} items need restocking</p>
            </div>
            {lowStockProducts.length > 0 && <LowStockAlert products={lowStockProducts} />}
          </div>
        )}
        {!isCreditOfficer && !isSales && (
          <div className="glass-card overflow-hidden">
            <ExpiryWidget />
          </div>
        )}
        {(isAdmin || isSales || isFinance) && (
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Top Selling Products</h2>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">Top 5 by revenue this month</p>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
              {topProducts.map((p: any, i: number) => (
                <div key={p.productId} className="px-5 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
                  <div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-200">{p.name}</p>
                    <p className="text-[10px] font-mono text-zinc-600">{p.sku} · {p.qty} units</p>
                  </div>
                  <p className="stat-num text-sm text-emerald-500 dark:text-emerald-400">{formatCurrency(p.revenue)}</p>
                </div>
              ))}
              {topProducts.length === 0 && <div className="py-10 text-center text-xs font-mono text-zinc-600">No sales this month.</div>}
            </div>
          </div>
        )}
      </div>

      {/* Overdue Notifications Banner */}
      {(isAdmin || isCreditOfficer) && overdueNotifications > 0 && (
        <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-l-red-500">
          <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Overdue Notifications</p>
            <p className="text-xs font-mono text-zinc-500">{overdueNotifications} overdue alerts require attention</p>
          </div>
        </div>
      )}

      {/* Row 5: Analytics - conditional */}
      {(isAdmin || isCreditOfficer) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Product Category Analysis</h2>
            <DonutChart
              data={topProducts.map((p: any, i: number) => ({
                name: p.name,
                value: p.revenue,
                color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5],
              }))}
              height={220}
              format="currency"
            />
          </div>
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Monthly Profit Comparison</h2>
            <BarChart
              data={[
                { name: 'Revenue', value: kpis.monthlyRevenue ?? 0 },
                { name: 'Expenses', value: kpis.monthlyExpenses ?? 0 },
                { name: 'Profit', value: (kpis.monthlyRevenue ?? 0) - (kpis.monthlyExpenses ?? 0) },
              ]}
              bars={[
                { key: 'value', label: 'Amount', color: 'var(--accent-emerald)' },
              ]}
              xKey="name"
              height={220}
              format="currency"
            />
          </div>
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Credit Aging</h2>
            <DonutChart
              data={arAging.map((a: any, i: number) => ({
                name: a.status,
                value: a.amount,
                color: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'][i % 4],
              }))}
              height={220}
              format="currency"
            />
          </div>
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Inventory Movement</h2>
            <AreaChart
              data={movementsByDate.slice(-30)}
              series={[
                { key: 'quantity', label: 'Quantity', color: 'var(--accent-blue)' },
              ]}
              xKey="date"
              height={220}
              format="units"
            />
          </div>
        </div>
      )}

      {/* Row 6: Lists - conditional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {!isCreditOfficer && (
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent Movements</h2>
                <p className="text-xs font-mono text-zinc-500 mt-0.5">Last 10 transactions</p>
              </div>
              <Link href="/movements" className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">All →</Link>
            </div>
            <MovementsTable movements={recentMovements.map((m: any) => ({
              ...m,
              type: m.type ?? 'IN',
              timestamp: new Date(m.timestamp),
              product: m.product ?? { name: '—', sku: '—' },
              user: m.user ?? { name: '—', email: '—' },
            }))} />
          </div>
        )}
        {(isAdmin || isFinance) && (
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Expense Category Summary</h2>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">This month&apos;s expenses by category</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    {['Category', 'Amount'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                  {expensesByCategory.map((e: any, i: number) => (
                    <tr key={i} className="hover:bg-zinc-100 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300">{e.category.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2.5 stat-num text-sm text-red-500 dark:text-red-400">{formatCurrency(e.total)}</td>
                    </tr>
                  ))}
                  {expensesByCategory.length === 0 && <tr><td colSpan={2} className="px-4 py-10 text-center text-xs font-mono text-zinc-600">No expenses this month.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}