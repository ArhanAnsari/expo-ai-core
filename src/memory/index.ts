import type { AIConversation, AIMemoryOptions, AIMessage } from "../types";

export function applyMemoryStrategy(
  conversation: AIConversation,
  options: AIMemoryOptions | undefined,
  systemPrompt?: string,
): Array<{ role: import("../types").AIMessageRole; content: string }> {
  const memory = {
    enabled: true,
    strategy: "window" as const,
    windowSize: 16,
    maxSummaryLength: 500,
    ...options,
  };

  if (!memory.enabled) {
    return withSystemPrompt(conversation.messages, systemPrompt);
  }

  if (
    memory.strategy === "summary" &&
    conversation.messages.length > (memory.windowSize ?? 16)
  ) {
    const summary = summarizeMessages(
      conversation.messages,
      memory.maxSummaryLength ?? 500,
    );
    const recent = conversation.messages.slice(-(memory.windowSize ?? 16));
    return withSystemPrompt(
      [
        {
          id: `${conversation.id}_summary`,
          role: "system",
          content: `Conversation summary so far:\n${summary}`,
          createdAt: Date.now(),
          status: "sent",
        },
        ...recent,
      ],
      systemPrompt,
    );
  }

  const windowSize = memory.windowSize ?? 16;
  return withSystemPrompt(
    conversation.messages.slice(-windowSize),
    systemPrompt,
  );
}

export function summarizeMessages(
  messages: AIMessage[],
  maxLength: number,
): string {
  const combined = messages
    .filter((message) => message.role !== "tool")
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  if (combined.length <= maxLength) {
    return combined;
  }

  return `${combined.slice(0, maxLength)}...`;
}

function withSystemPrompt(messages: AIMessage[], systemPrompt?: string) {
  if (!systemPrompt?.trim()) {
    return messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  return [
    {
      role: "system" as const,
      content: systemPrompt.trim(),
    },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}
