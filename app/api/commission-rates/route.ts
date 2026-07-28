// app/api/commission-rates/route.ts
// Admin-configured commission rates (decision #1). Nothing hardcoded.
// Resolution order: salesperson+product+tier → product+tier → salesperson+tier → global+tier.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CommissionScope, CommissionRate } from '@prisma/client'
import { writeAuditLog } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rates = await prisma.commissionRate.findMany({
    orderBy: [{ scope: 'asc' }, { tierFromQty: 'asc' }],
    include: {
      salesperson: { select: { id: true, name: true } },
      product: { select: { id: true, sku: true, name: true } },
    },
  })
  return NextResponse.json(rates)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const scope = body.scope as CommissionScope
  if (!['GLOBAL', 'SALESPERSON', 'PRODUCT', 'COMBO'].includes(scope)) {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 })
  }
  const data: any = {
    scope,
    tierFromQty: Number(body.tierFromQty ?? 0),
    tierToQty: body.tierToQty === null || body.tierToQty === '' ? null : Number(body.tierToQty),
    rate: Number(body.rate),
    active: body.active !== false,
  }
  if (scope === 'SALESPERSON' || scope === 'COMBO') data.salespersonId = body.salespersonId
  if (scope === 'PRODUCT' || scope === 'COMBO') data.productId = body.productId

  const created = await prisma.commissionRate.create({ data })
  await writeAuditLog({
    userId: (session.user as any).id, action: 'CREATE', entity: 'CommissionRate',
    entityId: created.id, entityName: `${scope} @${data.rate}%`,
    reason: 'Commission rate created',
  })
  return NextResponse.json(created, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const id = body.id
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const data: any = {}
  if ('rate' in body) data.rate = Number(body.rate)
  if ('tierFromQty' in body) data.tierFromQty = Number(body.tierFromQty)
  if ('tierToQty' in body) data.tierToQty = body.tierToQty === null || body.tierToQty === '' ? null : Number(body.tierToQty)
  if ('active' in body) data.active = !!body.active
  if ('salespersonId' in body) data.salespersonId = body.salespersonId
  if ('productId' in body) data.productId = body.productId
  if ('scope' in body) data.scope = body.scope

  const updated = await prisma.commissionRate.update({ where: { id }, data })
  await writeAuditLog({
    userId: (session.user as any).id, action: 'UPDATE', entity: 'CommissionRate',
    entityId: id, entityName: `rate ${id}`, reason: 'Commission rate updated',
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.commissionRate.delete({ where: { id } })
  await writeAuditLog({
    userId: (session.user as any).id, action: 'DELETE', entity: 'CommissionRate',
    entityId: id, reason: 'Commission rate deleted',
  })
  return NextResponse.json({ success: true })
}
