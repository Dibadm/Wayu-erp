import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { Role } from '@prisma/client'
import { CashFlowCategory } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') as CashFlowCategory | null
  const periodStart = searchParams.get('periodStart')
  const periodEnd = searchParams.get('periodEnd')
  const where: any = {}
  if (category) where.category = category
  if (periodStart) where.periodStart = { gte: new Date(periodStart) }
  if (periodEnd) {
    if (!where.periodStart) where.periodStart = {}
    where.periodStart.lte = new Date(periodEnd)
  }
  const budgets = await prisma.budget.findMany({
    where, orderBy: { periodStart: 'asc' },
  })
  const ps = periodStart ? new Date(periodStart) : budgets[0]?.periodStart ?? new Date(new Date().getFullYear(), 0, 1)
  const pe = periodEnd ? new Date(periodEnd) : budgets[0]?.periodEnd ?? new Date()
  const [totalInflows, totalOutflows] = await Promise.all([
    prisma.cashInflow.aggregate({ where: { receivedAt: { gte: ps, lte: pe } }, _sum: { amount: true } }),
    prisma.cashOutflow.aggregate({ where: { paidAt: { gte: ps, lte: pe } }, _sum: { amount: true } }),
  ])
  return NextResponse.json({ budgets, totals: { inflows: totalInflows._sum?.amount ?? 0, outflows: totalOutflows._sum?.amount ?? 0 } })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.category || !body.periodStart || !body.periodEnd || body.plannedAmount === undefined) {
    return NextResponse.json({ error: 'category, periodStart, periodEnd, and plannedAmount are required' }, { status: 400 })
  }
  const where: any = { category: body.category as CashFlowCategory, periodStart: new Date(body.periodStart) }
  const upserted = await prisma.budget.upsert({
    where,
    create: { ...body, periodStart: new Date(body.periodStart), periodEnd: new Date(body.periodEnd), plannedAmount: body.plannedAmount },
    update: { periodEnd: new Date(body.periodEnd), plannedAmount: body.plannedAmount },
  })
  await writeAuditLog({ userId: (session.user as any).id, action: 'CREATE', entity: 'Budget', entityId: upserted.id, entityName: `${upserted.category} ${upserted.periodLabel}`, reason: 'Budget created/updated' })
  return NextResponse.json(upserted)
}