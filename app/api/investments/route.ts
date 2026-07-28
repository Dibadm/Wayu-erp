import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { Role } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const where: any = {}
  if (status) where.status = status as any
  const investments = await prisma.investment.findMany({
    where, orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { name: true } } },
  })
  return NextResponse.json(investments)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any).role
  if (role !== Role.ADMIN) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const body = await req.json()
  if (!body.name || !body.type || !body.amount) {
    return NextResponse.json({ error: 'name, type, and amount are required' }, { status: 400 })
  }
  const upserted = await prisma.investment.upsert({
    where: { id: body.id ?? '' },
    create: {
      name: body.name, type: body.type as any, amount: body.amount,
      expectedReturn: body.expectedReturn ?? 0, startDate: new Date(body.startDate),
      maturityDate: body.maturityDate ? new Date(body.maturityDate) : null,
      status: body.status ?? 'ACTIVE', notes: body.notes ?? null, createdById: (session.user as any).id,
    },
    update: {
      name: body.name, type: body.type as any, amount: body.amount,
      expectedReturn: body.expectedReturn ?? 0, startDate: new Date(body.startDate),
      maturityDate: body.maturityDate ? new Date(body.maturityDate) : null,
      status: body.status ?? 'ACTIVE', notes: body.notes ?? null, updatedAt: new Date(),
    },
  })
  await writeAuditLog({ userId: (session.user as any).id, action: body.id ? 'UPDATE' : 'CREATE', entity: 'Investment', entityId: upserted.id, entityName: upserted.name, reason: 'Investment created/updated' })
  return NextResponse.json(upserted)
}