// In-memory sliding-window rate limiter. Fine for a single Fly machine; state resets on
// restart and is not shared across machines. Swap for Redis/Postgres if you scale out.
type Rule = { limit: number; windowMs: number }

const hits = new Map<string, number[]>()
const MAX_KEYS = 5000

export type Limited = { ok: true } | { ok: false; retryAfterSeconds: number }

/** Records a hit against every rule and reports whether any rule is exceeded. */
export function rateLimit(key: string, rules: Rule[]): Limited {
  const now = Date.now()
  const longest = Math.max(...rules.map((r) => r.windowMs))
  const recent = (hits.get(key) ?? []).filter((t) => now - t < longest)

  let retryAfterMs = 0
  for (const { limit, windowMs } of rules) {
    const inWindow = recent.filter((t) => now - t < windowMs)
    if (inWindow.length >= limit) {
      retryAfterMs = Math.max(retryAfterMs, windowMs - (now - inWindow[inWindow.length - limit]))
    }
  }
  if (retryAfterMs > 0) {
    hits.set(key, recent) // blocked requests don't extend the lockout
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
  }

  recent.push(now)
  hits.set(key, recent)
  if (hits.size > MAX_KEYS) prune(now, longest)
  return { ok: true }
}

export function resetRateLimit(key: string) {
  hits.delete(key)
}

function prune(now: number, windowMs: number) {
  for (const [k, ts] of hits) {
    if (!ts.some((t) => now - t < windowMs)) hits.delete(k)
  }
}

// Fly's edge sets Fly-Client-IP and overwrites any client-supplied value.
export function clientIp(req: Request): string {
  return (
    req.headers.get('fly-client-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

export function tooManyRequests(retryAfterSeconds: number, message = 'Too many requests') {
  return Response.json(
    { error: message },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  )
}
