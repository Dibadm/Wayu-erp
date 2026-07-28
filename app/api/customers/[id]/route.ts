import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { customerSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      sales: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          items:    { include: { product: { select: { name: true, sku: true } } } },
          payments: true,
        },
      },
    },
  })

  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(customer)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await req.json()
  const parsed = customerSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const before   = await prisma.customer.findUnique({ where: { id: params.id } })
  const customer = await prisma.customer.update({ where: { id: params.id }, data: parsed.data })

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'UPDATE', entity: 'Customer',
    entityId: customer.id, entityName: customer.name,
    changes: Object.fromEntries(
      Object.entries(parsed.data).map(([k, v]) => [k, { before: (before as any)?.[k], after: v }])
    ),
  })

  return NextResponse.json(customer)
}
