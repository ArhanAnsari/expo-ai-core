# expo-ai-core

> Production-ready AI for Expo and React Native, built for chat, streaming, voice, tools, memory, plugins, agents, and custom providers.

`expo-ai-core` is a TypeScript-first AI SDK for Expo apps. It is designed to stay Expo Go compatible, avoid Node-only APIs, and give you a small but capable surface for shipping AI features in production.

Version 1.0.1 refreshes the model registry, provider catalogs, and documentation so the package is easier to adopt, easier to extend, and clearer to maintain.

## What is new in 1.0.1

- Updated model catalog ordering by release series and popularity.
- Registry-backed provider discovery with runtime registration.
- Lazy provider loading so unused providers do not inflate bundles.
- Stable root exports for hooks, UI, providers, registry helpers, tools, plugins, memory, and agents.
- More detailed documentation for config, model discovery, custom providers, and Expo-native voice support.

## Why use expo-ai-core

- Expo Go compatible
- Client-side only networking using `fetch`
- Strong TypeScript types and autocomplete-friendly APIs
- Built-in support for chat, streaming, voice, tools, memory, plugins, and agents
- Provider architecture inspired by the Vercel AI SDK pattern, but tailored for Expo and React Native
- Backward compatible with existing `useAIChat` integrations

## Install

Core package:

```bash
npm install expo-ai-core
```

Recommended Expo-native peers for the full experience:

```bash
npm install expo-speech expo-av @react-native-async-storage/async-storage
```

Optional UX helpers:

```bash
npm install expo-clipboard expo-haptics
```

If you use a package manager with strict peer handling, install the optional packages up front so copy actions and haptics work without extra setup.

## Quick start

```tsx
import { AIChatView, useAIChat } from "expo-ai-core";

export default function Screen() {
  const chat = useAIChat({
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY as string,
    provider: "openai",
    model: "gpt-4o-mini",
  });

  return <AIChatView {...chat} title="Assistant" subtitle="Expo AI Core" />;
}
```

Send a message manually:

```tsx
await chat.sendMessage("Summarize this screen for me.");
```

## Getting started with configuration

You can set app-wide defaults once and let every hook inherit them:

```tsx
import { configureAI } from "expo-ai-core";

configureAI({
  defaultProvider: "openai",
  defaultModel: "gpt-4o-mini",
  debug: false,
  themeMode: "system",
});
```

`configureAI()` currently controls these defaults:

- `defaultProvider`
- `defaultModel`
- `debug`
- `themeMode`

Those values are merged with per-hook overrides when you call `useAIChat()`.

## Public API at a glance

Root exports include:

- `useAIChat`, `useAIVoice`
- `AIChatView`, `AIInput`, `AIMessageBubble`, `AITypingIndicator`, `MarkdownText`
- `configureAI`, `getAIConfig`
- `registerProvider`, `unregisterProvider`, `getProvider`, `getRegisteredProvider`, `getProviderOrThrow`, `getModels`, `listProviders`, `listRegisteredProviders`
- `createProvider`, `createOpenAIProvider`, `createGeminiProvider`, `createAnthropicProvider`, `createGroqProvider`, `createTogetherProvider`, `createOllamaProvider`
- `createPlugin`, `collectPluginTools`, `runPluginHandlers`
- `createAgent`, `runAgent`
- `parseToolCall`, `executeToolCall`, `mergeTools`, `buildToolResultMessage`
- `lightTheme`, `darkTheme`, `resolveTheme`
- `memory`, `tools`, and `utils` helpers

## Chat

`useAIChat()` is the main orchestration hook. It handles message state, streaming, retries, regeneration, tool calls, caching, multi-conversation flows, and provider switching.

```tsx
import { useAIChat } from "expo-ai-core";

const chat = useAIChat({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY as string,
  provider: "openai",
  model: "gpt-4o-mini",
  systemPrompt: "You are a concise mobile assistant.",
  typingSpeed: "normal",
  haptics: true,
});
```

Useful options:

- `provider`, `apiKey`, `model`
- `systemPrompt`
- `initialMessages`
- `cacheKey`, `enableCache`
- `timeoutMs`
- `tools`, `plugins`, `memory`
- `typingSpeed`
- `themeMode`
- `haptics`
- `maxToolIterations`
- `onDebugEvent`
- `routing: "auto"`

Useful return values:

- `messages`, `input`, `setInput`
- `sendMessage()`, `isLoading`, `error`
- `stopGenerating()`, `clearMessages()`
- `retryLastMessage()`, `retryMessage()`
- `regenerateResponse()`
- `copyMessage()`
- `generateImage()`
- `createChat()`, `switchChat()`, `deleteChat()`, `setConversationTitle()`
- `setProvider()`, `setModel()`, `setThemeMode()`
- `conversations`, `currentConversationId`
- `debugState`

### Example: provider switching at runtime

```tsx
const chat = useAIChat({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY as string,
  provider: "openai",
  model: "gpt-4o-mini",
});

chat.setProvider("gemini");
chat.setModel("gemini-3.1-flash");
```

### Example: streaming and recovery controls

```tsx
await chat.sendMessage("Draft a release note.");

chat.stopGenerating();
await chat.retryLastMessage();
await chat.regenerateResponse();
```

## Voice

`useAIVoice()` wraps speech input and speech output in a React hook that stays Expo-friendly.

```tsx
import { useAIVoice } from "expo-ai-core";

const voice = useAIVoice({
  language: "en-US",
  autoSpeak: true,
  loop: false,
  speechRate: 1,
  speechPitch: 1,
});
```

Options:

- `language`
- `continuous`
- `interimResults`
- `autoSpeak`
- `speechRate`
- `speechPitch`
- `loop`
- `onTranscript`
- `onVoiceError`

Return values:

- `startListening()`, `stopListening()`
- `transcript`
- `isListening`
- `recordingUri`
- `error`
- `speak()`
- `clearTranscript()`

## UI components

The package includes lightweight UI primitives you can use directly or adapt into your own design system.

- `AIChatView` - full chat screen composition
- `AIInput` - message input and send control
- `AIMessageBubble` - message rendering with copy support
- `AITypingIndicator` - assistant typing state
- `MarkdownText` - markdown-aware message content renderer

`AIChatView` accepts the full `AIChatReturn` surface, plus optional title, subtitle, custom renderers, and theme overrides.

## Providers

`expo-ai-core` ships with built-in providers and a registry so you can add your own provider without modifying the package internals.

Built-in providers:

- OpenAI
- Gemini
- Anthropic
- Groq
- Together
- Ollama

### Provider helpers

Use the built-in creator helpers if you want to assemble providers manually:

```tsx
import {
  createOpenAIProvider,
  createGeminiProvider,
  createAnthropicProvider,
  createGroqProvider,
  createTogetherProvider,
  createOllamaProvider,
} from "expo-ai-core";
```

### Registry helpers

```tsx
import {
  registerProvider,
  unregisterProvider,
  getProvider,
  getProviderOrThrow,
  listProviders,
  getModels,
} from "expo-ai-core";
```

`getModels(provider)` returns the curated catalog for that provider. The lists in v1.0.1 are intentionally ordered so the most relevant models appear first.

## Model catalog in v1.0.1

These are the default provider model lists bundled with the package.

### OpenAI

`gpt-5.4`, `gpt-5.4-pro`, `gpt-5.4-mini`, `o3-thinking`, `gpt-4.1`

### Gemini

`gemini-3.1-pro`, `gemini-3.1-flash`, `gemini-3.1-flash-lite`, `gemini-2.5-pro`, `nano-banana-2`

### Anthropic

`claude-opus-4.6`, `claude-sonnet-4.6`, `claude-haiku-4.5`, `claude-sonnet-4.0`, `claude-mythos-preview`

### Groq

`llama-4-maverick`, `llama-4-scout-17b`, `llama-3.3-70b-versatile`, `qwen3-32b`, `gpt-oss-120b`

### Together

`Qwen/Qwen3.5-122B`, `Mistral-4-Small`, `meta-llama/Llama-3.3-70B-Instruct-Turbo`, `deepseek-v3.2`, `meta-muse-spark`

### Ollama

`llama4`, `gemma4`, `qwen3`, `mistral-large-2`, `phi-4`

If you need a different list, register your own provider or replace the catalog at the app layer.

## Custom providers

You can register a custom provider and keep the rest of the SDK unchanged.

```tsx
import { createProvider, registerProvider } from "expo-ai-core";

registerProvider(
  createProvider({
    name: "custom",
    sendMessage: async () => ({
      content: "Hello from a custom provider",
    }),
  }),
);
```

If you already have your own network layer, `createProvider()` is the easiest way to normalize it into the `AIProvider` interface.

## Tools

Tools let the model call typed local functions on-device.

```tsx
const chat = useAIChat({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY as string,
  tools: {
    getLocation: async () => ({ lat: 40.7128, lng: -74.006 }),
    getTime: () => new Date().toISOString(),
  },
});
```

Tool execution is handled through the package helpers and the `tools` option on `useAIChat()`.

## Memory

`memory` gives you persistence-aware conversation behavior. The bundled strategies support a rolling window and a summary mode.

```tsx
const chat = useAIChat({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY as string,
  memory: {
    enabled: true,
    strategy: "summary",
    windowSize: 20,
    maxSummaryLength: 1200,
  },
});
```

Recommended use cases:

- `window` for short lived, recent-context conversations
- `summary` for longer sessions where you want to compress history

## Plugins

Plugins let you package reusable behavior, tools, and handlers.

```tsx
import { createPlugin } from "expo-ai-core";

const weatherPlugin = createPlugin({
  name: "weather",
  tools: {
    getWeather: async () => ({ tempC: 24, condition: "clear" }),
  },
});
```

Use plugins when you want to share a feature bundle across screens or products.

## Agents

Agents are useful for multi-step workflows that need a goal, several instructions, and optional tool execution.

```tsx
import { createAgent } from "expo-ai-core";

const agent = createAgent({
  goal: "Plan a product launch summary",
  steps: [
    { id: "research", instruction: "Summarize the launch context." },
    { id: "draft", instruction: "Write a short launch brief." },
  ],
  provider,
});
```

## Themes

The package includes light and dark theme presets plus a small resolver helper.

```tsx
import { darkTheme, lightTheme, resolveTheme } from "expo-ai-core";
```

You can also pass partial theme overrides into `AIChatView`, `AIMessageBubble`, and related UI primitives.

## Example app

The local `example` folder contains an Expo integration reference app.

See the demo repository here: https://github.com/ArhanAnsari/expo-ai-core-demo

## Typical import patterns

```tsx
import {
  AIChatView,
  AIMessageBubble,
  configureAI,
  createProvider,
  getModels,
  registerProvider,
  useAIChat,
  useAIVoice,
} from "expo-ai-core";
```

## Troubleshooting

- Make sure your provider key is available at runtime, usually through an Expo public environment variable.
- Install the optional peers if you want clipboard, haptics, speech, or recording features.
- If a provider is not registered, `useAIChat()` falls back to the built-in lazy loader for that provider name.
- If you need a model that is not in the bundled catalog, register a custom provider or update the provider list in your app layer.

## Roadmap

- Structured output helpers
- Attachment and multimodal abstractions
- Provider capability introspection
- More agent orchestration utilities

## Contributing

1. Fork the repo
2. Create a feature branch
3. Add tests and docs
4. Open a pull request with a clear description and reproduction steps

## License

MIT
