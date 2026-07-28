import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { supplierSchema } from '@/lib/validations'
import { writeAuditLog, diff } from '@/lib/audit'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supplier = await prisma.supplier.findUnique({
    where: { id: params.id },
    include: {
      purchaseOrders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          createdBy: { select: { name: true, email: true } },
          _count: { select: { items: true } },
        },
      },
    },
  })

  if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  return NextResponse.json(supplier)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role === 'VIEWER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = supplierSchema.partial().safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const before = await prisma.supplier.findUnique({ where: { id: params.id } })
  if (!before) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })

  const supplier = await prisma.supplier.update({ where: { id: params.id }, data: parsed.data })

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'UPDATE',
    entity: 'Supplier',
    entityId: supplier.id,
    entityName: supplier.name,
    changes: diff(before as any, parsed.data as any),
  })

  return NextResponse.json(supplier)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  // Soft-delete: set status to INACTIVE rather than hard delete (preserves PO history)
  const supplier = await prisma.supplier.update({
    where: { id: params.id },
    data: { status: 'INACTIVE' },
  })

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'DELETE',
    entity: 'Supplier',
    entityId: params.id,
    entityName: supplier.name,
    reason: 'Deactivated by admin',
  })

  return NextResponse.json({ success: true })
}
