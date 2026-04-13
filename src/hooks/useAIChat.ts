import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AIChatOptions,
  AIChatReturn,
  AIConversation,
  AIConversationMessage,
  AIDebugEvent,
  AIDebugMetrics,
  AIImageGenerationResult,
  AIMessage,
  AIMessageRole,
  AIProvider,
  AIProviderName,
  AIChatThemeMode,
  AITypingSpeed,
} from "../types";
import { getAIConfig } from "../core/config";
import { getProvider, getModels } from "../registry";
import { applyMemoryStrategy } from "../memory";
import { collectPluginTools, runPluginHandlers } from "../plugins";
import {
  buildToolResultMessage,
  executeToolCall,
  mergeTools,
  parseToolCall,
} from "../tools";
import { buildDefaultCacheKey, createId, trimContent } from "../utils/helpers";
import {
  clearCache,
  loadCache,
  saveCache,
  type AICacheSnapshot,
} from "../utils/cache";

const TYPING_SPEED_MS: Record<AITypingSpeed, number> = {
  slow: 90,
  normal: 40,
  fast: 16,
};

function createConversation(
  seedTitle = "New Chat",
  initialMessages: AIMessage[] = [],
): AIConversation {
  const now = Date.now();
  return {
    id: createId("chat"),
    title: seedTitle,
    messages: initialMessages,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeRole(
  role: AIMessageRole,
): Exclude<AIMessageRole, "tool"> | "user" {
  if (role === "tool") {
    return "user";
  }

  return role;
}

function toProviderMessages(
  messages: Array<{ role: AIMessageRole; content: string }>,
): AIConversationMessage[] {
  return messages.map((message) => ({
    role: normalizeRole(message.role),
    content: message.content,
  }));
}

function chooseAutoModel(
  provider: string,
  content: string,
  currentModel: string,
): string {
  const length = content.length;
  const availableModels = getModels(provider as AIProviderName);

  if (!availableModels.length) {
    return currentModel;
  }

  if (length > 1200) {
    return (
      availableModels.find(
        (model) =>
          model.toLowerCase().includes("pro") ||
          model.toLowerCase().includes("70b"),
      ) ?? availableModels[0]
    );
  }

  if (length > 400) {
    return (
      availableModels.find(
        (model) =>
          model.toLowerCase().includes("flash") ||
          model.toLowerCase().includes("mini"),
      ) ?? availableModels[0]
    );
  }

  return currentModel || availableModels[0];
}

async function resolveProvider(
  providerName: AIProviderName,
  apiKey: string,
  model?: string,
  systemPrompt?: string,
  timeoutMs?: number,
  debug?: boolean,
): Promise<AIProvider> {
  const registered = getProvider(providerName);
  if (registered) {
    return registered;
  }

  switch (providerName) {
    case "gemini": {
      const module = await import("../providers/gemini.js");
      return module.createGeminiProvider({
        apiKey,
        model,
        systemPrompt,
        timeoutMs,
        debug,
      });
    }
    case "anthropic": {
      const module = await import("../providers/anthropic.js");
      return module.createProvider({
        apiKey,
        model,
        systemPrompt,
        timeoutMs,
        debug,
      });
    }
    case "groq": {
      const module = await import("../providers/groq.js");
      return module.createProvider({
        apiKey,
        model,
        systemPrompt,
        timeoutMs,
        debug,
      });
    }
    case "together": {
      const module = await import("../providers/together.js");
      return module.createProvider({
        apiKey,
        model,
        systemPrompt,
        timeoutMs,
        debug,
      });
    }
    case "ollama": {
      const module = await import("../providers/ollama.js");
      return module.createProvider({ apiKey, model, timeoutMs, debug });
    }
    case "openai":
    default: {
      const module = await import("../providers/openai.js");
      return module.createOpenAIProvider({
        apiKey,
        model,
        systemPrompt,
        timeoutMs,
        debug,
      });
    }
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    const clipboard = await import("expo-clipboard").catch(() => null);
    if (clipboard?.setStringAsync) {
      await clipboard.setStringAsync(text);
      return true;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

async function hapticTap(enabled?: boolean): Promise<void> {
  if (!enabled) {
    return;
  }

  const haptics = await import("expo-haptics").catch(() => null);
  if (haptics?.impactAsync) {
    await haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
  }
}

export function useAIChat(options: AIChatOptions): AIChatReturn {
  const globalConfig = getAIConfig();
  const {
    provider = globalConfig.defaultProvider,
    apiKey,
    model = globalConfig.defaultModel,
    systemPrompt,
    cacheKey = buildDefaultCacheKey(provider, model),
    initialMessages = [],
    timeoutMs = 30000,
    enableCache = true,
    debug = globalConfig.debug,
    tools,
    plugins,
    memory,
    typingSpeed = "normal",
    haptics,
    maxToolIterations = 2,
    onDebugEvent,
    routing,
  } = options;

  const [currentProvider, setCurrentProvider] =
    useState<AIProviderName>(provider);
  const [currentModel, setCurrentModel] = useState(model);

  const initialConversationRef = useRef(
    createConversation("Chat 1", initialMessages),
  );

  const [conversations, setConversations] = useState<AIConversation[]>([
    initialConversationRef.current,
  ]);
  const [currentConversationId, setCurrentConversationId] = useState(
    initialConversationRef.current.id,
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<AIChatThemeMode>(
    options.themeMode ?? globalConfig.themeMode ?? "system",
  );
  const [debugState, setDebugState] = useState<AIDebugMetrics>({
    totalRequests: 0,
    failedRequests: 0,
    totalTokens: 0,
  });

  const conversationsRef = useRef(conversations);
  const inputRef = useRef(input);
  const abortRef = useRef<AbortController | null>(null);
  const assistantIdRef = useRef<string | null>(null);
  const tokenBufferRef = useRef("");
  const streamFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const loadingRef = useRef(false);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === currentConversationId,
      ) ?? conversations[0],
    [conversations, currentConversationId],
  );

  const messages = activeConversation?.messages ?? [];

  const emitDebug = useCallback(
    (event: AIDebugEvent) => {
      if (!debug && !onDebugEvent) {
        return;
      }

      onDebugEvent?.(event);
    },
    [debug, onDebugEvent],
  );

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  const updateConversationById = useCallback(
    (
      conversationId: string,
      updater: (conversation: AIConversation) => AIConversation,
    ) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? updater(conversation)
            : conversation,
        ),
      );
    },
    [],
  );

  const scheduleFlush = useCallback(
    (typingMs: number) => {
      if (streamFlushTimerRef.current) {
        return;
      }

      streamFlushTimerRef.current = setTimeout(() => {
        streamFlushTimerRef.current = null;
        const assistantId = assistantIdRef.current;
        if (!assistantId || !activeConversation) {
          return;
        }

        const buffered = tokenBufferRef.current;
        tokenBufferRef.current = "";
        if (!buffered) {
          return;
        }

        updateConversationById(activeConversation.id, (conversation) => ({
          ...conversation,
          updatedAt: Date.now(),
          messages: conversation.messages.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: `${message.content}${buffered}`,
                  status: "streaming" as const,
                }
              : message,
          ),
        }));
      }, typingMs);
    },
    [activeConversation, updateConversationById],
  );

  const flushImmediately = useCallback(() => {
    if (streamFlushTimerRef.current) {
      clearTimeout(streamFlushTimerRef.current);
      streamFlushTimerRef.current = null;
    }

    const assistantId = assistantIdRef.current;
    if (!assistantId || !activeConversation) {
      tokenBufferRef.current = "";
      return;
    }

    const buffered = tokenBufferRef.current;
    tokenBufferRef.current = "";
    if (!buffered) {
      return;
    }

    updateConversationById(activeConversation.id, (conversation) => ({
      ...conversation,
      updatedAt: Date.now(),
      messages: conversation.messages.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              content: `${message.content}${buffered}`,
              status: "streaming" as const,
            }
          : message,
      ),
    }));
  }, [activeConversation, updateConversationById]);

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

      if (snapshot.conversations?.length) {
        setConversations(snapshot.conversations);
        setCurrentConversationId(
          snapshot.currentConversationId ?? snapshot.conversations[0].id,
        );
      } else if (snapshot.messages?.length) {
        const restored = createConversation("Restored Chat", snapshot.messages);
        setConversations([restored]);
        setCurrentConversationId(restored.id);
      }

      if (typeof snapshot.input === "string") {
        setInput(snapshot.input);
      }

      if (snapshot.themeMode) {
        setThemeMode(snapshot.themeMode);
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

    const snapshot: AICacheSnapshot = {
      messages,
      input,
      updatedAt: Date.now(),
      conversations,
      currentConversationId,
      themeMode,
    };

    void saveCache(cacheKey, snapshot);
  }, [
    cacheKey,
    conversations,
    currentConversationId,
    enableCache,
    input,
    messages,
    themeMode,
  ]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (streamFlushTimerRef.current) {
        clearTimeout(streamFlushTimerRef.current);
      }
    };
  }, []);

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    flushImmediately();
    loadingRef.current = false;
    setIsLoading(false);

    if (assistantIdRef.current && activeConversation) {
      updateConversationById(activeConversation.id, (conversation) => ({
        ...conversation,
        updatedAt: Date.now(),
        messages: conversation.messages.map((message) =>
          message.id === assistantIdRef.current
            ? { ...message, status: "cancelled" as const }
            : message,
        ),
      }));
    }
  }, [activeConversation, flushImmediately, updateConversationById]);

  const runToolChain = useCallback(
    async (
      provider: AIProvider,
      conversationId: string,
      assistantMessageId: string,
      content: string,
    ): Promise<string> => {
      const pluginTools = collectPluginTools(plugins);
      const mergedTools = mergeTools(tools, pluginTools);

      if (Object.keys(mergedTools).length === 0) {
        return content;
      }

      let nextContent = content;
      let loop = 0;

      while (loop < maxToolIterations) {
        const parsed = parseToolCall(nextContent);
        if (!parsed) {
          break;
        }

        emitDebug({
          type: "tool:call",
          timestamp: Date.now(),
          detail: {
            toolName: parsed.name,
            args: parsed.args,
          },
        });

        const conversation = conversationsRef.current.find(
          (item) => item.id === conversationId,
        );
        if (!conversation) {
          break;
        }

        const toolResult = await executeToolCall(parsed, mergedTools, {
          conversationId,
          messages: conversation.messages,
          args: parsed.args,
        });

        emitDebug({
          type: "tool:result",
          timestamp: Date.now(),
          detail: {
            toolName: parsed.name,
          },
        });

        const toolMessage = buildToolResultMessage(parsed.name, toolResult);

        updateConversationById(conversationId, (current) => ({
          ...current,
          updatedAt: Date.now(),
          messages: current.messages
            .map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: nextContent, status: "sent" as const }
                : message,
            )
            .concat(toolMessage),
        }));

        const latest = conversationsRef.current.find(
          (item) => item.id === conversationId,
        );
        if (!latest) {
          break;
        }

        const memoryMessages = applyMemoryStrategy(
          latest,
          memory,
          systemPrompt,
        );
        const followUp = await provider.sendMessage({
          messages: toProviderMessages(memoryMessages),
        });

        nextContent = followUp.content;
        loop += 1;
      }

      return nextContent;
    },
    [
      emitDebug,
      maxToolIterations,
      memory,
      plugins,
      systemPrompt,
      tools,
      updateConversationById,
    ],
  );

  const runRequest = useCallback(
    async (
      provider: AIProvider,
      conversationId: string,
      userMessage: AIMessage,
      assistantMessage: AIMessage,
    ): Promise<AIMessage | null> => {
      const currentConversation = conversationsRef.current.find(
        (conversation) => conversation.id === conversationId,
      );
      if (!currentConversation) {
        return null;
      }

      const start = Date.now();
      emitDebug({
        type: "request:start",
        timestamp: start,
        detail: {
          provider: provider.name,
        },
      });

      await runPluginHandlers(
        plugins,
        userMessage.content,
        currentConversation.messages,
      );
      const memoryMessages = applyMemoryStrategy(
        currentConversation,
        memory,
        systemPrompt,
      );

      const response = await provider.streamMessage({
        messages: toProviderMessages(memoryMessages),
        signal: abortRef.current?.signal,
        timeoutMs,
        onToken: (token) => {
          emitDebug({
            type: "stream:token",
            timestamp: Date.now(),
            detail: {
              length: token.length,
            },
          });

          tokenBufferRef.current += token;
          scheduleFlush(TYPING_SPEED_MS[typingSpeed]);
        },
      });

      flushImmediately();

      const resolvedContent = await runToolChain(
        provider,
        conversationId,
        assistantMessage.id,
        response.content,
      );

      updateConversationById(conversationId, (conversation) => ({
        ...conversation,
        updatedAt: Date.now(),
        messages: conversation.messages.map((message) =>
          message.id === assistantMessage.id
            ? { ...message, content: resolvedContent, status: "sent" as const }
            : message,
        ),
      }));

      setDebugState((current) => ({
        ...current,
        totalRequests: current.totalRequests + 1,
        totalTokens: current.totalTokens + (response.usage?.totalTokens ?? 0),
        lastProvider: provider.name,
        lastLatencyMs: Date.now() - start,
        lastError: undefined,
      }));

      emitDebug({
        type: "request:success",
        timestamp: Date.now(),
        detail: {
          provider: provider.name,
          latencyMs: Date.now() - start,
          totalTokens: response.usage?.totalTokens,
        },
      });

      return {
        ...assistantMessage,
        content: resolvedContent,
        status: "sent",
      };
    },
    [
      emitDebug,
      flushImmediately,
      memory,
      plugins,
      runToolChain,
      scheduleFlush,
      systemPrompt,
      timeoutMs,
      typingSpeed,
      updateConversationById,
    ],
  );

  const sendMessage = useCallback(
    async (messageText?: string): Promise<AIMessage | null> => {
      const text = trimContent(messageText ?? inputRef.current);
      if (!text || loadingRef.current || !activeConversation) {
        return null;
      }

      const effectiveModel =
        routing === "auto"
          ? chooseAutoModel(currentProvider, text, currentModel)
          : currentModel;
      const provider = await resolveProvider(
        currentProvider,
        apiKey,
        effectiveModel,
        systemPrompt,
        timeoutMs,
        debug,
      );

      if (effectiveModel !== currentModel) {
        setCurrentModel(effectiveModel);
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
      loadingRef.current = true;
      tokenBufferRef.current = "";

      setError(null);
      setInput("");
      setIsLoading(true);

      updateConversationById(activeConversation.id, (conversation) => ({
        ...conversation,
        updatedAt: Date.now(),
        messages: [...conversation.messages, userMessage, assistantMessage],
      }));

      abortRef.current = new AbortController();

      try {
        const result = await runRequest(
          provider,
          activeConversation.id,
          userMessage,
          assistantMessage,
        );
        await hapticTap(haptics);
        return result;
      } catch (caughtError) {
        flushImmediately();
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to send message";
        setError(message);

        updateConversationById(activeConversation.id, (conversation) => ({
          ...conversation,
          updatedAt: Date.now(),
          messages: conversation.messages.map((item) =>
            item.id === assistantMessage.id
              ? { ...item, status: "error" as const, error: message }
              : item,
          ),
        }));

        setDebugState((current) => ({
          ...current,
          totalRequests: current.totalRequests + 1,
          failedRequests: current.failedRequests + 1,
          lastProvider: provider.name,
          lastError: message,
        }));

        emitDebug({
          type: "request:error",
          timestamp: Date.now(),
          detail: {
            provider: provider.name,
            error: message,
          },
        });

        return null;
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
        abortRef.current = null;
        assistantIdRef.current = null;
      }
    },
    [
      activeConversation,
      apiKey,
      currentModel,
      currentProvider,
      emitDebug,
      flushImmediately,
      haptics,
      debug,
      routing,
      runRequest,
      systemPrompt,
      timeoutMs,
      updateConversationById,
    ],
  );

  const clearMessages = useCallback(() => {
    if (!activeConversation) {
      return;
    }

    updateConversationById(activeConversation.id, (conversation) => ({
      ...conversation,
      updatedAt: Date.now(),
      messages: [],
    }));

    setError(null);
  }, [activeConversation, updateConversationById]);

  const retryLastMessage = useCallback(async (): Promise<AIMessage | null> => {
    if (!activeConversation) {
      return null;
    }

    const lastUser = [...activeConversation.messages]
      .reverse()
      .find((message) => message.role === "user");
    if (!lastUser) {
      return null;
    }

    return sendMessage(lastUser.content);
  }, [activeConversation, sendMessage]);

  const regenerateResponse =
    useCallback(async (): Promise<AIMessage | null> => {
      return retryLastMessage();
    }, [retryLastMessage]);

  const retryMessage = useCallback(
    async (messageId: string): Promise<AIMessage | null> => {
      if (!activeConversation) {
        return null;
      }

      const found = activeConversation.messages.find(
        (message) => message.id === messageId,
      );
      if (!found) {
        return null;
      }

      if (found.role === "user") {
        return sendMessage(found.content);
      }

      const index = activeConversation.messages.findIndex(
        (message) => message.id === messageId,
      );
      if (index <= 0) {
        return null;
      }

      const previousUser = [...activeConversation.messages.slice(0, index)]
        .reverse()
        .find((message) => message.role === "user");
      if (!previousUser) {
        return null;
      }

      return sendMessage(previousUser.content);
    },
    [activeConversation, sendMessage],
  );

  const copyMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      const message = messages.find((entry) => entry.id === messageId);
      if (!message) {
        return false;
      }

      const copied = await copyText(message.content);
      if (copied) {
        await hapticTap(haptics);
      }

      return copied;
    },
    [haptics, messages],
  );

  const createChat = useCallback(
    (title = `Chat ${conversationsRef.current.length + 1}`): string => {
      const nextConversation = createConversation(title);
      setConversations((current) => [...current, nextConversation]);
      setCurrentConversationId(nextConversation.id);
      return nextConversation.id;
    },
    [],
  );

  const switchChat = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
    setError(null);
  }, []);

  const deleteChat = useCallback(
    (conversationId: string) => {
      setConversations((current) => {
        const next = current.filter(
          (conversation) => conversation.id !== conversationId,
        );
        if (next.length > 0) {
          if (currentConversationId === conversationId) {
            setCurrentConversationId(next[0].id);
          }
          return next;
        }

        const fallback = createConversation("Chat 1");
        setCurrentConversationId(fallback.id);
        return [fallback];
      });
    },
    [currentConversationId],
  );

  const setConversationTitle = useCallback(
    (conversationId: string, title: string) => {
      updateConversationById(conversationId, (conversation) => ({
        ...conversation,
        title: title.trim() || conversation.title,
        updatedAt: Date.now(),
      }));
    },
    [updateConversationById],
  );

  const generateImage = useCallback(
    async (prompt: string): Promise<AIImageGenerationResult | null> => {
      const trimmed = trimContent(prompt);
      if (!trimmed) {
        return null;
      }

      const provider = await resolveProvider(
        currentProvider,
        apiKey,
        currentModel,
        systemPrompt,
        timeoutMs,
        debug,
      );

      emitDebug({
        type: "image:generate",
        timestamp: Date.now(),
        detail: {
          provider: provider.name,
        },
      });

      if (provider.generateImage) {
        return provider.generateImage({ prompt: trimmed, model: currentModel });
      }

      return null;
    },
    [
      apiKey,
      currentModel,
      currentProvider,
      debug,
      emitDebug,
      systemPrompt,
      timeoutMs,
    ],
  );

  useEffect(() => {
    if (!enableCache) {
      void clearCache(cacheKey);
    }
  }, [cacheKey, enableCache]);

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
    conversations,
    currentConversationId,
    createChat,
    switchChat,
    deleteChat,
    setConversationTitle,
    regenerateResponse,
    copyMessage,
    retryMessage,
    generateImage,
    setProvider: (nextProvider: AIProviderName) => {
      stopGenerating();
      setCurrentProvider(nextProvider);
    },
    setModel: (nextModel: string) => {
      stopGenerating();
      setCurrentModel(nextModel);
    },
    themeMode,
    setThemeMode,
    debugState,
  };
}
