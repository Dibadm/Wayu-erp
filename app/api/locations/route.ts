import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { z } from 'zod'

const locationSchema = z.object({
  code:    z.string().min(1).max(20).toUpperCase(),
  name:    z.string().min(1).max(100),
  address: z.string().optional(),
  type:    z.enum(['WAREHOUSE', 'BRANCH', 'CLINIC', 'PHARMACY']).default('WAREHOUSE'),
  active:  z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locations = await prisma.location.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { inventory: true, movements: true } },
      inventory: {
        include: { product: { select: { name: true, sku: true } } },
      },
    },
  })

  return NextResponse.json(locations)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const parsed = locationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await prisma.location.findUnique({ where: { code: parsed.data.code } })
  if (existing) return NextResponse.json({ error: 'Location code already exists' }, { status: 409 })

  const location = await prisma.location.create({ data: parsed.data })

  await writeAuditLog({
    userId: (session.user as any).id,
    action: 'CREATE',
    entity: 'Location',
    entityId: location.id,
    entityName: location.name,
    changes: { created: { before: null, after: parsed.data } },
  })

  return NextResponse.json(location, { status: 201 })
}
