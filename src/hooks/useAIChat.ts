import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AIChatOptions, AIChatReturn, AIMessage } from "../types";
import { createGeminiProvider } from "../providers/gemini";
import { createOpenAIProvider } from "../providers/openai";
import { buildDefaultCacheKey, createId, trimContent } from "../utils/helpers";
import { clearCache, loadCache, saveCache } from "../utils/cache";
import type { AIProvider } from "../types";
import type { AICacheSnapshot } from "../utils/cache";

function createChatProvider(
  options: Pick<
    AIChatOptions,
    "provider" | "apiKey" | "model" | "systemPrompt" | "timeoutMs" | "debug"
  >,
): AIProvider {
  if (options.provider === "gemini") {
    return createGeminiProvider({
      apiKey: options.apiKey,
      model: options.model,
      systemPrompt: options.systemPrompt,
      timeoutMs: options.timeoutMs,
      debug: options.debug,
    });
  }

  return createOpenAIProvider({
    apiKey: options.apiKey,
    model: options.model,
    systemPrompt: options.systemPrompt,
    timeoutMs: options.timeoutMs,
    debug: options.debug,
  });
}

export function useAIChat(options: AIChatOptions): AIChatReturn {
  const {
    provider,
    apiKey,
    model,
    systemPrompt,
    cacheKey = buildDefaultCacheKey(provider, model),
    initialMessages = [],
    timeoutMs = 30000,
    enableCache = true,
    debug,
  } = options;

  const providerInstance = useMemo(
    () =>
      createChatProvider({
        provider,
        apiKey,
        model,
        systemPrompt,
        timeoutMs,
        debug,
      }),
    [provider, apiKey, model, systemPrompt, timeoutMs, debug],
  );

  const [messages, setMessages] = useState<AIMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef(messages);
  const inputRef = useRef(input);
  const abortRef = useRef<AbortController | null>(null);
  const assistantIdRef = useRef<string | null>(null);
  const partialRef = useRef("");
  const loadingRef = useRef(false);
  const streamFlushScheduledRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    let mounted = true;

    async function restore() {
      if (!enableCache) {
        return;
      }

      const snapshot = await loadCache<AICacheSnapshot>(cacheKey);
      if (!mounted || !snapshot) {
        return;
      }

      if (snapshot.messages.length > 0 && messagesRef.current.length === 0) {
        setMessages(snapshot.messages);
      }

      if (typeof snapshot.input === "string" && !inputRef.current) {
        setInput(snapshot.input);
      }
    }

    void restore();

    return () => {
      mounted = false;
    };
  }, [cacheKey, enableCache]);

  useEffect(() => {
    if (!enableCache) {
      return;
    }

    void saveCache(cacheKey, {
      messages,
      input,
      updatedAt: Date.now(),
    });
  }, [cacheKey, enableCache, messages, input]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const flushPartial = useCallback((value: string) => {
    partialRef.current = value;

    if (streamFlushScheduledRef.current) {
      return;
    }

    streamFlushScheduledRef.current = true;
    requestAnimationFrame(() => {
      streamFlushScheduledRef.current = false;
      const assistantId = assistantIdRef.current;
      if (!assistantId) {
        return;
      }

      setMessages((current: AIMessage[]) =>
        current.map((message: AIMessage) =>
          message.id === assistantId
            ? { ...message, content: partialRef.current, status: "streaming" }
            : message,
        ),
      );
    });
  }, []);

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    loadingRef.current = false;
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(
    async (messageText?: string): Promise<AIMessage | null> => {
      const text = trimContent(messageText ?? inputRef.current);
      if (!text || loadingRef.current) {
        return null;
      }

      const userMessage: AIMessage = {
        id: createId("user"),
        role: "user",
        content: text,
        createdAt: Date.now(),
        status: "sent",
      };

      const assistantMessage: AIMessage = {
        id: createId("assistant"),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        status: "streaming",
      };

      assistantIdRef.current = assistantMessage.id;
      partialRef.current = "";
      loadingRef.current = true;
      setError(null);
      setInput("");
      setIsLoading(true);
      setMessages((current: AIMessage[]) => [
        ...current,
        userMessage,
        assistantMessage,
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const conversation = [...messagesRef.current, userMessage];
        const result = await providerInstance.streamMessage({
          messages: conversation.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          signal: controller.signal,
          timeoutMs,
          onToken: (token: string) => {
            flushPartial(`${partialRef.current}${token}`);
          },
        });

        const content = result.content || partialRef.current;
        setMessages((current: AIMessage[]) => {
          const assistantId = assistantIdRef.current;
          if (!assistantId) {
            return current;
          }

          return current.map((message: AIMessage) =>
            message.id === assistantId
              ? { ...message, content, status: "sent" }
              : message,
          );
        });

        const completedAssistantMessage: AIMessage = {
          ...assistantMessage,
          content,
          status: "sent",
        };

        return completedAssistantMessage;
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to send message";
        setError(message);
        setMessages((current: AIMessage[]) => {
          const assistantId = assistantIdRef.current;
          if (!assistantId) {
            return current;
          }

          return current.map((item: AIMessage) =>
            item.id === assistantId
              ? {
                  ...item,
                  content: partialRef.current,
                  status: "error",
                  error: message,
                }
              : item,
          );
        });
        return null;
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
        abortRef.current = null;
        assistantIdRef.current = null;
      }
    },
    [flushPartial, providerInstance, timeoutMs],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    if (enableCache) {
      void clearCache(cacheKey);
    }
  }, [cacheKey, enableCache]);

  const retryLastMessage = useCallback(async (): Promise<AIMessage | null> => {
    const lastUserEntry = [...messagesRef.current]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find((entry) => entry.message.role === "user");
    if (!lastUserEntry) {
      return null;
    }

    const lastUserIndex = lastUserEntry.index;
    const nextMessages = messagesRef.current.slice(0, lastUserIndex);
    const content = lastUserEntry.message.content;
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    return sendMessage(content);
  }, [sendMessage]);

  return {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    error,
    stopGenerating,
    clearMessages,
    retryLastMessage,
  };
}
