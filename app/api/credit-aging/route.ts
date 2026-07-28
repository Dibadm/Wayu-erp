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
  const guard = await requirePermission('aging:view', 'credit:view')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customerId')
  const { page, limit, skip } = getPagination(req)

  const where: any = {}
  if (customerId) where.customerId = customerId

  const [aging, total] = await Promise.all([
    prisma.creditAging.findMany({
      where,
      skip,
      take: limit,
      orderBy: { asOf: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.creditAging.count({ where }),
  ])

  return NextResponse.json({ aging, total, page, limit })
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission('aging:reports', 'credit:manage')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { customerId, bucket0to30, bucket31to60, bucket61to90, bucket90plus, total } = body

  const aging = await prisma.creditAging.create({
    data: {
      customerId,
      bucket0to30: bucket0to30 ?? 0,
      bucket31to60: bucket31to60 ?? 0,
      bucket61to90: bucket61to90 ?? 0,
      bucket90plus: bucket90plus ?? 0,
      total: total ?? 0,
      asOf: new Date(),
    },
    include: { customer: { select: { id: true, name: true } } },
  })

  return NextResponse.json(aging, { status: 201 })
}
