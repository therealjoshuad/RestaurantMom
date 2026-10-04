"use client";

import { AssistantRuntimeProvider, Suggestions, useAui } from "@assistant-ui/react";
import { useChatRuntime, useAISDKChat, AssistantChatTransport } from "@assistant-ui/ai-sdk";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";

async function startNewChat() {
  await fetch("/api/history", { method: "DELETE" });
  window.location.reload();
}

// Saves the whole conversation each time a reply finishes streaming.
function PersistChat() {
  const chat = useAISDKChat();
  const status = chat?.status;
  const messages = chat?.messages;
  const previous = useRef(status);

  useEffect(() => {
    const wasBusy = previous.current === "submitted" || previous.current === "streaming";
    previous.current = status;
    if (!wasBusy || status === "submitted" || status === "streaming" || !messages?.length) return;
    fetch("/api/history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages }),
    }).catch(() => {});
  }, [status, messages]);

  return null;
}

export const Assistant = ({ initialMessages }: { initialMessages: UIMessage[] }) => {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    messages: initialMessages,
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "🥪 I'm at Harrison Street Deli",
        label: "what should I order?",
        prompt: "I'm at Harrison Street Deli",
      },
      {
        title: "🍔 French dip at Golden Gate Grill?",
        label: "thinking about it",
        prompt: "Thinking about a French dip at Golden Gate Grill",
      },
      {
        title: "📝 Log a meal",
        label: "tell mom how it was",
        prompt: "Just had the shrimp po' boy at Bayou on Valencia, solid 3, bread was a little soggy",
      },
      {
        title: "🔍 Somewhere new",
        label: "research a place I've never been",
        prompt: "I'm going to Zuni Cafe in San Francisco",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} aui={aui}>
      <PersistChat />
      <div className="flex h-dvh flex-col">
        <header className="shrink-0">
          <div className="awning" aria-hidden />
          <div className="mx-auto flex max-w-2xl items-baseline justify-between px-4 pt-3 pb-1">
            <span className="font-display text-xl font-semibold tracking-tight">
              Restaurant<span className="text-primary">Mom</span>
            </span>
            <span className="flex items-baseline gap-4">
              <span className="text-muted-foreground hidden text-sm italic sm:inline">
                she remembers every dish
              </span>
              <Link
                href="/profile"
                className="text-primary hover:text-[var(--tomato-deep)] text-sm font-semibold underline-offset-4 hover:underline"
              >
                Taste profile
              </Link>
              <button
                type="button"
                onClick={startNewChat}
                className="text-primary hover:text-[var(--tomato-deep)] text-sm font-semibold underline-offset-4 hover:underline"
              >
                New chat
              </button>
            </span>
          </div>
        </header>
        <main className="min-h-0 flex-1">
          <Thread />
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
};
