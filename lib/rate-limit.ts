import { Redis } from '@upstash/redis'
import { Ratelimit, type Duration } from '@upstash/ratelimit'

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

let redis: Redis | null = null
if (redisUrl && redisToken) {
  redis = new Redis({ url: redisUrl, token: redisToken })
} else if (process.env.NODE_ENV === 'production') {
  console.warn('[rate-limit] Upstash Redis not configured — falling back to in-memory limiter (unsafe for multi-instance)')
}

const rlCache: Map<string, Ratelimit> = new Map()

function getRatelimit(max: number, windowMs: number): Ratelimit | null {
  if (!redis) return null

  const cacheKey = `${max}:${windowMs}`
  let rl = rlCache.get(cacheKey)
  if (!rl) {
    const seconds = Math.round(windowMs / 1000)
    const duration = `${seconds}s` as Duration
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(max, duration),
      ephemeralCache: new Map(),
    })
    rlCache.set(cacheKey, rl)
  }
  return rl
}

const stores: Map<string, RateLimitEntry> = new Map()
const CLEANUP_INTERVAL = 1000 * 60 * 5
let lastCleanup = Date.now()

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  for (const [key, entry] of stores) {
    if (entry.resetTime <= now) {
      stores.delete(key)
    }
  }
}

export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const rl = getRatelimit(max, windowMs)
  if (rl) {
    const result = await rl.limit(key)
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    }
  }

  // In-memory fallback
  cleanup()
  const now = Date.now()
  const entry = stores.get(key)

  if (!entry || entry.resetTime <= now) {
    stores.set(key, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: max - 1, reset: now + windowMs }
  }

  if (entry.count >= max) {
    return { success: false, remaining: 0, reset: entry.resetTime }
  }

  entry.count += 1
  return { success: true, remaining: max - entry.count, reset: entry.resetTime }
}

export function getClientKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  const ip = xff ? xff.split(',')[0].trim() : 'unknown'
  const ua = req.headers.get('user-agent') ?? 'unknown'
  return `${ip}:${ua.slice(0, 50)}`
}
