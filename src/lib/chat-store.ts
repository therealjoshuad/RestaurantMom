import type { UIMessage } from 'ai'
import { sql } from '@/mastra/db'

// The single ongoing conversation lives in one chat_state row (see schema.sql).

export async function loadChat(): Promise<UIMessage[]> {
  try {
    const rows = await sql`SELECT messages FROM chat_state WHERE id = 'main'`
    return Array.isArray(rows[0]?.messages) ? (rows[0].messages as UIMessage[]) : []
  } catch (err) {
    // Never block the app from loading because history is unavailable.
    console.error('Failed to load chat history:', err)
    return []
  }
}

export async function saveChat(messages: UIMessage[]) {
  await sql`
    INSERT INTO chat_state (id, messages, updated_at)
    VALUES ('main', ${JSON.stringify(messages)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET messages = EXCLUDED.messages, updated_at = now()`
}

export async function clearChat() {
  await sql`DELETE FROM chat_state WHERE id = 'main'`
}
