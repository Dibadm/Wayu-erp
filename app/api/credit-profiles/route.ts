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
  const search = searchParams.get('search') ?? ''
  const { page, limit, skip } = getPagination(req)

  const where: any = {}
  if (search) {
    where.customer = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }
  }

  const [profiles, total] = await Promise.all([
    prisma.creditProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        approvedByUser: { select: { name: true } },
      },
    }),
    prisma.creditProfile.count({ where }),
  ])

  return NextResponse.json({ profiles, total, page, limit })
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission('credit:manage')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { customerId, creditLimit, paymentTerms, notes } = body

  const existing = await prisma.creditProfile.findUnique({ where: { customerId } })
  if (existing) return NextResponse.json({ error: 'Credit profile already exists' }, { status: 409 })

  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const profile = await prisma.creditProfile.create({
    data: {
      customerId,
      creditLimit,
      availableCredit: creditLimit,
      utilizedCredit: 0,
      paymentTerms: paymentTerms ?? 30,
      notes,
      approvedBy: (session.user as any).id,
      approvedAt: new Date(),
    },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
    },
  })

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'CREATE',
    entity: 'CreditProfile',
    entityId: profile.id,
    entityName: `Profile for ${customer.name}`,
  })

  return NextResponse.json(profile, { status: 201 })
}
