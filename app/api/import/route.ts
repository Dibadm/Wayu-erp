// app/api/import/route.ts
// Two-way Excel import (decision #3). App is authoritative; only adds new rows
// keyed by receiptNumber / poNumber; mismatches are recorded + alerted, never overwritten.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { importSellsSheet, importReceivedSheet } from '@/lib/excel'
import { writeAuditLog } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  const sheet = (form.get('sheet') as string) || 'sells' // 'sells' | 'received'
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const importedBy = (session.user as any).id

  const location = await prisma.location.findFirst({ where: { active: true }, select: { id: true } })
  const supplier = await prisma.supplier.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } })

  try {
    const result = sheet === 'received'
      ? await importReceivedSheet(buffer, {
          fileName: file.name, importedBy,
          defaultLocationId: location?.id, defaultSupplierId: supplier?.id,
        })
      : await importSellsSheet(buffer, { fileName: file.name, importedBy, defaultLocationId: location?.id })

    await writeAuditLog({
      userId: importedBy, action: 'IMPORT' as any, entity: 'ImportBatch',
      entityId: result.importBatchId, entityName: file.name,
      reason: `Imported ${sheet}: ${result.newRows} new / ${result.rowCount} rows, ${result.mismatches} mismatches`,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('[Import]', err)
    return NextResponse.json({ error: err.message ?? 'Import failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const batches = await prisma.importBatch.findMany({
    orderBy: { importedAt: 'desc' },
    take: 50,
    include: { importedBy: { select: { name: true, email: true } }, _count: { select: { conflicts: true } } },
  })
  const conflicts = await prisma.syncConflict.findMany({
    where: { resolved: false },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { importBatch: { select: { fileName: true } } },
  })
  return NextResponse.json({ batches, conflicts })
}
