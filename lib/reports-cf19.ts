// lib/reports-cf19.ts
// Phase 5: CF19-integrated reports — AR ledger, expenses, bank reconciliation,
// sales plan (budget vs actual), and weekly gross profit. All derivable from
// existing + new models; no hardcoded client figures.

import { prisma } from '@/lib/db'
import { num } from '@/lib/finance'
import { CalendarMode, ethiopianMonthLabel, gregorianMonthLabel, gregorianWeekNumber } from '@/lib/ethiopian-calendar'

// ─── Accounts Receivable ledger (CF19 Cr sells18 / CreditS) ───────────────────

export async function getARLedger(page = 1, limit = 100) {
  const skip = (page - 1) * limit

  const [customers, totalCustomers] = await Promise.all([
    prisma.customer.findMany({
      skip,
      take: limit,
      include: {
        sales: {
          where: { status: { in: ['COMPLETED'] } },
          include: { payments: { select: { amount: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    prisma.customer.count(),
  ])

  const ledger = customers
    .map(c => {
      const lines = c.sales.map(s => {
        const paid = s.payments.reduce((sum, p) => sum + num(p.amount), 0)
        const total = num(s.total)
        const outstanding = Math.max(0, total - paid)
        return { saleId: s.id, receipt: s.receiptNumber, date: s.createdAt, total, paid, outstanding }
      })
      const outstanding = lines.reduce((sum, l) => sum + l.outstanding, 0)
      return {
        customerId: c.id, name: c.name, tinNo: c.tinNo, taxable: c.taxable,
        outstanding,
        creditLines: lines.filter(l => l.outstanding > 0.01),
      }
    })
    .filter(c => c.outstanding > 0.01)

  const totalOutstanding = ledger.reduce((sum, c) => sum + c.outstanding, 0)
  return { ledger, totalOutstanding, totalCustomers, page, limit }
}

// ─── Expense reports (CF19 Trans → All Exp) ───────────────────────────────────

export async function getExpenseReport(from?: Date, to?: Date) {
  const where = from || to
    ? { incurredAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }
    : {}
  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { incurredAt: 'desc' },
    include: { createdBy: { select: { name: true } } },
  })
  const byCategory: Record<string, { debit: number; credit: number; net: number }> = {}
  for (const e of expenses) {
    const amt = num(e.amount)
    const cat = e.category
    if (!byCategory[cat]) byCategory[cat] = { debit: 0, credit: 0, net: 0 }
    if (e.type === 'DEBIT') byCategory[cat].debit += amt
    else byCategory[cat].credit += amt
    byCategory[cat].net += e.type === 'DEBIT' ? -amt : amt
  }
  const totalDebit = expenses.filter(e => e.type === 'DEBIT').reduce((s, e) => s + num(e.amount), 0)
  const totalCredit = expenses.filter(e => e.type === 'CREDIT').reduce((s, e) => s + num(e.amount), 0)
  return {
    expenses,
    byCategory: Object.entries(byCategory).map(([category, v]) => ({ category, ...v })),
    totalDebit, totalCredit, net: totalDebit - totalCredit,
  }
}

// ─── Weekly Gross Profit (CF19 wky R 19) ──────────────────────────────────────

export async function getWeeklyGP(mode: CalendarMode = 'gregorian', useAmharic = false, weeks = 12) {
  const since = new Date(Date.now() - weeks * 7 * 86400000)
  const sales = await prisma.sale.findMany({
    where: { status: 'COMPLETED', createdAt: { gte: since } },
    orderBy: { createdAt: 'asc' },
    include: { items: { include: { product: { select: { id: true, name: true, sku: true } } } } },
  })

  const map: Record<string, { gross: number; cogs: number; profit: number; qty: number; label: string }> = {}
  for (const s of sales) {
    const d = s.createdAt
    const key = mode === 'ethiopian'
      ? ethiopianMonthLabel(d, useAmharic) + ` W${gregorianWeekNumber(d)}`
      : `W${gregorianWeekNumber(d)} ${d.getFullYear()}`
    const cur = map[key] ?? (map[key] = { gross: 0, cogs: 0, profit: 0, qty: 0, label: key })
    for (const it of s.items) {
      cur.gross += num(it.lineTotal)
      cur.cogs += num(it.unitCost) * it.quantity
      cur.profit += num(it.profit)
      cur.qty += it.quantity
    }
  }
  const rows = Object.values(map)
  return { rows, totalGross: rows.reduce((s, r) => s + r.gross, 0), totalProfit: rows.reduce((s, r) => s + r.profit, 0) }
}

// ─── Sales Plan / budget vs actual (CF19 19 Sells plan) ───────────────────────

export async function getSalesPlan(periodStart: Date) {
  const periodEnd = new Date(periodStart)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const [plans, products] = await Promise.all([
    prisma.salesPlan.findMany({
      where: { periodStart },
      include: { product: { select: { sku: true, name: true } } },
    }),
    prisma.product.findMany({ select: { id: true, sku: true, name: true } }),
  ])

  const actuals = await prisma.sale.findMany({
    where: { status: 'COMPLETED', createdAt: { gte: periodStart, lt: periodEnd } },
    include: { items: { select: { productId: true, quantity: true, lineTotal: true } } },
  })
  const actualByProduct: Record<string, { qty: number; value: number }> = {}
  for (const s of actuals) {
    for (const it of s.items) {
      const a = actualByProduct[it.productId] ?? (actualByProduct[it.productId] = { qty: 0, value: 0 })
      a.qty += it.quantity
      a.value += num(it.lineTotal)
    }
  }

  const rows = plans.map(p => {
    const actual = actualByProduct[p.productId] ?? { qty: 0, value: 0 }
    const varianceQty = actual.qty - p.plannedQty
    const varianceVal = actual.value - num(p.plannedValue)
    return {
      productId: p.productId, sku: p.product.sku, name: p.product.name,
      plannedQty: p.plannedQty, plannedValue: num(p.plannedValue),
      actualQty: actual.qty, actualValue: actual.value,
      varianceQty, varianceValue: varianceVal,
      achievementPct: p.plannedQty > 0 ? (actual.qty / p.plannedQty) * 100 : 0,
    }
  })
  return { rows }
}

// ─── Bank reconciliation (CF19 Recon1888 / All Bank) ──────────────────────────

export async function getBankReconciliations() {
  const recs = await prisma.bankReconciliation.findMany({
    orderBy: { asOf: 'desc' },
    include: { createdBy: { select: { name: true } } },
  })
  return recs
}
