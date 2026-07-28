// app/api/reports/sales-plan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSalesPlan } from '@/lib/reports-cf19'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start') ? new Date(searchParams.get('start')!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const data = await getSalesPlan(start)
  return NextResponse.json(data)
}
