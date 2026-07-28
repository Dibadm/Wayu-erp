// lib/ai-inventory.ts
// All database queries the AI assistant uses.
// The AI never invents data — it always calls these functions first,
// then passes the results as context to Claude.

import { prisma } from '@/lib/db'

// ─── Real-time inventory snapshot ─────────────────────────────────────────────

export async function getInventorySnapshot() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  const monthAgo = new Date(today.getTime() - 30 * 86400000)
  const in30Days = new Date(today.getTime() + 30 * 86400000)
  const in14Days = new Date(today.getTime() + 14 * 86400000)
  const in7Days  = new Date(today.getTime() + 7  * 86400000)

  const [
    products,
    todaySales,
    weeklySales,
    monthlySales,
    expiringBatches,
    expiredBatches,
  ] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: {
        batches: {
          where: { status: { in: ['ACTIVE', 'EXPIRED'] } },
          orderBy: { expiryDate: 'asc' },
        },
      },
    }),

    // Today's OUT movements = sales/dispensing
    prisma.movement.aggregate({
      where: { type: 'OUT', timestamp: { gte: today } },
      _sum: { quantity: true },
      _count: true,
    }),

    prisma.movement.aggregate({
      where: { type: 'OUT', timestamp: { gte: weekAgo } },
      _sum: { quantity: true },
      _count: true,
    }),

    prisma.movement.aggregate({
      where: { type: 'OUT', timestamp: { gte: monthAgo } },
      _sum: { quantity: true },
      _count: true,
    }),

    prisma.batch.findMany({
      where: { status: 'ACTIVE', expiryDate: { lte: in30Days, gte: now } },
      include: { product: { select: { name: true, sku: true } }, location: { select: { name: true } } },
      orderBy: { expiryDate: 'asc' },
    }),

    prisma.batch.findMany({
      where: { expiryDate: { lt: now }, status: { not: 'DEPLETED' } },
      include: { product: { select: { name: true, sku: true } }, location: { select: { name: true } } },
      orderBy: { expiryDate: 'desc' },
      take: 20,
    }),
  ])

  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.minStockLevel)
  const outOfStock = products.filter(p => p.quantity === 0)

  // Best/slow sellers (last 30 days)
  const salesByProduct = await prisma.movement.groupBy({
    by: ['productId'],
    where: { type: 'OUT', timestamp: { gte: monthAgo } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
  })

  const productMap = Object.fromEntries(products.map(p => [p.id, p.name]))
  const bestSellers = salesByProduct.slice(0, 5).map(s => ({
    name: productMap[s.productId] ?? s.productId,
    unitsSold: s._sum.quantity ?? 0,
  }))
  const slowMovers = salesByProduct.slice(-5).reverse().map(s => ({
    name: productMap[s.productId] ?? s.productId,
    unitsSold: s._sum.quantity ?? 0,
  }))

  return {
    totalProducts: products.length,
    totalStockUnits: products.reduce((s, p) => s + p.quantity, 0),
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    lowStockItems: lowStock.map(p => ({ name: p.name, sku: p.sku, quantity: p.quantity, min: p.minStockLevel })),
    outOfStockItems: outOfStock.map(p => ({ name: p.name, sku: p.sku })),
    todaySales: { units: todaySales._sum.quantity ?? 0, transactions: todaySales._count },
    weeklySales: { units: weeklySales._sum.quantity ?? 0, transactions: weeklySales._count },
    monthlySales: { units: monthlySales._sum.quantity ?? 0, transactions: monthlySales._count },
    expiringIn7Days:  expiringBatches.filter(b => b.expiryDate <= in7Days).map(b => ({ product: b.product.name, sku: b.product.sku, batch: b.batchNumber, qty: b.quantity, expiry: b.expiryDate.toISOString().split('T')[0], location: b.location.name })),
    expiringIn14Days: expiringBatches.filter(b => b.expiryDate <= in14Days).map(b => ({ product: b.product.name, sku: b.product.sku, batch: b.batchNumber, qty: b.quantity, expiry: b.expiryDate.toISOString().split('T')[0], location: b.location.name })),
    expiringIn30Days: expiringBatches.map(b => ({ product: b.product.name, sku: b.product.sku, batch: b.batchNumber, qty: b.quantity, expiry: b.expiryDate.toISOString().split('T')[0], location: b.location.name })),
    expiredItems: expiredBatches.map(b => ({ product: b.product.name, sku: b.product.sku, batch: b.batchNumber, qty: b.quantity, expiry: b.expiryDate.toISOString().split('T')[0], location: b.location.name })),
    bestSellers,
    slowMovers,
    allProducts: products.map(p => ({
      id: p.id, name: p.name, sku: p.sku, category: p.category,
      quantity: p.quantity, minStockLevel: p.minStockLevel, unit: p.unit,
      nearestExpiry: p.batches[0]?.expiryDate?.toISOString().split('T')[0] ?? null,
    })),
  }
}

// ─── Reorder recommendations ──────────────────────────────────────────────────

export async function getReorderRecommendations() {
  const monthAgo = new Date(Date.now() - 30 * 86400000)

  const products = await prisma.product.findMany({ orderBy: { name: 'asc' } })

  // Average daily sales per product over last 30 days
  const salesHistory = await prisma.movement.groupBy({
    by: ['productId'],
    where: { type: 'OUT', timestamp: { gte: monthAgo } },
    _sum: { quantity: true },
  })
  const avgDailySales = Object.fromEntries(
    salesHistory.map(s => [s.productId, (s._sum.quantity ?? 0) / 30])
  )

  return products.map(p => {
    const dailySales = avgDailySales[p.id] ?? 0
    const daysOfStock = dailySales > 0 ? Math.floor(p.quantity / dailySales) : null
    const deficit = Math.max(0, p.minStockLevel - p.quantity)
    const status =
      p.quantity === 0 ? 'OUT_OF_STOCK' :
      p.quantity <= p.minStockLevel ? 'REORDER_NOW' :
      daysOfStock !== null && daysOfStock <= 7 ? 'REORDER_SOON' :
      daysOfStock !== null && daysOfStock <= 14 ? 'WATCH' : 'OK'

    return {
      id: p.id, name: p.name, sku: p.sku, unit: p.unit,
      currentStock: p.quantity, minStockLevel: p.minStockLevel,
      avgDailySales: Math.round(dailySales * 10) / 10,
      daysOfStockRemaining: daysOfStock,
      deficit,
      status,
      recommendation:
        status === 'OUT_OF_STOCK' ? `URGENT: ${p.name} is completely out of stock. Reorder ${p.minStockLevel * 2} ${p.unit} immediately.` :
        status === 'REORDER_NOW'  ? `Reorder ${p.name} now — only ${p.quantity} ${p.unit} left (min: ${p.minStockLevel}).` :
        status === 'REORDER_SOON' ? `Reorder ${p.name} within ${daysOfStock} days at current usage rate.` :
        status === 'WATCH'        ? `Monitor ${p.name} — ~${daysOfStock} days of stock remaining.` :
        `${p.name} is well-stocked.`,
    }
  })
}

// ─── Product search ───────────────────────────────────────────────────────────

export async function searchProducts(query: string) {
  return prisma.product.findMany({
    where: {
      OR: [
        { name:     { contains: query, mode: 'insensitive' } },
        { sku:      { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      batches: { where: { status: 'ACTIVE' }, orderBy: { expiryDate: 'asc' }, take: 1 },
    },
    take: 10,
  })
}

// ─── Expiry alerts for dashboard badge ────────────────────────────────────────

export async function getExpiryAlertCounts() {
  const now = new Date()
  const in7  = new Date(now.getTime() + 7  * 86400000)
  const in14 = new Date(now.getTime() + 14 * 86400000)
  const in30 = new Date(now.getTime() + 30 * 86400000)

  const [expired, in7d, in14d, in30d] = await Promise.all([
    prisma.batch.count({ where: { expiryDate: { lt: now }, status: 'ACTIVE' } }),
    prisma.batch.count({ where: { expiryDate: { gte: now, lte: in7  }, status: 'ACTIVE' } }),
    prisma.batch.count({ where: { expiryDate: { gte: now, lte: in14 }, status: 'ACTIVE' } }),
    prisma.batch.count({ where: { expiryDate: { gte: now, lte: in30 }, status: 'ACTIVE' } }),
  ])
  return { expired, in7Days: in7d, in14Days: in14d, in30Days: in30d }
}

// ─── POS snapshot — used by AI chat to answer POS questions ──────────────────

export async function getPOSSnapshot() {
  const now       = new Date()
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now.getTime() - 7  * 86400000)
  const monthStart= new Date(now.getTime() - 30 * 86400000)

  const [
    todaySales,
    weekSales,
    monthSales,
    bestCustomers,
    topProfitProducts,
    recentSales,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { createdAt: { gte: today }, status: 'COMPLETED' },
      _sum:  { total: true, profit: true, discountAmount: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: weekStart }, status: 'COMPLETED' },
      _sum:  { total: true, profit: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: monthStart }, status: 'COMPLETED' },
      _sum:  { total: true, profit: true },
      _count: true,
    }),
    // Best customers by lifetime value
    prisma.customer.findMany({
      include: {
        sales: { where: { status: 'COMPLETED' }, select: { total: true, profit: true } },
      },
      take: 10,
    }),
    // Top products by profit (from SaleItem)
    prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { status: 'COMPLETED', createdAt: { gte: monthStart } } },
      _sum: { profit: true, quantity: true },
      orderBy: { _sum: { profit: 'desc' } },
      take: 8,
    }),
    // Today's individual sales
    prisma.sale.findMany({
      where: { createdAt: { gte: today }, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        items:    { include: { product: { select: { name: true, sku: true } } } },
        customer: { select: { name: true } },
        payments: { select: { method: true, amount: true } },
      },
    }),
  ])

  // Best customers by lifetime value
  const bestCustomersList = bestCustomers
    .map(c => ({
      name:       c.name,
      purchases:  c.sales.length,
      totalSpent: c.sales.reduce((s, sale) => s + Number(sale.total), 0),
      totalProfit:c.sales.reduce((s, sale) => s + Number(sale.profit), 0),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)

  // Top profit products — need names
  const productIds = topProfitProducts.map(r => r.productId)
  const products   = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true },
  })
  const pMap = Object.fromEntries(products.map(p => [p.id, p]))
  const topProfitList = topProfitProducts.map(r => ({
    name:   pMap[r.productId]?.name ?? 'Unknown',
    sku:    pMap[r.productId]?.sku  ?? '',
    profit: Number(r._sum.profit ?? 0),
    unitsSold: r._sum.quantity ?? 0,
  }))

  return {
    today: {
      revenue:       Number(todaySales._sum.total         ?? 0),
      profit:        Number(todaySales._sum.profit        ?? 0),
      discounts:     Number(todaySales._sum.discountAmount ?? 0),
      transactions:  todaySales._count,
      avgSale:       todaySales._count > 0 ? Number(todaySales._sum.total ?? 0) / todaySales._count : 0,
    },
    week: {
      revenue:      Number(weekSales._sum.total  ?? 0),
      profit:       Number(weekSales._sum.profit ?? 0),
      transactions: weekSales._count,
    },
    month: {
      revenue:      Number(monthSales._sum.total  ?? 0),
      profit:       Number(monthSales._sum.profit ?? 0),
      transactions: monthSales._count,
    },
    bestCustomers:     bestCustomersList,
    topProfitProducts: topProfitList,
    todayTransactions: recentSales.map(s => ({
      receipt:   s.receiptNumber,
      customer:  s.customer?.name ?? 'Walk-in',
      total:     Number(s.total),
      profit:    Number(s.profit),
      items:     s.items.map(i => `${i.product.name} ×${i.quantity}`),
      payments:  s.payments.map(p => p.method.replace('_', ' ')).join(', '),
    })),
  }
}
