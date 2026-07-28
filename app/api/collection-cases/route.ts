import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/with-auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'

function getPagination(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '100')))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

export async function GET(req: NextRequest) {
  const guard = await requirePermission('collections:view', 'credit:view')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const { page, limit, skip } = getPagination(req)

  const where: any = {}
  if (status) where.status = status

  const [cases, total] = await Promise.all([
    prisma.collectionCase.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        arStatement: { select: { id: true, invoiceNo: true } },
        assignedToUser: { select: { name: true } },
      },
    }),
    prisma.collectionCase.count({ where }),
  ])

  return NextResponse.json({ cases, total, page, limit })
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission('collections:manage', 'credit:manage')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const case_ = await prisma.collectionCase.create({
    data: {
      caseNo: body.caseNo,
      customerId: body.customerId,
      arStatementId: body.arStatementId,
      amount: body.amount,
      assignedTo: body.assignedTo ?? (session.user as any).id,
      priority: body.priority ?? 'MEDIUM',
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      notes: body.notes,
    },
    include: {
      customer: { select: { id: true, name: true } },
      assignedToUser: { select: { name: true } },
    },
  })

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'CREATE',
    entity: 'CollectionCase',
    entityId: case_.id,
    entityName: case_.caseNo,
  })

  return NextResponse.json(case_, { status: 201 })
}
