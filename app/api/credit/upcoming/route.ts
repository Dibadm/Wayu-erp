// app/api/credit/upcoming/route.ts
// Upcoming AR statements with days remaining until due date.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/with-auth'
import { prisma } from '@/lib/db'
import { getARTier, arTierLabel } from '@/lib/ar-upcoming'

export async function GET(req: NextRequest) {
  const guard = await requirePermission('credit:view', 'reports:view')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') ?? '30')))

  const now = new Date()
  const windowEnd = new Date(now.getTime() + days * 86400000)

  const statements = await prisma.aRStatement.findMany({
    where: {
      status: { in: ['OPEN', 'PARTIAL'] },
      dueDate: { lte: windowEnd },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      sale: { select: { receiptNumber: true } },
    },
    orderBy: { dueDate: 'asc' },
  })

  const data = statements.map(s => {
    const daysLeft = Math.floor((new Date(s.dueDate!).getTime() - now.getTime()) / 86400000)
    const tier = getARTier(daysLeft)
    return {
      id: s.id,
      customerId: s.customerId,
      customerName: s.customer?.name ?? '—',
      customerPhone: s.customer?.phone,
      invoiceNo: s.invoiceNo,
      receiptNumber: s.sale?.receiptNumber,
      issuedAt: s.issuedAt.toISOString(),
      dueDate: s.dueDate?.toISOString(),
      daysLeft,
      amount: Number(s.amount),
      paid: Number(s.paid),
      balance: Number(s.amount) - Number(s.paid),
      status: s.status,
      tier,
      tierLabel: arTierLabel(tier),
    }
  })

  const counts = { overdue: 0, critical: 0, warning: 0, soon: 0, ok: 0 }
  for (const row of data) counts[row.tier]++

  return NextResponse.json({ data, counts, windowDays: days })
}
