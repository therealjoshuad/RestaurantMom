import { NextResponse } from 'next/server'
import { AUTH_COOKIE, SESSION_SECONDS, createSessionToken, passwordMatches } from '@/lib/auth'
import { clientIp, rateLimit, resetRateLimit, tooManyRequests } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const key = `login:${clientIp(req)}`
  const limited = rateLimit(key, [{ limit: 10, windowMs: 15 * 60_000 }])
  if (!limited.ok) {
    return tooManyRequests(limited.retryAfterSeconds, 'Too many attempts, try again later')
  }

  const { password } = await req.json().catch(() => ({ password: '' }))
  if (typeof password !== 'string' || !(await passwordMatches(password))) {
    // Small delay to slow down guessing.
    await new Promise((r) => setTimeout(r, 750))
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  resetRateLimit(key)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_SECONDS,
  })
  return res
}
