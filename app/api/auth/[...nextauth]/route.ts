import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientKey } from '@/lib/rate-limit'

const LOGIN_RATE = { max: 20, window: 15 * 60_000 }

const handler = NextAuth(authOptions)

export async function GET(req: NextRequest, context: { params: { nextauth: string[] } }) {
  return handler(req, context)
}

export async function POST(req: NextRequest, context: { params: { nextauth: string[] } }) {
  const key = `${getClientKey(req)}:login`
  const rl = rateLimit(key, LOGIN_RATE.max, LOGIN_RATE.window)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 })
  }

  return handler(req, context)
}
