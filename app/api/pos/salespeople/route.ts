import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''

  const salesUsers = await prisma.user.findMany({
    where: search ? {
      role: Role.SALES,
      OR: [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    } : { role: Role.SALES },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
    take: 20,
  })

  if (salesUsers.length > 0) {
    return NextResponse.json(salesUsers)
  }

  const allUsers = await prisma.user.findMany({
    where: search ? {
      OR: [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    } : undefined,
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
    take: 20,
  })

  return NextResponse.json(allUsers)
}
