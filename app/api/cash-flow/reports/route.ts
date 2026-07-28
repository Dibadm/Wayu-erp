import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CashFlowCategory } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'daily'
  const date = searchParams.get('date')
  const start = searchParams.get('start')
  const to = searchParams.get('to')
  const month = searchParams.get('month')
  const bankAccountId = searchParams.get('bankAccountId')
  const loanId = searchParams.get('loanId')
  const periodStart = searchParams.get('periodStart')
  const periodEnd = searchParams.get('periodEnd')
  const from = searchParams.get('from')

  switch (type) {
    case 'daily': {
      const d = date ? new Date(date) : new Date()
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const dayEnd = new Date(dayStart.getTime() + 86400000)
      const inflows = await prisma.cashInflow.aggregate({ where: { receivedAt: { gte: dayStart, lt: dayEnd } }, _sum: { amount: true } })
      const outflows = await prisma.cashOutflow.aggregate({ where: { paidAt: { gte: dayStart, lt: dayEnd } }, _sum: { amount: true } })
      return NextResponse.json({ type: 'daily', date: d.toISOString().split('T')[0], totalInflows: Number(inflows._sum?.amount ?? 0), totalOutflows: Number(outflows._sum?.amount ?? 0), net: Number(inflows._sum?.amount ?? 0) - Number(outflows._sum?.amount ?? 0) })
    }
    case 'weekly': {
      const s = start ? new Date(start) : new Date()
      const weekEnd = new Date(s.getTime() + 7 * 86400000)
      const inflows = await prisma.cashInflow.aggregate({ where: { receivedAt: { gte: s, lt: weekEnd } }, _sum: { amount: true } })
      const outflows = await prisma.cashOutflow.aggregate({ where: { paidAt: { gte: s, lt: weekEnd } }, _sum: { amount: true } })
      return NextResponse.json({ type: 'weekly', start: s.toISOString(), end: weekEnd.toISOString(), totalInflows: Number(inflows._sum?.amount ?? 0), totalOutflows: Number(outflows._sum?.amount ?? 0), net: Number(inflows._sum?.amount ?? 0) - Number(outflows._sum?.amount ?? 0) })
    }
    case 'monthly': {
      const m = month ? new Date(month + '-01') : new Date()
      const monthStart = new Date(m.getFullYear(), m.getMonth(), 1)
      const monthEnd = new Date(m.getFullYear(), m.getMonth() + 1, 1)
      const inflows = await prisma.cashInflow.aggregate({ where: { receivedAt: { gte: monthStart, lt: monthEnd } }, _sum: { amount: true } })
      const outflows = await prisma.cashOutflow.aggregate({ where: { paidAt: { gte: monthStart, lt: monthEnd } }, _sum: { amount: true } })
      return NextResponse.json({ type: 'monthly', month: monthStart.toISOString().slice(0, 7), totalInflows: Number(inflows._sum?.amount ?? 0), totalOutflows: Number(outflows._sum?.amount ?? 0), net: Number(inflows._sum?.amount ?? 0) - Number(outflows._sum?.amount ?? 0) })
    }
    case 'bank-balance': {
      const where: any = { isActive: true }
      if (bankAccountId) where.id = bankAccountId
      const accounts = await prisma.bankAccount.findMany({ where })
      const balances = await Promise.all(accounts.map(async (acct) => {
        const inflows = await prisma.cashInflow.aggregate({ where: { bankAccountId: acct.id }, _sum: { amount: true } })
        const outflows = await prisma.cashOutflow.aggregate({ where: { bankAccountId: acct.id }, _sum: { amount: true } })
        return { id: acct.id, accountName: acct.accountName, accountNumber: acct.accountNumber, bankName: acct.bankName, currentBalance: acct.currentBalance }
      }))
      return NextResponse.json({ type: 'bank-balance', bankAccountId: bankAccountId ?? null, accounts: balances })
    }
    case 'expense-analysis': {
      const where: any = {}
      if (from) where.paidAt = { gte: new Date(from) }
      if (to) { where.paidAt = { ...where.paidAt, lte: new Date(to) } }
      const byCategory = await prisma.cashOutflow.groupBy({ by: ['category'], where, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } })
      const total = byCategory.reduce((sum, r) => sum + Number(r._sum?.amount ?? 0), 0)
      return NextResponse.json({ type: 'expense-analysis', from, to, byCategory: byCategory.map(r => ({ category: r.category, total: Number(r._sum?.amount ?? 0), pct: total > 0 ? (Number(r._sum?.amount ?? 0) / total) * 100 : 0 })), grandTotal: total })
    }
    case 'budget-vs-actual': {
      const ps = periodStart ? new Date(periodStart) : new Date(new Date().getFullYear(), 0, 1)
      const pe = periodEnd ? new Date(periodEnd) : new Date()
      const budgets = await prisma.budget.findMany({ where: { periodStart: { gte: ps, lte: pe } } })
      const inflows = await prisma.cashInflow.aggregate({ where: { receivedAt: { gte: ps, lte: pe } }, _sum: { amount: true } })
      const outflows = await prisma.cashOutflow.aggregate({ where: { paidAt: { gte: ps, lte: pe } }, _sum: { amount: true } })
      const inflowTotal = Number(inflows._sum?.amount ?? 0)
      const outflowTotal = Number(outflows._sum?.amount ?? 0)
      const result = budgets.map(b => ({
        category: b.category, periodLabel: b.periodLabel,
        planned: b.plannedAmount,
        actualInflows: inflowTotal,
        actualOutflows: outflowTotal,
        variance: Number(b.plannedAmount) - outflowTotal,
      }))
      return NextResponse.json({ type: 'budget-vs-actual', periodStart: ps.toISOString(), periodEnd: pe.toISOString, budgets: result })
    }
    case 'expense-category-summary': {
      const where: any = {}
      if (from) where.paidAt = { gte: new Date(from) }
      if (to) { where.paidAt = { ...where.paidAt, lte: new Date(to) } }
      const summary = await prisma.cashOutflow.groupBy({ by: ['category'], where, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } })
      return NextResponse.json({ type: 'expense-category-summary', from, to, summary: summary.map(r => ({ category: r.category, total: Number(r._sum?.amount ?? 0) })) })
    }
    case 'loan-repayment': {
      if (!loanId) return NextResponse.json({ error: 'loanId required for loan-repayment report' }, { status: 400 })
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { repayments: { orderBy: { paidAt: 'asc' } } },
      })
      if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
      const totalRepaid = loan.repayments.reduce((s, r) => s + Number(r.amount), 0)
      const totalPrincipal = loan.repayments.reduce((s, r) => s + Number(r.principal), 0)
      const totalInterest = loan.repayments.reduce((s, r) => s + Number(r.interest), 0)
      return NextResponse.json({ type: 'loan-repayment', loan, repayments: loan.repayments, summary: { totalRepaid, totalPrincipal, totalInterest, remainingPrincipal: Number(loan.principal) - totalPrincipal } })
    }
    case 'investment-report': {
      const investments = await prisma.investment.findMany({ orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { name: true } } } })
      return NextResponse.json({ type: 'investment-report', investments })
    }
    default:
      return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 })
  }
}