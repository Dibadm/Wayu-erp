import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { z } from 'zod'

const batchSchema = z.object({
  productId:   z.string().cuid(),
  locationId:  z.string().cuid(),
  batchNumber: z.string().min(1).max(100),
  quantity:    z.number().int().min(1),
  expiryDate:  z.string().datetime(),   // ISO string
  notes:       z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const productId  = searchParams.get('productId')
  const locationId = searchParams.get('locationId')
  const expiringSoonDays = parseInt(searchParams.get('expiringSoon') ?? '0')
  const includeExpired = searchParams.get('includeExpired') === 'true'

  const now = new Date()
  const soonDate = new Date(now.getTime() + expiringSoonDays * 86400000)

  const batches = await prisma.batch.findMany({
    where: {
      ...(productId  && { productId }),
      ...(locationId && { locationId }),
      ...(!includeExpired && { status: { not: 'EXPIRED' } }),
      ...(expiringSoonDays > 0 && {
        expiryDate: { lte: soonDate },
        status: 'ACTIVE',
      }),
    },
    orderBy: { expiryDate: 'asc' },
    include: {
      product:  { select: { name: true, sku: true } },
      location: { select: { name: true, code: true } },
    },
  })

  // Annotate each batch with days-until-expiry
  const annotated = batches.map(b => ({
    ...b,
    daysUntilExpiry: Math.floor((b.expiryDate.getTime() - now.getTime()) / 86400000),
  }))

  return NextResponse.json(annotated)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = batchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const expiryDate = new Date(parsed.data.expiryDate)

  // Reject already-expired batches
  if (expiryDate < new Date()) {
    return NextResponse.json({ error: 'Cannot add an already-expired batch.' }, { status: 400 })
  }

  const batch = await prisma.batch.create({
    data: {
      ...parsed.data,
      expiryDate,
    },
  })

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'CREATE',
    entity: 'Batch',
    entityId: batch.id,
    entityName: `${batch.batchNumber}`,
    changes: { created: { before: null, after: parsed.data } },
  })

  return NextResponse.json(batch, { status: 201 })
}
