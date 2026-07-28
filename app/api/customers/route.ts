import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { customerSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''

  const customers = await prisma.customer.findMany({
    where: search ? {
      OR: [
        { name:  { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    } : undefined,
    orderBy: { name: 'asc' },
    include: { _count: { select: { sales: true } } },
    take: 100,
  })

  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = customerSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Clean empty email
  const data = { ...parsed.data, email: parsed.data.email || undefined }

  const customer = await prisma.customer.create({ data })

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'CREATE', entity: 'Customer',
    entityId: customer.id, entityName: customer.name,
  })

  return NextResponse.json(customer, { status: 201 })
}
