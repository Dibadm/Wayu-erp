// app/api/export/route.ts
// Excel export of the client's familiar sheets with a Gregorian/Ethiopian toggle.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  generateSellsExcel, generateReceivedExcel, generateGPExcel,
  generateStockExcel, generateDashboardExcel, generateCommissionExcel,
} from '@/lib/excel'
import { CalendarMode } from '@/lib/ethiopian-calendar'
import { writeAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sheet = searchParams.get('sheet') ?? 'sells' // sells|received|gp|stock|dashboard|commission
  const calendar = (searchParams.get('calendar') ?? 'gregorian') as CalendarMode
  const amharic = searchParams.get('amharic') === 'true'

  const userId = (session.user as any).id
  let buffer: Buffer
  let filename: string

  try {
    switch (sheet) {
      case 'received':  buffer = await generateReceivedExcel(calendar, amharic);  filename = `wayu-received-${new Date().toISOString().split('T')[0]}.xlsx`; break
      case 'gp':        buffer = await generateGPExcel(calendar, amharic);        filename = `wayu-gp-${new Date().toISOString().split('T')[0]}.xlsx`; break
      case 'stock':     buffer = await generateStockExcel(calendar);              filename = `wayu-stock-${new Date().toISOString().split('T')[0]}.xlsx`; break
      case 'dashboard': buffer = await generateDashboardExcel(calendar, amharic); filename = `wayu-dashboard-${new Date().toISOString().split('T')[0]}.xlsx`; break
      case 'commission':buffer = await generateCommissionExcel(calendar, amharic);filename = `wayu-commission-${new Date().toISOString().split('T')[0]}.xlsx`; break
      case 'sells':
      default:          buffer = await generateSellsExcel(calendar, amharic);    filename = `wayu-sells-${new Date().toISOString().split('T')[0]}.xlsx`; break
    }
  } catch (err: any) {
    console.error('[Export]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  await writeAuditLog({
    userId, action: 'EXPORT', entity: 'Report', entityId: sheet,
    entityName: `${sheet}-${calendar}`, reason: `Exported ${sheet} (${calendar})`,
  })

  return new NextResponse(buffer as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
