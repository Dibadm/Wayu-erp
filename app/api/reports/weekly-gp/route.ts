// app/api/reports/weekly-gp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWeeklyGP } from '@/lib/reports-cf19'
import { CalendarMode } from '@/lib/ethiopian-calendar'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const mode = (searchParams.get('calendar') ?? 'gregorian') as CalendarMode
  const amharic = searchParams.get('amharic') === 'true'
  const weeks = parseInt(searchParams.get('weeks') ?? '12')
  const data = await getWeeklyGP(mode, amharic, weeks)
  return NextResponse.json(data)
}
