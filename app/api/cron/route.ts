// app/api/cron/route.ts
// Called by Vercel Cron (or any external cron) on a schedule.
// Set up in vercel.json. Protected by CRON_SECRET env var.
//
// Vercel cron config (add to vercel.json):
// {
//   "crons": [
//     { "path": "/api/cron", "schedule": "0 1 * * *" }   ← daily at 1am
//   ]
// }

import { NextRequest, NextResponse } from 'next/server'
import { runBackup } from '@/lib/backup'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  // Verify this is coming from the cron scheduler, not a random request
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}

  // 1. Run daily backup
  try {
    const backupResult = await runBackup('scheduled')
    results.backup = backupResult
  } catch (err: any) {
    results.backup = { error: err.message }
  }

  // 2. Mark expired batches automatically
  try {
    const expired = await prisma.batch.updateMany({
      where: {
        status: 'ACTIVE',
        expiryDate: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    })
    results.expiredBatchesMarked = expired.count
  } catch (err: any) {
    results.expiredBatchesError = err.message
  }

  // 3. Log expiry warnings (batches expiring within 30 days)
  try {
    const soonDate = new Date(Date.now() + 30 * 86400000)
    const expiringSoon = await prisma.batch.count({
      where: { status: 'ACTIVE', expiryDate: { lte: soonDate } },
    })
    results.expiringSoonCount = expiringSoon
    // TODO: send email/SMS alert here when notification service is integrated
  } catch (err: any) {
    results.expiryCheckError = err.message
  }

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), results })
}
