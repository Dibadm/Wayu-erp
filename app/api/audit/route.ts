import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admins can read audit logs
  if ((session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const entity   = searchParams.get('entity')
  const entityId = searchParams.get('entityId')
  const userId   = searchParams.get('userId')
  const take     = Math.min(parseInt(searchParams.get('take') ?? '100'), 500)
  const skip     = parseInt(searchParams.get('skip') ?? '0')

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        ...(entity   && { entity }),
        ...(entityId && { entityId }),
        ...(userId   && { userId }),
      },
      orderBy: { timestamp: 'desc' },
      take,
      skip,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({
      where: {
        ...(entity   && { entity }),
        ...(entityId && { entityId }),
        ...(userId   && { userId }),
      },
    }),
  ])

  return NextResponse.json({ logs, total, take, skip })
}
