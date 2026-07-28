import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAnalyticsData, type Period } from '@/lib/analytics'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = (searchParams.get('period') ?? 'month') as Period
  const from   = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
  const to     = searchParams.get('to')   ? new Date(searchParams.get('to')!)   : undefined

  try {
    const data = await getAnalyticsData(period, from, to)
    // Serialise Dates to strings for JSON
    return NextResponse.json(JSON.parse(JSON.stringify(data)))
  } catch (err: any) {
    console.error('[Analytics]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
