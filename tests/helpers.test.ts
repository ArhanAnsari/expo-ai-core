import { describe, expect, it } from "vitest";
import {
  buildDefaultCacheKey,
  toConversationMessages,
  trimContent,
} from "../src/utils/helpers";
import type { AIMessage } from "../src/types";

describe("helpers", () => {
  it("builds cache keys consistently", () => {
    expect(buildDefaultCacheKey("openai", "gpt-4o-mini")).toBe(
      "expo-ai-core:openai:gpt-4o-mini",
    );
  });

  it("trims message text", () => {
    expect(trimContent("  hello  ")).toBe("hello");
  });

  it("converts chat messages to provider messages", () => {
    const messages: AIMessage[] = [
      { id: "1", role: "user", content: "Hello", createdAt: 1 },
    ];
    expect(toConversationMessages(messages, "You are helpful")).toEqual([
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hello" },
    ]);
  });
});
