// app/api/settings/route.ts
// Reads/writes app-level settings (cost method FIFO/FEFO, calendar default).
// decision #2 (cost method toggle, default empty until chosen post-delivery) &
// decision #4 (Gregorian default).

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const keys = ['costMethod', 'calendarDefault', 'amharicLabels']
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } })
  const map: Record<string, string | null> = {}
  for (const k of keys) {
    const row = rows.find(r => r.key === k)
    map[k] = row?.value ?? null
  }
  return NextResponse.json(map)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()
  const userId = (session.user as any).id
  const updates: { key: string; value: string }[] = []

  if ('costMethod' in body) {
    const v = body.costMethod === null ? null : (body.costMethod as string)
    if (v !== null && v !== 'FIFO' && v !== 'FEFO') {
      return NextResponse.json({ error: 'costMethod must be FIFO, FEFO, or null' }, { status: 400 })
    }
    updates.push({ key: 'costMethod', value: v ?? '' })
  }
  if ('calendarDefault' in body) {
    if (!['gregorian', 'ethiopian'].includes(body.calendarDefault)) {
      return NextResponse.json({ error: 'calendarDefault must be gregorian or ethiopian' }, { status: 400 })
    }
    updates.push({ key: 'calendarDefault', value: body.calendarDefault })
  }
  if ('amharicLabels' in body) {
    updates.push({ key: 'amharicLabels', value: body.amharicLabels ? 'true' : 'false' })
  }

  for (const u of updates) {
    await prisma.setting.upsert({
      where: { key: u.key },
      update: { value: u.value, updatedAt: new Date() },
      create: { key: u.key, value: u.value },
    })
  }

  if (updates.length) {
    await writeAuditLog({
      userId, action: 'UPDATE', entity: 'Setting', entityId: 'settings',
      entityName: 'App Settings',
      reason: `Updated: ${updates.map(u => u.key).join(', ')}`,
    })
  }

  const rows = await prisma.setting.findMany({ where: { key: { in: ['costMethod', 'calendarDefault', 'amharicLabels'] } } })
  const map: Record<string, string | null> = {}
  for (const r of rows) map[r.key] = r.value ?? null
  return NextResponse.json(map)
}
