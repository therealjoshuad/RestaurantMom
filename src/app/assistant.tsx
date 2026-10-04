"use client";

import { AssistantRuntimeProvider, Suggestions, useAui } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";

export const Assistant = () => {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "I'm at Harrison Street Deli",
        label: "what should I order?",
        prompt: "I'm at Harrison Street Deli",
      },
      {
        title: "French dip at Golden Gate Grill?",
        label: "thinking about it",
        prompt: "Thinking about a French dip at Golden Gate Grill",
      },
      {
        title: "Log a meal",
        label: "tell mom how it was",
        prompt: "Just had the shrimp po' boy at Bayou on Valencia, solid 3, bread was a little soggy",
      },
      {
        title: "Somewhere new",
        label: "research a place I've never been",
        prompt: "I'm going to Zuni Cafe in San Francisco",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} aui={aui}>
      <div className="h-dvh">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};
