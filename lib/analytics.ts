// lib/analytics.ts
// Single source of truth for all analytics data.
// Used by:  /api/analytics  (chart data + KPIs)
//           /api/ai/analytics-report  (summarised numbers → AI)
// All heavy lifting happens here. API routes stay thin.

import { prisma } from '@/lib/db'

export type Period = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

export function getPeriodRange(period: Period, from?: Date, to?: Date): { start: Date; end: Date; label: string; prevStart: Date; prevEnd: Date } {
  const now = new Date()
  const end = to ?? new Date(now)
  let start: Date
  let label: string

  switch (period) {
    case 'today':
      start = new Date(now); start.setHours(0, 0, 0, 0)
      label = 'Today'
      break
    case 'week':
      start = new Date(now); start.setDate(now.getDate() - 7)
      label = 'Last 7 Days'
      break
    case 'month':
      start = new Date(now); start.setDate(now.getDate() - 30)
      label = 'Last 30 Days'
      break
    case 'quarter':
      start = new Date(now); start.setDate(now.getDate() - 90)
      label = 'Last 90 Days'
      break
    case 'year':
      start = new Date(now); start.setFullYear(now.getFullYear() - 1)
      label = 'Last 12 Months'
      break
    case 'custom':
      start = from ?? new Date(now.getFullYear(), now.getMonth(), 1)
      label = 'Custom Range'
      break
  }

  const duration  = end.getTime() - start.getTime()
  const prevEnd   = new Date(start.getTime() - 1)
  const prevStart = new Date(start.getTime() - duration)

  return { start, end, label, prevStart, prevEnd }
}

// ─── Helper: bucket movements into daily data points ─────────────────────────

function bucketByDay(
  movements: { timestamp: Date; quantity: number; type: string; product: { costPrice: any; sellingPrice: any } }[],
  start: Date,
  end: Date
): { date: string; revenue: number; cost: number; profit: number; units: number; purchases: number }[] {
  const days: Record<string, { revenue: number; cost: number; profit: number; units: number; purchases: number }> = {}

  // Seed all days with zeros
  const cursor = new Date(start)
  while (cursor <= end) {
    days[cursor.toISOString().split('T')[0]] = { revenue: 0, cost: 0, profit: 0, units: 0, purchases: 0 }
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const m of movements) {
    const key   = m.timestamp.toISOString().split('T')[0]
    if (!days[key]) continue
    const cost  = Number(m.product.costPrice    ?? 0)
    const sell  = Number(m.product.sellingPrice ?? 0)
    if (m.type === 'OUT') {
      days[key].revenue  += m.quantity * sell
      days[key].cost     += m.quantity * cost
      days[key].profit   += m.quantity * (sell - cost)
      days[key].units    += m.quantity
    }
    if (m.type === 'IN') {
      days[key].purchases += m.quantity * cost
    }
  }

  return Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))
}

// ─── Helper: bucket into monthly data points ──────────────────────────────────

function bucketByMonth(
  movements: { timestamp: Date; quantity: number; type: string; product: { costPrice: any; sellingPrice: any } }[]
): { date: string; revenue: number; cost: number; profit: number; units: number }[] {
  const months: Record<string, { revenue: number; cost: number; profit: number; units: number }> = {}

  for (const m of movements) {
    const key  = m.timestamp.toISOString().slice(0, 7) // YYYY-MM
    if (!months[key]) months[key] = { revenue: 0, cost: 0, profit: 0, units: 0 }
    const sell = Number(m.product.sellingPrice ?? 0)
    const cost = Number(m.product.costPrice    ?? 0)
    if (m.type === 'OUT') {
      months[key].revenue += m.quantity * sell
      months[key].cost    += m.quantity * cost
      months[key].profit  += m.quantity * (sell - cost)
      months[key].units   += m.quantity
    }
  }

  return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }))
}

// ─── Main analytics query ─────────────────────────────────────────────────────

export async function getAnalyticsData(period: Period, from?: Date, to?: Date) {
  const { start, end, label, prevStart, prevEnd } = getPeriodRange(period, from, to)

  // Run all queries in parallel
  const [
    movements,
    prevMovements,
    products,
    poData,
    prevPOData,
    batchData,
    topProductsRaw,
    monthlyMovements,
  ] = await Promise.all([
    // Current period movements with product pricing
    prisma.movement.findMany({
      where: { timestamp: { gte: start, lte: end } },
      include: { product: { select: { id: true, name: true, sku: true, costPrice: true, sellingPrice: true } } },
      orderBy: { timestamp: 'asc' },
    }),

    // Previous period for trend comparison
    prisma.movement.findMany({
      where: { timestamp: { gte: prevStart, lte: prevEnd }, type: 'OUT' },
      include: { product: { select: { costPrice: true, sellingPrice: true } } },
    }),

    // All products for inventory valuation
    prisma.product.findMany({
      select: { id: true, name: true, sku: true, quantity: true, costPrice: true, sellingPrice: true, category: true },
    }),

    // Current period purchase orders (expenses)
    prisma.purchaseOrder.findMany({
      where: { createdAt: { gte: start, lte: end }, status: { notIn: ['CANCELLED'] } },
      select: { totalCost: true, status: true },
    }),

    // Previous period POs for comparison
    prisma.purchaseOrder.findMany({
      where: { createdAt: { gte: prevStart, lte: prevEnd }, status: { notIn: ['CANCELLED'] } },
      select: { totalCost: true },
    }),

    // Expiring batches
    prisma.batch.findMany({
      where: { status: 'ACTIVE' },
      select: { expiryDate: true, quantity: true, product: { select: { name: true, sku: true, costPrice: true } } },
      orderBy: { expiryDate: 'asc' },
    }),

    // Top/slow products (last 30 days OUT movements, grouped by product)
    prisma.movement.groupBy({
      by: ['productId'],
      where: { type: 'OUT', timestamp: { gte: new Date(Date.now() - 30 * 86400000) } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
    }),

    // Last 12 months for growth chart
    prisma.movement.findMany({
      where: { timestamp: { gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } },
      include: { product: { select: { costPrice: true, sellingPrice: true } } },
      orderBy: { timestamp: 'asc' },
    }),
  ])

  // ── Sales & revenue calculations ────────────────────────────────────────────
  const outMovements  = movements.filter(m => m.type === 'OUT')
  const inMovements   = movements.filter(m => m.type === 'IN')

  const revenue       = outMovements.reduce((s, m) => s + m.quantity * Number(m.product.sellingPrice ?? 0), 0)
  const cogs          = outMovements.reduce((s, m) => s + m.quantity * Number(m.product.costPrice    ?? 0), 0)
  const profit        = revenue - cogs
  const unitsSold     = outMovements.reduce((s, m) => s + m.quantity, 0)
  const expenses      = poData.reduce((s, o) => s + Number(o.totalCost), 0)
  const daysInPeriod  = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
  const avgDailySales = unitsSold / daysInPeriod

  // Previous period for trend %
  const prevRevenue   = prevMovements.reduce((s, m) => s + m.quantity * Number(m.product.sellingPrice ?? 0), 0)
  const prevCogs      = prevMovements.reduce((s, m) => s + m.quantity * Number(m.product.costPrice    ?? 0), 0)
  const prevProfit    = prevRevenue - prevCogs
  const prevExpenses  = prevPOData.reduce((s, o) => s + Number(o.totalCost), 0)
  const prevUnitsSold = prevMovements.reduce((s, m) => s + m.quantity, 0)

  function trendPct(curr: number, prev: number) {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }

  // ── Inventory valuation ─────────────────────────────────────────────────────
  const inventoryCost  = products.reduce((s, p) => s + p.quantity * Number(p.costPrice    ?? 0), 0)
  const inventoryValue = products.reduce((s, p) => s + p.quantity * Number(p.sellingPrice ?? 0), 0)
  const totalUnits     = products.reduce((s, p) => s + p.quantity, 0)

  // Inventory turnover = COGS / avg inventory cost (annualised)
  const annualisedCogs    = (cogs / daysInPeriod) * 365
  const inventoryTurnover = inventoryCost > 0 ? annualisedCogs / inventoryCost : 0

  // ── Stock health ────────────────────────────────────────────────────────────
  const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= 10).length
  const outOfStock    = products.filter(p => p.quantity === 0).length
  const stockHealth   = Math.max(0, Math.round(100 - ((lowStockCount + outOfStock * 2) / Math.max(1, products.length)) * 100))

  // ── Business health composite ───────────────────────────────────────────────
  const marginPct      = revenue > 0 ? (profit / revenue) * 100 : 0
  const businessHealth = Math.min(100, Math.round(
    (stockHealth * 0.3) +
    (Math.min(marginPct, 40) / 40 * 100 * 0.4) +
    (Math.min(inventoryTurnover, 12) / 12 * 100 * 0.3)
  ))

  // ── Top / slow products ─────────────────────────────────────────────────────
  const productMap  = Object.fromEntries(products.map(p => [p.id, p]))
  const topProducts = topProductsRaw.slice(0, 8).map(r => ({
    name:      productMap[r.productId]?.name ?? 'Unknown',
    sku:       productMap[r.productId]?.sku  ?? '',
    unitsSold: r._sum.quantity ?? 0,
    revenue:   (r._sum.quantity ?? 0) * Number(productMap[r.productId]?.sellingPrice ?? 0),
  }))
  const slowProducts = topProductsRaw.slice(-6).reverse().map(r => ({
    name:      productMap[r.productId]?.name ?? 'Unknown',
    sku:       productMap[r.productId]?.sku  ?? '',
    unitsSold: r._sum.quantity ?? 0,
  }))

  // Products with NO sales in the period
  const soldProductIds = new Set(topProductsRaw.map(r => r.productId))
  const noSalesProducts = products
    .filter(p => !soldProductIds.has(p.id))
    .map(p => ({ name: p.name, sku: p.sku, unitsSold: 0 }))
    .slice(0, 4)

  // ── Expiry analysis ─────────────────────────────────────────────────────────
  const now        = new Date()
  const in30       = new Date(now.getTime() + 30 * 86400000)
  const expiringData = batchData
    .filter(b => b.expiryDate <= in30)
    .slice(0, 10)
    .map(b => ({
      name:     b.product.name,
      sku:      b.product.sku,
      quantity: b.quantity,
      daysLeft: Math.floor((b.expiryDate.getTime() - now.getTime()) / 86400000),
      value:    b.quantity * Number(b.product.costPrice ?? 0),
    }))

  const expiryRisk = expiringData.reduce((s, b) => s + b.value, 0)

  // ── Category breakdown ──────────────────────────────────────────────────────
  const categoryMap: Record<string, { units: number; revenue: number; cost: number }> = {}
  for (const m of outMovements) {
    const p   = productMap[m.product.id]
    const cat = p?.category ?? 'Other'
    if (!categoryMap[cat]) categoryMap[cat] = { units: 0, revenue: 0, cost: 0 }
    categoryMap[cat].units   += m.quantity
    categoryMap[cat].revenue += m.quantity * Number(m.product.sellingPrice ?? 0)
    categoryMap[cat].cost    += m.quantity * Number(m.product.costPrice    ?? 0)
  }
  const categoryBreakdown = Object.entries(categoryMap)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .map(([name, v]) => ({ name, ...v, profit: v.revenue - v.cost }))

  // ── Time series ─────────────────────────────────────────────────────────────
  const dailySeries   = bucketByDay(movements as any, start, end)
  const monthlySeries = bucketByMonth(monthlyMovements as any)

  // ── Product movement (top 6 by total movement volume) ───────────────────────
  const movementByProduct: Record<string, { name: string; in: number; out: number }> = {}
  for (const m of movements) {
    const id = m.product.id
    if (!movementByProduct[id]) movementByProduct[id] = { name: m.product.name, in: 0, out: 0 }
    if (m.type === 'IN')  movementByProduct[id].in  += m.quantity
    if (m.type === 'OUT') movementByProduct[id].out += m.quantity
  }
  const productMovement = Object.values(movementByProduct)
    .sort((a, b) => (b.in + b.out) - (a.in + a.out))
    .slice(0, 8)

  return {
    period: { label, start, end, days: daysInPeriod },

    // KPIs
    kpis: {
      revenue,          revenueTrend:    trendPct(revenue, prevRevenue),
      profit,           profitTrend:     trendPct(profit,  prevProfit),
      expenses,         expensesTrend:   trendPct(expenses, prevExpenses),
      inventoryValue,   inventoryCost,
      unitsSold,        unitsSoldTrend:  trendPct(unitsSold, prevUnitsSold),
      avgDailySales:    Math.round(avgDailySales * 10) / 10,
      inventoryTurnover: Math.round(inventoryTurnover * 10) / 10,
      marginPct:        Math.round(marginPct * 10) / 10,
      stockHealth,
      businessHealth,
      totalProducts:    products.length,
      lowStockCount,
      outOfStock,
      totalUnits,
      expiryRisk,
    },

    // Chart data
    charts: {
      dailySeries,
      monthlySeries,
      topProducts,
      slowProducts: [...slowProducts, ...noSalesProducts].slice(0, 8),
      expiringData,
      categoryBreakdown,
      productMovement,
    },
  }
}

// Re-export for AI route — returns only numbers, no raw rows
export type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>
