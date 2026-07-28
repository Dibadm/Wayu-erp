import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runBackup } from '@/lib/backup'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'

// GET — list backup history
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const backups = await prisma.backupRecord.findMany({
    orderBy: { startedAt: 'desc' },
    take: 30,
  })

  // Serialize BigInt for JSON
  const serialized = backups.map(b => ({
    ...b,
    sizeBytes: b.sizeBytes ? Number(b.sizeBytes) : null,
  }))

  return NextResponse.json(serialized)
}

// POST — trigger manual backup
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const userId = (session.user as any).id

  await writeAuditLog({
    userId,
    action: 'BACKUP',
    entity: 'System',
    entityId: 'backup',
    entityName: 'Manual Backup',
    reason: 'Manually triggered by admin',
  })

  const result = await runBackup(userId)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    filename: result.filename,
    sizeBytes: result.sizeBytes,
  })
}
