import { loadChat } from "@/lib/chat-store";
import { Assistant } from "./assistant";

// Read the saved conversation on every request, never at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const messages = await loadChat();
  return <Assistant initialMessages={messages} />;
}
