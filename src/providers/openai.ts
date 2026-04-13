import type {
  AIImageGenerationRequest,
  AIProvider,
  AIProviderRequest,
  AIProviderResult,
} from "../types";
import {
  buildTextResult,
  consumeSseLines,
  createProvider as createNativeProvider,
  createRequestController,
  getLogger,
  readOpenAIContent,
  readStreamingBody,
} from "./shared";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/generations";

export interface OpenAIProviderOptions {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  timeoutMs?: number;
  debug?: boolean;
  baseUrl?: string;
}

const MODELS = [
  "gpt-5.4",
  "gpt-5.4-pro",
  "gpt-5.4-mini",
  "o3-thinking",
  "gpt-4.1",
];

export function getModels(): string[] {
  return MODELS;
}

async function generateOpenAIImage(
  options: OpenAIProviderOptions,
  prompt: string,
  signal?: AbortSignal,
) {
  const response = await fetch(OPENAI_IMAGE_ENDPOINT, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model?.includes("image") ? options.model : "gpt-image-1",
      prompt,
      size: "1024x1024",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      errorText ||
        `OpenAI image generation failed with status ${response.status}`,
    );
  }

  const payload = await response.json();
  const item = payload?.data?.[0];
  return {
    url: typeof item?.url === "string" ? item.url : undefined,
    base64: typeof item?.b64_json === "string" ? item.b64_json : undefined,
    revisedPrompt:
      typeof item?.revised_prompt === "string"
        ? item.revised_prompt
        : undefined,
    raw: payload,
  };
}

async function requestOpenAI(
  options: OpenAIProviderOptions,
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
  const body = {
    model: options.model ?? DEFAULT_OPENAI_MODEL,
    messages,
    stream: Boolean(request.stream),
  };

  try {
    const response = await fetch(options.baseUrl ?? OPENAI_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        errorText || `OpenAI request failed with status ${response.status}`,
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
          if (data === "[DONE]") {
            return;
          }

          const payload = typeof data === "string" ? JSON.parse(data) : data;
          const token = readOpenAIContent(payload);

          if (token) {
            collected = `${collected}${token}`;
            handlers?.onToken?.(token);
          }
        });
      },
      controller.signal,
    );

    return buildTextResult(collected);
  } catch (error) {
    logger.error("OpenAI request failed", error);
    throw error;
  } finally {
    controller.cleanup();
  }
}

export function createOpenAIProvider(
  options: OpenAIProviderOptions,
): AIProvider {
  return createNativeProvider({
    name: "openai",
    sendMessage(request: AIProviderRequest) {
      return requestOpenAI(options, { ...request, stream: false });
    },
    streamMessage(
      request: AIProviderRequest & { onToken?: (token: string) => void },
    ) {
      return requestOpenAI(
        options,
        { ...request, stream: true },
        { onToken: request.onToken },
      );
    },
    generateImage(request: AIImageGenerationRequest) {
      return generateOpenAIImage(options, request.prompt, request.signal);
    },
  });
}

export const createProvider = createOpenAIProvider;
