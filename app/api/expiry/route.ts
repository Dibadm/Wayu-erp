import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getExpiryCounts, getExpiryBatchDetails } from '@/lib/expiry'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const detail = searchParams.get('detail') === 'true'

  const [counts, batches] = await Promise.all([
    getExpiryCounts(),
    detail ? getExpiryBatchDetails() : Promise.resolve([]),
  ])

  return NextResponse.json({ counts, batches })
}
