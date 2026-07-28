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

  const application = await prisma.creditApplication.findUnique({
    where: { id: params.id },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      profile: true,
    },
  })

  if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(application)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission('credit:manage')(null as any)
  if (guard) return guard
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const application = await prisma.creditApplication.findUnique({ where: { id: params.id } })
  if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: any = {}
  if (body.status) data.status = body.status
  if (body.rejectionReason) data.rejectionReason = body.rejectionReason
  if (body.reviewedBy || body.reviewedAt) {
    data.reviewedBy = (session.user as any).id
    data.reviewedAt = new Date()
  }

  const updated = await prisma.creditApplication.update({
    where: { id: params.id },
    data,
    include: { customer: { select: { id: true, name: true } } },
  })

  if (body.status === 'APPROVED' && !application.profileId) {
    const profile = await prisma.creditProfile.findFirst({
      where: { customerId: application.customerId },
    })
    if (profile) {
      await prisma.creditApplication.update({
        where: { id: params.id },
        data: { profileId: profile.id },
      })
    }
  }

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'UPDATE',
    entity: 'CreditApplication',
    entityId: application.id,
    entityName: application.applicationNo,
  })

  return NextResponse.json(updated)
}
