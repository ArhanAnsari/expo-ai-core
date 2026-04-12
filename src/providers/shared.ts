import type {
  AIConversationMessage,
  AIProvider,
  AIProviderResult,
} from "../types";
import { createLogger } from "../utils/helpers";

export interface ProviderConfig {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  timeoutMs?: number;
  debug?: boolean;
}

export function createRequestController(
  signal?: AbortSignal,
  timeoutMs?: number,
) {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const abortFromExternal = () => {
    if (!controller.signal.aborted) {
      controller.abort(signal?.reason ?? new Error("Request aborted"));
    }
  };

  if (signal) {
    if (signal.aborted) {
      abortFromExternal();
    } else {
      signal.addEventListener("abort", abortFromExternal, { once: true });
    }
  }

  if (typeof timeoutMs === "number" && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);
  }

  return {
    signal: controller.signal,
    abort: (reason?: unknown) => controller.abort(reason),
    cleanup: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (signal) {
        signal.removeEventListener("abort", abortFromExternal);
      }
    },
  };
}

export function encodeMessages(
  messages: AIConversationMessage[],
): AIConversationMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export function getLogger(debug?: boolean) {
  return createLogger(debug);
}

export function buildTextResult(
  content: string,
  raw?: unknown,
): AIProviderResult {
  return { content, raw };
}

export function createProvider<T extends AIProvider>(provider: T): T {
  return provider;
}

export function readOpenAIContent(payload: any): string {
  const choice = payload?.choices?.[0];
  return choice?.message?.content ?? choice?.delta?.content ?? "";
}

export function readGeminiContent(payload: any): string {
  const candidate = payload?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  return parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .join("");
}

export async function readStreamingBody(
  response: Response,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (response.body && "getReader" in response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      if (signal?.aborted) {
        await reader.cancel().catch(() => undefined);
        break;
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value) {
        onChunk(decoder.decode(value, { stream: true }));
      }
    }

    const finalChunk = decoder.decode();
    if (finalChunk) {
      onChunk(finalChunk);
    }
    return;
  }

  const text = await response.text();
  onChunk(text);
}

export function consumeSseLines(
  chunk: string,
  buffer: string,
  onData: (data: string) => void,
): string {
  const combined = `${buffer}${chunk}`;
  const lines = combined.split(/\r?\n/);
  const nextBuffer = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("data:")) {
      onData(trimmed.slice(5).trim());
      continue;
    }

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      onData(trimmed);
    }
  }

  return nextBuffer;
}

export function appendToken(current: string, token: string): string {
  return `${current}${token}`;
}
