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
  const guard = await requirePermission('credit:view')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const customerId = searchParams.get('customerId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const { page, limit, skip } = getPagination(req)

  const where: any = {}
  if (status) where.status = status
  if (customerId) where.customerId = customerId
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom && { gte: new Date(dateFrom) }),
      ...(dateTo && { lte: new Date(dateTo) }),
    }
  }

  const [applications, total] = await Promise.all([
    prisma.creditApplication.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        profile: { select: { id: true, creditLimit: true } },
      },
    }),
    prisma.creditApplication.count({ where }),
  ])

  return NextResponse.json({ applications, total, page, limit })
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission('credit:manage')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { customerId, requestedLimit, requestedTerms, purpose } = body

  const application = await prisma.creditApplication.create({
    data: {
      applicationNo: `CA-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      customer: { connect: { id: customerId } },
      requestedLimit,
      requestedTerms,
      purpose,
    },
    include: {
      customer: { select: { id: true, name: true, email: true } },
    },
  })

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'CREATE',
    entity: 'CreditApplication',
    entityId: application.id,
    entityName: application.applicationNo,
  })

  return NextResponse.json(application, { status: 201 })
}
