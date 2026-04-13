import type { AIProvider, AIProviderRequest, AIProviderResult } from "../types";
import {
  buildTextResult,
  consumeSseLines,
  createProvider as createNativeProvider,
  createRequestController,
  getLogger,
  readStreamingBody,
} from "./shared";

const DEFAULT_MODEL = "claude-opus-4.6";
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODELS = [
  "claude-opus-4.6",
  "claude-sonnet-4.6",
  "claude-haiku-4.5",
  "claude-sonnet-4.0",
  "claude-mythos-preview",
];

export function getModels(): string[] {
  return MODELS;
}

function mapMessages(messages: AIProviderRequest["messages"]) {
  const system = messages.find((message) => message.role === "system")?.content;
  const converted = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }));

  return { system, messages: converted };
}

async function requestAnthropic(
  options: {
    apiKey: string;
    model?: string;
    systemPrompt?: string;
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
  const { system, messages } = mapMessages(
    options.systemPrompt
      ? [{ role: "system", content: options.systemPrompt }, ...request.messages]
      : request.messages,
  );

  try {
    const response = await fetch(options.baseUrl ?? ANTHROPIC_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": options.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: options.model ?? DEFAULT_MODEL,
        system,
        messages,
        max_tokens: 1024,
        stream: Boolean(request.stream),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        errorText || `Anthropic request failed with status ${response.status}`,
      );
    }

    if (!request.stream) {
      const payload = await response.json();
      const content = Array.isArray(payload?.content)
        ? payload.content
            .map((part: any) =>
              typeof part?.text === "string" ? part.text : "",
            )
            .join("")
        : "";
      return buildTextResult(content, payload);
    }

    let collected = "";
    let buffer = "";
    await readStreamingBody(
      response,
      (chunk) => {
        buffer = consumeSseLines(chunk, buffer, (data) => {
          if (!data || data === "[DONE]") {
            return;
          }

          const payload = JSON.parse(data);
          const delta =
            payload?.delta?.text ??
            payload?.content_block_delta?.delta?.text ??
            "";
          if (typeof delta === "string" && delta) {
            collected += delta;
            handlers?.onToken?.(delta);
          }
        });
      },
      controller.signal,
    );

    return buildTextResult(collected);
  } catch (error) {
    logger.error("Anthropic request failed", error);
    throw error;
  } finally {
    controller.cleanup();
  }
}

export function createProvider(options = {} as any): AIProvider {
  return createNativeProvider({
    name: "anthropic",
    sendMessage(request) {
      return requestAnthropic(options, { ...request, stream: false });
    },
    streamMessage(request) {
      return requestAnthropic(
        options,
        { ...request, stream: true },
        { onToken: request.onToken },
      );
    },
  });
}
