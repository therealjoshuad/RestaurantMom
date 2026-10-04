// Shared-password auth: a signed "expiry.hmac" cookie, verified with Web Crypto
// so it works in both the proxy and route handlers.
export const AUTH_COOKIE = 'mom_session'
export const SESSION_SECONDS = 60 * 60 * 24 * 30

const enc = new TextEncoder()

async function hmac(value: string): Promise<string> {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function createSessionToken(): Promise<string> {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS)
  return `${exp}.${await hmac(exp)}`
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false
  return safeEqual(sig, await hmac(exp))
}

export async function passwordMatches(input: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD
  if (!expected) return false
  // Hash both sides so the comparison length never depends on the real password.
  const [a, b] = await Promise.all(
    [input, expected].map(async (s) =>
      Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))), (x) =>
        x.toString(16).padStart(2, '0'),
      ).join(''),
    ),
  )
  return safeEqual(a, b)
}
