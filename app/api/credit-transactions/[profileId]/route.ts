import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/with-auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'

export async function GET(_: NextRequest, { params }: { params: { profileId: string } }) {
  const guard = await requirePermission('credit:view')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const transactions = await prisma.creditTransaction.findMany({
    where: { profileId: params.profileId },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true } } },
  })

  return NextResponse.json(transactions)
}

export async function POST(req: NextRequest, { params }: { params: { profileId: string } }) {
  const guard = await requirePermission('credit:manage')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const transaction = await prisma.creditTransaction.create({
    data: {
      type: body.type,
      amount: body.amount,
      oldValue: body.oldValue,
      newValue: body.newValue,
      reason: body.reason,
      createdById: (session.user as any).id,
      profileId: params.profileId,
    },
    include: { createdBy: { select: { name: true } } },
  })

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'CREATE',
    entity: 'CreditTransaction',
    entityId: transaction.id,
    entityName: `${transaction.type} for profile ${params.profileId}`,
  })

  return NextResponse.json(transaction, { status: 201 })
}
