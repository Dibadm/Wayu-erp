// app/api/bank-reconciliations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const recs = await prisma.bankReconciliation.findMany({
    orderBy: { asOf: 'desc' }, include: { createdBy: { select: { name: true } } },
  })
  return NextResponse.json(recs)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (body.bookBalance === undefined || body.bankBalance === undefined) {
    return NextResponse.json({ error: 'bookBalance and bankBalance required' }, { status: 400 })
  }
  const book = Number(body.bookBalance), bank = Number(body.bankBalance)
  const created = await prisma.bankReconciliation.create({
    data: {
      title: body.title ?? 'Reconciliation',
      asOf: body.asOf ? new Date(body.asOf) : new Date(),
      bookBalance: book, bankBalance: bank, difference: bank - book,
      notes: body.notes ?? null, status: body.status ?? 'PENDING',
      createdById: (session.user as any).id,
    },
  })
  await writeAuditLog({ userId: (session.user as any).id, action: 'CREATE', entity: 'BankReconciliation', entityId: created.id, entityName: created.title, reason: 'Bank reconciliation recorded' })
  return NextResponse.json(created, { status: 201 })
}
