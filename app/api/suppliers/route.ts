import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { supplierSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') // ACTIVE | INACTIVE | null = all

  const suppliers = await prisma.supplier.findMany({
    where: {
      ...(search && {
        OR: [
          { name:          { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { email:         { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status: status as 'ACTIVE' | 'INACTIVE' }),
    },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { purchaseOrders: true } },
    },
  })

  return NextResponse.json(suppliers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'VIEWER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = supplierSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supplier = await prisma.supplier.create({ data: parsed.data })

  await writeAuditLog({
    userId: session.user.id,
    action: 'CREATE',
    entity: 'Supplier',
    entityId: supplier.id,
    entityName: supplier.name,
    changes: { created: { before: null, after: parsed.data } },
  })

  return NextResponse.json(supplier, { status: 201 })
}
