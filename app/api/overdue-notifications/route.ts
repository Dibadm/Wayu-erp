import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/with-auth'
import { prisma } from '@/lib/db'

function getPagination(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '100')))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

export async function GET(req: NextRequest) {
  const guard = await requirePermission('credit:view')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { page, limit, skip } = getPagination(req)

  const [notifications, total] = await Promise.all([
    prisma.overdueNotification.findMany({
      skip,
      take: limit,
      orderBy: { notifiedAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        arStatement: { select: { id: true, invoiceNo: true } },
      },
    }),
    prisma.overdueNotification.count(),
  ])

  return NextResponse.json({ notifications, total, page, limit })
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission('credit:manage')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const notification = await prisma.overdueNotification.create({
    data: {
      customerId: body.customerId,
      arStatementId: body.arStatementId,
      daysOutstanding: body.daysOutstanding,
      amount: body.amount,
      channel: body.channel ?? 'SYSTEM',
      notes: body.notes,
    },
    include: { customer: { select: { id: true, name: true } } },
  })

  return NextResponse.json(notification, { status: 201 })
}
