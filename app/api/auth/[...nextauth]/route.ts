import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { rateLimit, getClientKey } from '@/lib/rate-limit'

const LOGIN_RATE = { max: 5, window: 15 * 60_000 }

const handler = NextAuth(authOptions)

async function rateLimitedHandler(req: Request) {
  if (req.method === 'POST') {
    const key = `${getClientKey(req)}:login`
    const rl = rateLimit(key, LOGIN_RATE.max, LOGIN_RATE.window)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 })
    }
  }
  return handler(req)
}

export { rateLimitedHandler as GET, rateLimitedHandler as POST }
