import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { productSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const lowStock = searchParams.get('lowStock') === 'true'

  if (lowStock) {
    const products = await prisma.$queryRaw`SELECT * FROM "products" WHERE "quantity" <= "min_stock_level" AND ("name" ILIKE ${`%${search}%`} OR "sku" ILIKE ${`%${search}%`} OR "category" ILIKE ${`%${search}%`}) ORDER BY "name" ASC`
    return NextResponse.json(products)
  }

  const products = await prisma.product.findMany({
    where: {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = productSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Check duplicate SKU
  const existing = await prisma.product.findUnique({ where: { sku: parsed.data.sku } })
  if (existing) return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })

  const product = await prisma.product.create({ data: parsed.data })
  return NextResponse.json(product, { status: 201 })
}
