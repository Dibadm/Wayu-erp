import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  generateInventoryExcel,
  generateDispensingSummaryHTML,
  generateSupplierExcel,
  generatePurchaseOrderExcel,
  generateValuationExcel,
} from '@/lib/reports'
import { writeAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type     = searchParams.get('type') ?? 'inventory'
  const format   = searchParams.get('format') ?? 'excel'
  const dateFrom = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 30 * 86400000)
  const dateTo   = searchParams.get('to')   ? new Date(searchParams.get('to')!)   : new Date()

  const userId = (session.user as any).id

  await writeAuditLog({
    userId,
    action:     'EXPORT',
    entity:     'Report',
    entityId:   'report',
    entityName: `${type}-${format}`,
    reason:     `Report export: ${type} (${format})`,
  })

  // Excel reports
  if (format === 'excel') {
    let buffer: Buffer
    let filename: string

    switch (type) {
      case 'suppliers':
        buffer   = await generateSupplierExcel()
        filename = `wayu-suppliers-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'purchase-orders':
        buffer   = await generatePurchaseOrderExcel()
        filename = `wayu-purchase-orders-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'valuation':
        buffer   = await generateValuationExcel()
        filename = `wayu-valuation-${new Date().toISOString().split('T')[0]}.xlsx`
        break
      case 'inventory':
      default:
        buffer   = await generateInventoryExcel()
        filename = `wayu-inventory-${new Date().toISOString().split('T')[0]}.xlsx`
        break
    }

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // PDF / HTML reports
  if (format === 'pdf') {
    const html = await generateDispensingSummaryHTML(dateFrom, dateTo)
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return NextResponse.json({ error: 'Invalid format.' }, { status: 400 })
}
