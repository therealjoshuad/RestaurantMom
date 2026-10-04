import { handleChatStream, withSseHeartbeat } from '@mastra/ai-sdk'
import { createUIMessageStreamResponse } from 'ai'
import { mastra } from '@/mastra'

// Must match the MAJOR version of the "ai" package in package.json
// (check with `npm ls ai`): 'ai@6.x' -> 'v6', 'ai@7.x' -> 'v7'.
const AI_SDK_STREAM_VERSION = 'v6' as const

export async function POST(req: Request) {
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
