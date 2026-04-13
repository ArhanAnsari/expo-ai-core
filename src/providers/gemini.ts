import type {
  AIImageGenerationRequest,
  AIProvider,
  AIProviderRequest,
  AIProviderResult,
} from "../types";
import {
  appendToken,
  buildTextResult,
  consumeSseLines,
  createProvider as createNativeProvider,
  createRequestController,
  getLogger,
  readGeminiContent,
  readStreamingBody,
} from "./shared";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiProviderOptions {
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  timeoutMs?: number;
  debug?: boolean;
  baseUrl?: string;
}

const MODELS = [
  "gemini-3.1-pro",
  "gemini-3.1-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-pro",
  "nano-banana-2",
];

export function getModels(): string[] {
  return MODELS;
}

async function generateGeminiImage(
  options: GeminiProviderOptions,
  prompt: string,
  signal?: AbortSignal,
) {
  const model = options.model ?? "gemini-2.0-flash-preview-image-generation";
  const url = `${options.baseUrl ?? GEMINI_ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(options.apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      errorText ||
        `Gemini image generation failed with status ${response.status}`,
    );
  }

  const payload = await response.json();
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const inlineData = parts.find((part: any) => part?.inlineData?.data)
    ?.inlineData?.data;
  const textPart = parts.find(
    (part: any) => typeof part?.text === "string",
  )?.text;

  return {
    base64: typeof inlineData === "string" ? inlineData : undefined,
    revisedPrompt: typeof textPart === "string" ? textPart : undefined,
    raw: payload,
  };
}

function mapGeminiMessages(messages: AIProviderRequest["messages"]) {
  return messages.map((message: AIProviderRequest["messages"][number]) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

async function requestGemini(
  options: GeminiProviderOptions,
  request: AIProviderRequest & { stream?: boolean },
  handlers?: { onToken?: (token: string) => void },
): Promise<AIProviderResult> {
  const logger = getLogger(options.debug);
  const controller = createRequestController(
    request.signal,
    request.timeoutMs ?? options.timeoutMs,
  );
  const model = options.model ?? DEFAULT_GEMINI_MODEL;
  const url = `${options.baseUrl ?? GEMINI_ENDPOINT}/${model}:${request.stream ? "streamGenerateContent" : "generateContent"}?key=${encodeURIComponent(options.apiKey)}`;
  const contents = mapGeminiMessages(request.messages);

  const body = {
    ...(options.systemPrompt
      ? { systemInstruction: { parts: [{ text: options.systemPrompt }] } }
      : null),
    contents,
    generationConfig: {
      temperature: 0.7,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        errorText || `Gemini request failed with status ${response.status}`,
      );
    }

    if (!request.stream) {
      const payload = await response.json();
      const content = readGeminiContent(payload);
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
          const token = readGeminiContent(payload);

          if (token) {
            collected = appendToken(collected, token);
            handlers?.onToken?.(token);
          }
        });
      },
      controller.signal,
    );

    return buildTextResult(collected);
  } catch (error) {
    logger.error("Gemini request failed", error);
    throw error;
  } finally {
    controller.cleanup();
  }
}

export function createGeminiProvider(
  options: GeminiProviderOptions,
): AIProvider {
  return createNativeProvider({
    name: "gemini",
    sendMessage(request: AIProviderRequest) {
      return requestGemini(options, { ...request, stream: false });
    },
    streamMessage(
      request: AIProviderRequest & { onToken?: (token: string) => void },
    ) {
      return requestGemini(
        options,
        { ...request, stream: true },
        { onToken: request.onToken },
      );
    },
    generateImage(request: AIImageGenerationRequest) {
      return generateGeminiImage(options, request.prompt, request.signal);
    },
  });
}

export const createProvider = createGeminiProvider;
