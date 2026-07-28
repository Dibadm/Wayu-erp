import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '30')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today.getTime() - days * 86400000)

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
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.aggregate({ _sum: { quantity: true } }),
    prisma.$queryRaw<{ id: string; sku: string; name: string; quantity: number; minStockLevel: number }[]>`
      SELECT "id", "sku", "name", "quantity", "minStockLevel" AS "minStockLevel"
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
  ])

  const inventoryValue = await prisma.product.aggregate({
    _sum: { quantity: true },
  })

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

  return NextResponse.json({
    kpis: {
      totalInventoryValue: Number(totalStock._sum.quantity ?? 0),
      currentCashPosition: totalCashPosition,
      dailySales: Number(todaySales._sum.total ?? 0),
      outstandingCredit: Number(outstandingAR._sum?.amount ?? 0),
      monthlyRevenue: Number(monthlySales._sum.total ?? 0),
      monthlyExpenses: Number(expensesThisMonth._sum?.amount ?? 0),
      grossProfitMargin: monthlySales._sum.total ? ((Number(monthlySales._sum.profit ?? 0) / Number(monthlySales._sum.total)) * 100) : 0,
      bankAccountsCount: bankAccounts.length,
    },
    bankAccounts,
    lowStockProducts,
    recentMovements,
    topProducts,
    salesTrend: salesTrend.map((s) => ({ date: s.createdAt.toISOString().split('T')[0], revenue: Number(s.total), profit: Number(s.profit) })),
    expenseTrend: expenseTrend.map((e) => ({ date: e.incurredAt.toISOString().split('T')[0], amount: Number(e.amount) })),
    cashFlowTrend: combineCashFlow(cashFlowTrend, cashOutflowTrend, days),
    expensesByCategory: expensesByCategory.map((e) => ({ category: e.category, total: Number(e._sum.amount) })),
    arAging: arAging.map((a) => ({ status: a.status, amount: Number(a._sum.amount) })),
    movementsByDate: movementsByDate.map((m) => ({ date: m.timestamp.toISOString().split('T')[0], quantity: Number(m._sum.quantity) })),
  })
}

function combineCashFlow(inflows: any[], outflows: any[], days: number) {
  const map: Record<string, { inflow: number; outflow: number }> = {}
  for (const d = new Date(); d >= new Date(Date.now() - days * 86400000); d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0]
    map[key] = { inflow: 0, outflow: 0 }
  }
  for (const i of inflows) map[i.receivedAt.toISOString().split('T')[0]] = { ...map[i.receivedAt.toISOString().split('T')[0]] ?? { inflow: 0, outflow: 0 }, inflow: Number(i.amount) }
  for (const o of outflows) map[o.paidAt.toISOString().split('T')[0]] = { ...map[o.paidAt.toISOString().split('T')[0]] ?? { inflow: 0, outflow: 0 }, outflow: Number(o.amount) }
  return Object.entries(map).map(([date, vals]) => ({ date, ...vals })).sort((a, b) => a.date.localeCompare(b.date))
}