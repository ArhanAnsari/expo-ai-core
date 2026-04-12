import type { AIConversationMessage, AIMessage } from "../types";

export function createId(prefix = "msg"): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  const timePart = Date.now().toString(36);

  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${timePart}_${randomPart}`;
}

export function trimContent(value: string): string {
  return value.trim();
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function toConversationMessages(
  messages: AIMessage[],
  systemPrompt?: string,
): AIConversationMessage[] {
  const conversation: AIConversationMessage[] = [];

  if (systemPrompt && systemPrompt.trim()) {
    conversation.push({ role: "system", content: systemPrompt.trim() });
  }

  for (const message of messages) {
    conversation.push({ role: message.role, content: message.content });
  }

  return conversation;
}

export function mergeAssistantText(
  previous: string,
  nextChunk: string,
): string {
  if (!nextChunk) {
    return previous;
  }

  return `${previous}${nextChunk}`;
}

export function safeJsonParse<T>(input: string, fallback: T): T {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createLogger(enabled?: boolean) {
  const prefix = "[expo-ai-kit]";

  return {
    log: (...args: unknown[]) => {
      if (enabled) {
        console.log(prefix, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (enabled) {
        console.warn(prefix, ...args);
      }
    },
    error: (...args: unknown[]) => {
      if (enabled) {
        console.error(prefix, ...args);
      }
    },
  };
}

export function buildDefaultCacheKey(provider: string, model?: string): string {
  return `expo-ai-kit:${provider}:${model ?? "default"}`;
}

export function toPlainText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toPlainText).join("");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") {
      return record.text;
    }

    if (typeof record.content === "string") {
      return record.content;
    }
  }

  return "";
}
