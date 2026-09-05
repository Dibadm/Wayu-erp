interface RateLimitEntry {
  count: number
  resetTime: number
}

const stores: Map<string, RateLimitEntry[]> = new Map()

const CLEANUP_INTERVAL = 1000 * 60 * 5

let lastCleanup = Date.now()

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  for (const [key, entries] of stores) {
    const valid = entries.filter(e => e.resetTime > now)
    if (valid.length === 0) {
      stores.delete(key)
    } else {
      stores.set(key, valid)
    }
  }
}

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { success: boolean; remaining: number; reset: number } {
  cleanup()

  const now = Date.now()
  const windowStart = now - windowMs

  const entries = stores.get(key) ?? []

  const valid = entries.filter(e => e.resetTime > now)
  valid.push({ count: 1, resetTime: now + windowMs })

  let total = 0
  for (const entry of valid) {
    if (entry.resetTime > windowStart) {
      total += entry.count
    }
  }

  stores.set(key, valid)

  const remaining = Math.max(0, max - total)
  const reset = Math.min(...valid.map(e => e.resetTime))

  return {
    success: total <= max,
    remaining,
    reset,
  }
}

export function getClientKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  const ip = xff ? xff.split(',')[0].trim() : 'unknown'
  const ua = req.headers.get('user-agent') ?? 'unknown'
  return `${ip}:${ua.slice(0, 50)}`
}
