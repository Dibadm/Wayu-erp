import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/with-auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission('credit:view')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.creditProfile.findUnique({
    where: { id: params.id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      approvedByUser: { select: { name: true } },
      transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(profile)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission('credit:manage')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const before = await prisma.creditProfile.findUnique({ where: { id: params.id } })
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const profile = await prisma.creditProfile.update({
    where: { id: params.id },
    data: {
      creditLimit: body.creditLimit ?? before.creditLimit,
      availableCredit: body.availableCredit ?? before.availableCredit,
      utilizedCredit: body.utilizedCredit ?? before.utilizedCredit,
      paymentTerms: body.paymentTerms ?? before.paymentTerms,
      isActive: body.isActive ?? before.isActive,
      isBlocked: body.isBlocked ?? before.isBlocked,
      blockReason: body.blockReason ?? before.blockReason,
      notes: body.notes ?? before.notes,
    },
    include: { customer: { select: { id: true, name: true } } },
  })

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'UPDATE',
    entity: 'CreditProfile',
    entityId: profile.id,
    entityName: `Profile for ${profile.customer.name}`,
  })

  return NextResponse.json(profile)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission('credit:manage')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.creditProfile.findUnique({ where: { id: params.id } })
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.creditProfile.delete({ where: { id: params.id } })
  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'DELETE',
    entity: 'CreditProfile',
    entityId: params.id,
    entityName: `Profile for ${profile.customerId}`,
  })

  return NextResponse.json({ success: true })
}
