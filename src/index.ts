export * from "./types";

export { useAIChat, useAIVoice } from "./hooks";

export {
  AIChatView,
  AIInput,
  AIMessageBubble,
  AITypingIndicator,
  MarkdownText,
} from "./components";

export { lightTheme, darkTheme, resolveTheme } from "./ui/theme";

export {
  createOpenAIProvider,
  getModels as getOpenAIModels,
} from "./providers/openai";
export {
  createGeminiProvider,
  getModels as getGeminiModels,
} from "./providers/gemini";
export { createProvider } from "./providers/adapter";
export {
  createProvider as createAnthropicProvider,
  getModels as getAnthropicModels,
} from "./providers/anthropic";
export {
  createProvider as createGroqProvider,
  getModels as getGroqModels,
} from "./providers/groq";
export {
  createProvider as createTogetherProvider,
  getModels as getTogetherModels,
} from "./providers/together";
export {
  createProvider as createOllamaProvider,
  getModels as getOllamaModels,
} from "./providers/ollama";

export {
  registerProvider,
  unregisterProvider,
  getProvider,
  getRegisteredProvider,
  getProviderOrThrow,
  getModels,
  listRegisteredProviders,
  listProviders,
} from "./registry";

export { configureAI, getAIConfig } from "./core";

export { createPlugin, collectPluginTools, runPluginHandlers } from "./plugins";
export { createAgent, runAgent } from "./agents";
export {
  parseToolCall,
  executeToolCall,
  mergeTools,
  buildToolResultMessage,
} from "./tools";

export * from "./memory";
export * from "./utils";
