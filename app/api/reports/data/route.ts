// app/api/reports/data/route.ts
// Returns JSON data for report view pages.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getARAgingReport } from '@/lib/credit'
import { formatDate } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'inventory'
  const dateFrom = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 30 * 86400000)
  const dateTo = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date()

  switch (type) {
    case 'inventory': {
      const [products, movements, batches] = await Promise.all([
        prisma.product.findMany({
          orderBy: { name: 'asc' },
          include: {
            locationInventory: { include: { location: true } },
            batches: { where: { status: 'ACTIVE' }, orderBy: { expiryDate: 'asc' } },
          },
        }),
        prisma.movement.findMany({
          orderBy: { timestamp: 'desc' },
          take: 500,
          include: {
            product: { select: { name: true, sku: true } },
            user: { select: { name: true, email: true } },
            location: { select: { name: true, code: true } },
            batch: { select: { batchNumber: true, expiryDate: true } },
          },
        }),
        prisma.batch.findMany({
          where: { status: 'ACTIVE' },
          orderBy: { expiryDate: 'asc' },
          include: {
            product: { select: { name: true, sku: true } },
            location: { select: { name: true } },
          },
        }),
      ])
      return NextResponse.json({ products, movements, batches })
    }

    case 'valuation': {
      const products = await prisma.product.findMany({
        orderBy: { name: 'asc' },
        select: {
          sku: true, name: true, category: true, quantity: true, unit: true,
          costPrice: true, sellingPrice: true,
        },
      })
      return NextResponse.json({ products })
    }

    case 'dead-stock': {
      const products = await prisma.product.findMany({
        orderBy: { name: 'asc' },
        include: {
          movements: { orderBy: { timestamp: 'desc' }, take: 1, select: { timestamp: true } },
          batches: { where: { status: 'ACTIVE' }, select: { quantity: true } },
        },
      })
      const now = new Date()
      const deadStock = products
        .map(p => {
          const lastMovement = p.movements[0]?.timestamp
          const daysSinceMovement = lastMovement
            ? Math.floor((now.getTime() - new Date(lastMovement).getTime()) / 86400000)
            : Math.floor((now.getTime() - new Date(p.createdAt).getTime()) / 86400000)
          const totalQty = p.batches.reduce((s, b) => s + b.quantity, 0)
          return { ...p, daysSinceMovement, totalQty }
        })
        .filter(p => p.daysSinceMovement >= 90 && p.totalQty > 0)
      return NextResponse.json({ deadStock })
    }

    case 'monthly-received': {
      const movements = await prisma.movement.findMany({
        where: { type: 'IN', timestamp: { gte: dateFrom, lte: dateTo } },
        orderBy: { timestamp: 'desc' },
        include: {
          product: { select: { name: true, sku: true, category: true } },
          location: { select: { code: true } },
        },
      })
      const grouped: Record<string, { month: string; sku: string; name: string; category: string; totalQty: number; locations: string[] }> = {}
      movements.forEach(m => {
        const month = new Date(m.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        const key = `${month}-${m.product.sku}`
        if (!grouped[key]) grouped[key] = { month, sku: m.product.sku, name: m.product.name, category: m.product.category, totalQty: 0, locations: [] }
        grouped[key].totalQty += m.quantity
        const loc = m.location?.code ?? '—'
        if (!grouped[key].locations.includes(loc)) grouped[key].locations.push(loc)
      })
      return NextResponse.json({ data: Object.values(grouped) })
    }

    case 'monthly-sold': {
      const sales = await prisma.sale.findMany({
        where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo } },
        include: {
          items: { include: { product: { select: { name: true, sku: true, category: true } } } },
        },
      })
      const grouped: Record<string, { month: string; sku: string; name: string; category: string; totalQty: number; totalRevenue: number }> = {}
      sales.forEach(s => {
        const month = new Date(s.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        s.items.forEach(item => {
          const key = `${month}-${item.product.sku}`
          if (!grouped[key]) grouped[key] = { month, sku: item.product.sku, name: item.product.name, category: item.product.category, totalQty: 0, totalRevenue: 0 }
          grouped[key].totalQty += item.quantity
          grouped[key].totalRevenue += Number(item.lineTotal)
        })
      })
      return NextResponse.json({ data: Object.values(grouped) })
    }

    case 'adjustment-history': {
      const movements = await prisma.movement.findMany({
        where: { type: 'ADJUSTMENT' },
        orderBy: { timestamp: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          user: { select: { name: true, email: true } },
          location: { select: { name: true, code: true } },
        },
      })
      return NextResponse.json({ movements })
    }

    case 'fast-slow-moving': {
      const products = await prisma.product.findMany({
        orderBy: { name: 'asc' },
        include: {
          saleItems: {
            where: { sale: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] } } },
            include: { sale: { select: { createdAt: true } } },
          },
        },
      })
      const now = new Date()
      const data = products.map(p => {
        const totalSold = p.saleItems.reduce((s, i) => s + i.quantity, 0)
        const lastSale = p.saleItems.length > 0 ? new Date(Math.max(...p.saleItems.map(i => new Date(i.sale.createdAt).getTime()))) : null
        const daysSinceLastSale = lastSale ? Math.floor((now.getTime() - lastSale.getTime()) / 86400000) : Math.floor((now.getTime() - new Date(p.createdAt).getTime()) / 86400000)
        return {
          sku: p.sku, name: p.name, category: p.category, currentStock: p.quantity, totalSold,
          salesCount: p.saleItems.length, daysSinceLastSale,
          velocity: daysSinceLastSale > 0 ? (totalSold / daysSinceLastSale).toFixed(2) : '—',
        }
      })
      return NextResponse.json({
        fastMoving: data.filter(d => d.daysSinceLastSale <= 30 && d.totalSold > 0).sort((a, b) => Number(b.velocity) - Number(a.velocity)),
        slowMoving: data.filter(d => d.daysSinceLastSale > 60 || d.totalSold === 0).sort((a, b) => a.daysSinceLastSale - b.daysSinceLastSale),
      })
    }

    case 'outstanding-receivable': {
      const statements = await prisma.aRStatement.findMany({
        where: { status: { not: 'PAID' } },
        include: { customer: { select: { name: true, email: true, phone: true } }, sale: { select: { receiptNumber: true } } },
        orderBy: { dueDate: 'asc' },
      })
      return NextResponse.json({ statements })
    }

    case 'aging-analysis': {
      const { report, totals } = await getARAgingReport()
      return NextResponse.json({ report, totals })
    }

    case 'customer-credit-summary': {
      const profiles = await prisma.creditProfile.findMany({
        include: { customer: { select: { name: true, email: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ profiles })
    }

    case 'overdue-customers': {
      const { report } = await getARAgingReport()
      const overdue = report.filter(r => (Number(r.bucket31to60) + Number(r.bucket61to90) + Number(r.bucket90plus)) > 0)
      return NextResponse.json({ overdue })
    }

    case 'collection-performance': {
      const cases = await prisma.collectionCase.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          arStatement: { select: { amount: true, paid: true } },
        },
      })
      return NextResponse.json({ cases })
    }

    case 'credit-exposure': {
      const [statements, profiles] = await Promise.all([
        prisma.aRStatement.findMany({
          where: { status: { not: 'PAID' } },
          include: { customer: { select: { name: true, email: true, phone: true } } },
          orderBy: { dueDate: 'asc' },
        }),
        prisma.creditProfile.findMany({
          include: { customer: { select: { name: true, email: true, phone: true } } },
        }),
      ])
      const profileMap = new Map(profiles.map(p => [p.customerId, p]))
      const grouped: Record<string, { customer: any; totalExposure: number; openInvoices: number; creditLimit: number; utilized: number; available: number; riskLevel: string }> = {}
      statements.forEach(s => {
        const key = s.customerId
        if (!grouped[key]) {
          const profile = profileMap.get(key)
          grouped[key] = {
            customer: s.customer,
            totalExposure: 0,
            openInvoices: 0,
            creditLimit: Number(profile?.creditLimit ?? 0),
            utilized: Number(profile?.utilizedCredit ?? 0),
            available: Number(profile?.availableCredit ?? 0),
            riskLevel: profile?.riskLevel ?? 'LOW',
          }
        }
        grouped[key].totalExposure += Number(s.amount) - Number(s.paid)
        grouped[key].openInvoices += 1
      })
      return NextResponse.json({ data: Object.values(grouped) })
    }

    case 'payment-history': {
      const payments = await prisma.salePayment.findMany({
        orderBy: { id: 'desc' },
        include: { sale: { select: { createdAt: true, total: true, receiptNumber: true, customer: { select: { name: true } } } } },
      })
      return NextResponse.json({ payments })
    }

    case 'daily-collection': {
      const inflows = await prisma.cashInflow.findMany({
        where: { receivedAt: { gte: dateFrom, lte: dateTo } },
        orderBy: { receivedAt: 'desc' },
        include: {
          bankAccount: { select: { bankName: true, accountNumber: true } },
          createdBy: { select: { name: true } },
        },
      })
      const grouped: Record<string, { date: string; totalCash: number; totalBank: number; totalSales: number; totalOther: number; transactions: number }> = {}
      inflows.forEach(inflow => {
        const date = new Date(inflow.receivedAt).toISOString().split('T')[0]
        if (!grouped[date]) grouped[date] = { date, totalCash: 0, totalBank: 0, totalSales: 0, totalOther: 0, transactions: 0 }
        grouped[date].transactions += 1
        const amount = Number(inflow.amount)
        if (inflow.category === 'SALES') {
          if (inflow.bankAccountId) grouped[date].totalBank += amount
          else grouped[date].totalCash += amount
          grouped[date].totalSales += amount
        } else {
          grouped[date].totalOther += amount
        }
      })
      return NextResponse.json({ data: Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date)) })
    }

    case 'daily-cashflow':
    case 'weekly-cashflow':
    case 'monthly-cashflow': {
      const [inflows, outflows] = await Promise.all([
        prisma.cashInflow.findMany({ include: { bankAccount: { select: { bankName: true, accountNumber: true } }, createdBy: { select: { name: true } } } }),
        prisma.cashOutflow.findMany({ include: { bankAccount: { select: { bankName: true, accountNumber: true } }, createdBy: { select: { name: true } } } }),
      ])
      if (type === 'daily-cashflow') {
        const daily: Record<string, { inflows: number; outflows: number }> = {}
        inflows.forEach(i => { const d = new Date(i.receivedAt).toISOString().split('T')[0]; if (!daily[d]) daily[d] = { inflows: 0, outflows: 0 }; daily[d].inflows += Number(i.amount) })
        outflows.forEach(o => { const d = new Date(o.paidAt).toISOString().split('T')[0]; if (!daily[d]) daily[d] = { inflows: 0, outflows: 0 }; daily[d].outflows += Number(o.amount) })
        return NextResponse.json({ data: Object.entries(daily).sort((a, b) => b[0].localeCompare(a[0])).map(([date, d]) => ({ date, ...d })) })
      } else if (type === 'weekly-cashflow') {
        const weekly: Record<string, { label: string; inflows: number; outflows: number; start: string }> = {}
        inflows.forEach(i => {
          const d = new Date(i.receivedAt); const start = new Date(d); start.setDate(d.getDate() - d.getDay()); const key = start.toISOString().split('T')[0]
          if (!weekly[key]) weekly[key] = { label: `Week of ${start.toISOString().split('T')[0]}`, inflows: 0, outflows: 0, start: start.toISOString().split('T')[0] }
          weekly[key].inflows += Number(i.amount)
        })
        outflows.forEach(o => {
          const d = new Date(o.paidAt); const start = new Date(d); start.setDate(d.getDate() - d.getDay()); const key = start.toISOString().split('T')[0]
          if (!weekly[key]) weekly[key] = { label: `Week of ${start.toISOString().split('T')[0]}`, inflows: 0, outflows: 0, start: start.toISOString().split('T')[0] }
          weekly[key].outflows += Number(o.amount)
        })
        return NextResponse.json({ data: Object.values(weekly).sort((a, b) => b.start.localeCompare(a.start)) })
      } else {
        const monthly: Record<string, { label: string; inflows: number; outflows: number }> = {}
        inflows.forEach(i => {
          const label = new Date(i.receivedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
          if (!monthly[label]) monthly[label] = { label, inflows: 0, outflows: 0 }
          monthly[label].inflows += Number(i.amount)
        })
        outflows.forEach(o => {
          const label = new Date(o.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
          if (!monthly[label]) monthly[label] = { label, inflows: 0, outflows: 0 }
          monthly[label].outflows += Number(o.amount)
        })
        return NextResponse.json({ data: Object.values(monthly).sort((a, b) => b.label.localeCompare(a.label)) })
      }
    }

    case 'bank-balance': {
      const accounts = await prisma.bankAccount.findMany({ where: { isActive: true }, orderBy: { bankName: 'asc' } })
      return NextResponse.json({ accounts })
    }

    case 'expense-analysis':
    case 'expense-category-summary': {
      const expenses = await prisma.expense.findMany({ orderBy: { incurredAt: 'desc' }, include: { createdBy: { select: { name: true } } } })
      const byCategory: Record<string, number> = {}
      expenses.filter(e => e.type === 'DEBIT').forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount) })
      const total = Object.values(byCategory).reduce((s, v) => s + v, 0)
      const data = Object.entries(byCategory).map(([category, totalAmount]) => ({
        category,
        total: totalAmount.toFixed(2),
        pct: total > 0 ? `${((totalAmount / total) * 100).toFixed(1)}%` : '0%',
      })).sort((a, b) => Number(b.total) - Number(a.total))
      return NextResponse.json({ data, total: total.toFixed(2) })
    }

    case 'budget-vs-actual': {
      const [budgets, inflows, outflows] = await Promise.all([
        prisma.budget.findMany({ orderBy: { periodStart: 'asc' } }),
        prisma.cashInflow.findMany(),
        prisma.cashOutflow.findMany(),
      ])
      const data = budgets.map(b => {
        const actualIn = inflows.filter(i => i.category === b.category && new Date(i.receivedAt) >= b.periodStart && new Date(i.receivedAt) <= b.periodEnd).reduce((s, i) => s + Number(i.amount), 0)
        const actualOut = outflows.filter(o => o.category === b.category && new Date(o.paidAt) >= b.periodStart && new Date(o.paidAt) <= b.periodEnd).reduce((s, o) => s + Number(o.amount), 0)
        const variance = actualIn - actualOut - Number(b.plannedAmount)
        return {
          period: b.periodLabel,
          category: b.category,
          planned: Number(b.plannedAmount).toFixed(2),
          actualIn: actualIn.toFixed(2),
          actualOut: actualOut.toFixed(2),
          variance: variance.toFixed(2),
        }
      })
      return NextResponse.json({ data })
    }

    case 'loan-repayment': {
      const loans = await prisma.loan.findMany({ orderBy: { startDate: 'desc' }, include: { repayments: { orderBy: { paidAt: 'desc' } }, createdBy: { select: { name: true } } } })
      return NextResponse.json({ loans })
    }

    case 'investment-report': {
      const investments = await prisma.investment.findMany({ orderBy: { startDate: 'desc' }, include: { createdBy: { select: { name: true } } } })
      return NextResponse.json({ investments })
    }

    case 'daily-sales':
    case 'weekly-sales':
    case 'monthly-sales': {
      const sales = await prisma.sale.findMany({
        where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo } },
        include: { items: true },
      })
      if (type === 'daily-sales') {
        const daily: Record<string, { totalSales: number; totalItems: number; totalProfit: number; transactions: number }> = {}
        sales.forEach(s => {
          const day = new Date(s.createdAt).toISOString().split('T')[0]
          if (!daily[day]) daily[day] = { totalSales: 0, totalItems: 0, totalProfit: 0, transactions: 0 }
          daily[day].totalSales += Number(s.total); daily[day].totalItems += s.items.length; daily[day].totalProfit += Number(s.profit ?? 0); daily[day].transactions += 1
        })
        return NextResponse.json({ data: Object.entries(daily).sort((a, b) => b[0].localeCompare(a[0])).map(([period, d]) => ({ period, ...d })) })
      } else if (type === 'weekly-sales') {
        const weekly: Record<string, { label: string; totalSales: number; totalItems: number; totalProfit: number; transactions: number }> = {}
        sales.forEach(s => {
          const d = new Date(s.createdAt); const start = new Date(d); start.setDate(d.getDate() - d.getDay()); const label = `Week of ${start.toISOString().split('T')[0]}`
          if (!weekly[label]) weekly[label] = { label, totalSales: 0, totalItems: 0, totalProfit: 0, transactions: 0 }
          weekly[label].totalSales += Number(s.total); weekly[label].totalItems += s.items.length; weekly[label].totalProfit += Number(s.profit ?? 0); weekly[label].transactions += 1
        })
        return NextResponse.json({ data: Object.values(weekly).sort((a, b) => b.label.localeCompare(a.label)) })
      } else {
        const monthly: Record<string, { label: string; totalSales: number; totalItems: number; totalProfit: number; transactions: number }> = {}
        sales.forEach(s => {
          const label = new Date(s.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
          if (!monthly[label]) monthly[label] = { label, totalSales: 0, totalItems: 0, totalProfit: 0, transactions: 0 }
          monthly[label].totalSales += Number(s.total); monthly[label].totalItems += s.items.length; monthly[label].totalProfit += Number(s.profit ?? 0); monthly[label].transactions += 1
        })
        return NextResponse.json({ data: Object.values(monthly).sort((a, b) => b.label.localeCompare(a.label)) })
      }
    }

    case 'product-sales-analysis': {
      const saleItems = await prisma.saleItem.findMany({
        where: { sale: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo } } },
        include: { product: { select: { name: true, sku: true, category: true, costPrice: true, sellingPrice: true } }, sale: { select: { createdAt: true } } },
      })
      const grouped: Record<string, any> = {}
      saleItems.forEach(item => {
        const key = item.productId
        if (!grouped[key]) grouped[key] = { sku: item.product.sku, name: item.product.name, category: item.product.category, totalQty: 0, totalRevenue: 0, totalCost: 0, transactions: 0 }
        grouped[key].totalQty += item.quantity; grouped[key].totalRevenue += Number(item.lineTotal); grouped[key].totalCost += Number(item.unitCost) * item.quantity; grouped[key].transactions += 1
      })
      const data = Object.values(grouped).map(g => ({
        ...g,
        profit: (g.totalRevenue - g.totalCost).toFixed(2),
        margin: g.totalRevenue > 0 ? `${((g.totalRevenue - g.totalCost) / g.totalRevenue * 100).toFixed(1)}%` : '0%',
      }))
      return NextResponse.json({ data })
    }

    case 'customer-sales-analysis': {
      const sales = await prisma.sale.findMany({
        where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo }, customerId: { not: null } },
        include: { customer: { select: { name: true, email: true, phone: true } }, items: true, payments: true },
      })
      const grouped: Record<string, any> = {}
      sales.forEach(s => {
        const key = s.customerId!
        if (!grouped[key]) grouped[key] = { customerName: s.customer?.name ?? '—', email: s.customer?.email ?? '—', phone: s.customer?.phone ?? '—', totalSales: 0, totalPaid: 0, totalProfit: 0, transactions: 0 }
        grouped[key].totalSales += Number(s.total); grouped[key].totalPaid += s.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0); grouped[key].totalProfit += Number(s.profit ?? 0); grouped[key].transactions += 1
      })
      const data = Object.values(grouped).map(g => ({
        ...g,
        avgOrderValue: g.transactions > 0 ? (g.totalSales / g.transactions) : 0,
      })).sort((a, b) => b.totalSales - a.totalSales)
      return NextResponse.json({ data })
    }

    case 'sales-trend': {
      const sales = await prisma.sale.findMany({
        where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo } },
        include: { items: true },
      })
      const daily: Record<string, { revenue: number; profit: number; transactions: number }> = {}
      sales.forEach(s => {
        const day = new Date(s.createdAt).toISOString().split('T')[0]
        if (!daily[day]) daily[day] = { revenue: 0, profit: 0, transactions: 0 }
        daily[day].revenue += Number(s.total); daily[day].profit += Number(s.profit ?? 0); daily[day].transactions += 1
      })
      return NextResponse.json({ data: Object.entries(daily).map(([date, d]) => ({ date, ...d })).sort((a, b) => a.date.localeCompare(b.date)) })
    }

    case 'top-selling-products': {
      const saleItems = await prisma.saleItem.findMany({
        where: { sale: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo } } },
        include: { product: { select: { name: true, sku: true, category: true } } },
      })
      const grouped: Record<string, { sku: string; name: string; category: string; totalQty: number; totalRevenue: number }> = {}
      saleItems.forEach(item => {
        const key = item.productId
        if (!grouped[key]) grouped[key] = { sku: item.product.sku, name: item.product.name, category: item.product.category, totalQty: 0, totalRevenue: 0 }
        grouped[key].totalQty += item.quantity; grouped[key].totalRevenue += Number(item.lineTotal)
      })
      return NextResponse.json({ data: Object.values(grouped).sort((a, b) => b.totalRevenue - a.totalRevenue) })
    }

    case 'salesperson-performance': {
      const sales = await prisma.sale.findMany({
        where: { status: { in: ['COMPLETED', 'PARTIAL_REFUND'] }, createdAt: { gte: dateFrom, lte: dateTo }, salespersonId: { not: null } },
        include: { salesperson: { select: { name: true, email: true } }, items: true },
      })
      const grouped: Record<string, { name: string; email: string; totalSales: number; totalProfit: number; transactions: number; totalCommission: number }> = {}
      sales.forEach(s => {
        const key = s.salespersonId!
        if (!grouped[key]) grouped[key] = { name: s.salesperson?.name ?? '—', email: s.salesperson?.email ?? '—', totalSales: 0, totalProfit: 0, transactions: 0, totalCommission: 0 }
        grouped[key].totalSales += Number(s.total); grouped[key].totalProfit += Number(s.profit ?? 0); grouped[key].transactions += 1
        const commission = s.items.reduce((sum: number, item: any) => sum + Number(item.commissionAmount ?? 0), 0)
        grouped[key].totalCommission += commission
      })
      const data = Object.values(grouped).map(g => ({
        ...g,
        avgSaleValue: g.transactions > 0 ? (g.totalSales / g.transactions) : 0,
      })).sort((a, b) => b.totalSales - a.totalSales)
      return NextResponse.json({ data })
    }

    default:
      return NextResponse.json({ error: 'Invalid report type.' }, { status: 400 })
  }
}
