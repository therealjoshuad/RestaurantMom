import { handleChatStream, withSseHeartbeat } from '@mastra/ai-sdk'
import { createUIMessageStreamResponse } from 'ai'
import { mastra } from '@/mastra'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit'

// Must match the MAJOR version of the "ai" package in package.json
// (check with `npm ls ai`): 'ai@6.x' -> 'v6', 'ai@7.x' -> 'v7'.
const AI_SDK_STREAM_VERSION = 'v7' as const

export async function POST(req: Request) {
  // Caps gateway and Exa spend: 20/min and 200/hour per client IP.
  const limited = rateLimit(`chat:${clientIp(req)}`, [
    { limit: 20, windowMs: 60_000 },
    { limit: 200, windowMs: 60 * 60_000 },
  ])
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds, 'Slow down, sweetie')

  const params = await req.json()

  const stream = await handleChatStream({
    mastra,
    agentId: 'restaurantMom', // the key used in new Mastra({ agents: { restaurantMom } })
    version: AI_SDK_STREAM_VERSION,
    params,
  })

  // Heartbeat keeps the SSE connection alive through proxies (Fly) while tools run.
  return withSseHeartbeat(createUIMessageStreamResponse({ stream }), 15000)
}
