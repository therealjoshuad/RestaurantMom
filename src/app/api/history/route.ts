import { clearChat, saveChat } from '@/lib/chat-store'

// Auth is enforced for every /api/* route by src/proxy.ts.
const MAX_BYTES = 2_000_000

export async function POST(req: Request) {
  const text = await req.text()
  if (text.length > MAX_BYTES) return Response.json({ error: 'Too large' }, { status: 413 })
  const body = (() => {
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  })()
  if (!Array.isArray(body?.messages)) {
    return Response.json({ error: 'Bad request' }, { status: 400 })
  }
  await saveChat(body.messages)
  return Response.json({ ok: true })
}

// "New chat": wipe the conversation.
export async function DELETE() {
  await clearChat()
  return Response.json({ ok: true })
}
