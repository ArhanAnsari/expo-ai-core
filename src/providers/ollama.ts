import type { AIProvider, AIProviderRequest, AIProviderResult } from "../types";
import {
  buildTextResult,
  createProvider as createNativeProvider,
  createRequestController,
  getLogger,
} from "./shared";

const DEFAULT_MODEL = "llama4";
const OLLAMA_ENDPOINT = "http://localhost:11434/api/chat";
const MODELS = ["llama4", "gemma4", "qwen3", "mistral-large-2", "phi-4"];

export function getModels(): string[] {
  return MODELS;
}

function mapMessages(messages: AIProviderRequest["messages"]) {
  return messages.map((message) => ({
    role: message.role === "tool" ? "user" : message.role,
    content: message.content,
  }));
}

async function requestOllama(
  options: {
    model?: string;
    timeoutMs?: number;
    debug?: boolean;
    baseUrl?: string;
  },
  request: AIProviderRequest & { stream?: boolean },
  handlers?: { onToken?: (token: string) => void },
): Promise<AIProviderResult> {
  const logger = getLogger(options.debug);
  const controller = createRequestController(
    request.signal,
    request.timeoutMs ?? options.timeoutMs,
  );

  try {
    const response = await fetch(options.baseUrl ?? OLLAMA_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model ?? DEFAULT_MODEL,
        messages: mapMessages(request.messages),
        stream: Boolean(request.stream),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        errorText || `Ollama request failed with status ${response.status}`,
      );
    }

    if (!request.stream) {
      const payload = await response.json();
      return buildTextResult(
        payload?.message?.content ?? payload?.response ?? "",
        payload,
      );
    }

    const text = await response.text();
    let collected = "";

    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      const payload = JSON.parse(trimmed);
      const token = payload?.message?.content ?? payload?.response ?? "";
      if (token) {
        collected += token;
        handlers?.onToken?.(token);
      }
    }

    return buildTextResult(collected);
  } catch (error) {
    logger.error("Ollama request failed", error);
    throw error;
  } finally {
    controller.cleanup();
  }
}

export function createProvider(options = {} as any): AIProvider {
  return createNativeProvider({
    name: "ollama",
    sendMessage(request) {
      return requestOllama(options, { ...request, stream: false });
    },
    streamMessage(request) {
      return requestOllama(
        options,
        { ...request, stream: true },
        { onToken: request.onToken },
      );
    },
  });
}
