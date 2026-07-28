import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, session: any) => Promise<NextResponse>,
  errorPrefix = '[AI Route]'
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return await handler(req, session)
  } catch (err: any) {
    console.error(errorPrefix, err)
    return NextResponse.json({ error: err.message ?? 'Request failed.' }, { status: 500 })
  }
}
