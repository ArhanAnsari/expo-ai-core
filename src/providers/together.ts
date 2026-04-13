import type { AIProvider, AIProviderRequest, AIProviderResult } from "../types";
import {
  buildTextResult,
  consumeSseLines,
  createProvider as createNativeProvider,
  createRequestController,
  getLogger,
  readOpenAIContent,
  readStreamingBody,
} from "./shared";

const DEFAULT_MODEL = "Qwen/Qwen3.5-122B";
const TOGETHER_ENDPOINT = "https://api.together.xyz/v1/chat/completions";
const MODELS = [
  "Qwen/Qwen3.5-122B",
  "Mistral-4-Small",
  "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  "deepseek-v3.2",
  "meta-muse-spark",
];

export function getModels(): string[] {
  return MODELS;
}

async function requestTogether(
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
  const messages = options.systemPrompt
    ? [{ role: "system", content: options.systemPrompt }, ...request.messages]
    : request.messages;

  try {
    const response = await fetch(options.baseUrl ?? TOGETHER_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model ?? DEFAULT_MODEL,
        messages,
        stream: Boolean(request.stream),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        errorText || `Together request failed with status ${response.status}`,
      );
    }

    if (!request.stream) {
      const payload = await response.json();
      const content = readOpenAIContent(payload);
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
          const token = readOpenAIContent(payload);
          if (token) {
            collected += token;
            handlers?.onToken?.(token);
          }
        });
      },
      controller.signal,
    );

    return buildTextResult(collected);
  } catch (error) {
    logger.error("Together request failed", error);
    throw error;
  } finally {
    controller.cleanup();
  }
}

export function createProvider(options = {} as any): AIProvider {
  return createNativeProvider({
    name: "together",
    sendMessage(request) {
      return requestTogether(options, { ...request, stream: false });
    },
    streamMessage(request) {
      return requestTogether(
        options,
        { ...request, stream: true },
        { onToken: request.onToken },
      );
    },
  });
}
