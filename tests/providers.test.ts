import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAIProvider } from "../src/providers/openai";
import { createGeminiProvider } from "../src/providers/gemini";

const restoreFetch = () => {
  vi.unstubAllGlobals();
};

afterEach(() => {
  restoreFetch();
});

describe("providers", () => {
  it("parses streamed OpenAI responses from SSE text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: [DONE]\n',
        json: async () => ({ choices: [{ message: { content: "Hello" } }] }),
      })),
    );

    const provider = createOpenAIProvider({
      apiKey: "test",
      model: "gpt-4o-mini",
    });
    const result = await provider.streamMessage({
      messages: [{ role: "user", content: "Say hello" }],
      onToken: () => undefined,
    });

    expect(result.content).toBe("Hello");
  });

  it("parses streamed Gemini responses from SSE text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          'data: {"candidates":[{"content":{"parts":[{"text":"Hel"}]}}]}\n\ndata: {"candidates":[{"content":{"parts":[{"text":"lo"}]}}]}\n\ndata: [DONE]\n',
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Hello" }] } }],
        }),
      })),
    );

    const provider = createGeminiProvider({
      apiKey: "test",
      model: "gemini-2.5-flash",
    });
    const result = await provider.streamMessage({
      messages: [{ role: "user", content: "Say hello" }],
      onToken: () => undefined,
    });

    expect(result.content).toBe("Hello");
  });
});
