import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccess } from './permissions'

export function requirePermission(...permissions: string[]) {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (session.user as any)?.role as any
    if (!canAccess(role, ...permissions)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return null
  }
}
