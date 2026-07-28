import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { movementSchema } from '@/lib/validations'
import { writeAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const productId  = searchParams.get('productId')
  const locationId = searchParams.get('locationId')
  const take       = parseInt(searchParams.get('take') ?? '50')

  const movements = await prisma.movement.findMany({
    where: {
      ...(productId  && { productId }),
      ...(locationId && { locationId }),
    },
    orderBy: { timestamp: 'desc' },
    take,
    include: {
      product:  { select: { name: true, sku: true } },
      user:     { select: { name: true, email: true } },
      location: { select: { name: true, code: true } },
      batch:    { select: { batchNumber: true, expiryDate: true } },
    },
  })

  return NextResponse.json(movements)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = movementSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { productId, type, quantity, notes } = parsed.data
  const locationId = body.locationId as string | undefined
  const batchId    = body.batchId    as string | undefined
  const reference  = body.reference  as string | undefined
  const userId = session.user.id

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  if (type === 'OUT' && product.quantity < quantity) {
    return NextResponse.json(
      { error: `Insufficient stock. Available: ${product.quantity} ${product.unit}` },
      { status: 400 }
    )
  }

  const delta  = type === 'IN' ? quantity : type === 'OUT' ? -quantity : quantity
  const newQty = Math.max(0, product.quantity + delta)

  const [movement] = await prisma.$transaction([
    prisma.movement.create({
      data: { productId, type, quantity, notes, userId, locationId, batchId, reference },
      include: {
        product:  { select: { name: true, sku: true } },
        user:     { select: { name: true, email: true } },
        location: { select: { name: true, code: true } },
      },
    }),
    prisma.product.update({
      where: { id: productId },
      data:  { quantity: newQty },
    }),
    // Update per-location inventory if location provided
    ...(locationId ? [prisma.locationInventory.upsert({
      where:  { locationId_productId: { locationId, productId } },
      update: { quantity: { increment: delta } },
      create: { locationId, productId, quantity: Math.max(0, delta) },
    })] : []),
    // Update batch quantity if batch provided
    ...(batchId ? [prisma.batch.update({
      where: { id: batchId },
      data:  { quantity: type === 'IN' ? { increment: quantity } : { decrement: quantity } },
    })] : []),
  ])

  await writeAuditLog({
    userId,
    action: 'CREATE',
    entity: 'Movement',
    entityId: movement.id,
    entityName: `${type} ${quantity} × ${product.name}`,
    changes: {
      quantity:  { before: product.quantity, after: newQty },
      type:      { before: null, after: type },
      reference: { before: null, after: reference ?? null },
    },
    reason: notes,
  })

  return NextResponse.json(movement, { status: 201 })
}
