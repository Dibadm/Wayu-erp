import { NextRequest, NextResponse } from 'next/server'
import { getReorderRecommendations } from '@/lib/ai-inventory'
import { withAuth } from '@/lib/ai-route'

export async function GET(req: NextRequest) {
  return withAuth(req, async (req, session) => {
    const recommendations = await getReorderRecommendations()
    return NextResponse.json(recommendations)
  })
}
