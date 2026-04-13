import type { AIProvider, AIProviderRequest, AIProviderResult } from "../types";
import {
  buildTextResult,
  consumeSseLines,
  readOpenAIContent,
  readStreamingBody,
} from "./shared";

export interface UniversalProviderConfig {
  name: string;
  sendMessage: (input: AIProviderRequest) => Promise<Response>;
  streamMessage?: (
    input: AIProviderRequest,
  ) => AsyncIterable<string> | Promise<Response>;
  models?: string[];
}

export function createProvider(config: UniversalProviderConfig): AIProvider {
  return {
    name: config.name,
    sendMessage: async (request: AIProviderRequest) => {
      const response = await config.sendMessage(request);
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          errorText ||
            `${config.name} request failed with status ${response.status}`,
        );
      }

      const payload = await response.json();
      const content =
        typeof payload === "string"
          ? payload
          : readOpenAIContent(payload) || payload?.text || "";
      return buildTextResult(content, payload);
    },
    streamMessage: async (request) => {
      if (!config.streamMessage) {
        const response = await config.sendMessage(request);
        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(
            errorText ||
              `${config.name} request failed with status ${response.status}`,
          );
        }

        const payload = await response.json();
        const content =
          typeof payload === "string"
            ? payload
            : readOpenAIContent(payload) || payload?.text || "";
        return buildTextResult(content, payload);
      }

      const stream = await config.streamMessage(request);
      let collected = "";

      if (typeof (stream as Response)?.body !== "undefined") {
        const response = stream as Response;
        await readStreamingBody(
          response,
          (chunk) => {
            consumeSseLines(chunk, "", (data) => {
              if (!data || data === "[DONE]") {
                return;
              }
              collected += data;
            });
          },
          request.signal,
        );
        return buildTextResult(collected);
      }

      for await (const token of stream as AsyncIterable<string>) {
        collected += token;
      }

      return buildTextResult(collected);
    },
  };
}
