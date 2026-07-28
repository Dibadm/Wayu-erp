import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/with-auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission('collections:view', 'credit:view')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const case_ = await prisma.collectionCase.findUnique({
    where: { id: params.id },
    include: {
      customer: { select: { id: true, name: true } },
      arStatement: { select: { id: true, invoiceNo: true } },
      assignedToUser: { select: { name: true } },
    },
  })

  if (!case_) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(case_)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission('collections:manage', 'credit:manage')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const case_ = await prisma.collectionCase.findUnique({ where: { id: params.id } })
  if (!case_) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: any = {}
  if (body.status) data.status = body.status
  if (body.priority) data.priority = body.priority
  if (body.assignedTo) data.assignedTo = body.assignedTo
  if (body.notes) data.notes = body.notes
  if (body.status === 'RESOLVED') data.resolvedAt = new Date()

  const updated = await prisma.collectionCase.update({
    where: { id: params.id },
    data,
    include: { customer: { select: { id: true, name: true } } },
  })

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'UPDATE',
    entity: 'CollectionCase',
    entityId: case_.id,
    entityName: case_.caseNo,
  })

  return NextResponse.json(updated)
}
