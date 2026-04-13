import type { AIChatThemeMode, AIProviderName } from "../types";

export interface AIConfiguration {
  defaultProvider: AIProviderName;
  defaultModel: string;
  debug?: boolean;
  themeMode?: AIChatThemeMode;
}

const globalKey = "__expo_ai_core_config__";

function getStore(): AIConfiguration {
  const globalObject = globalThis as typeof globalThis & {
    [globalKey]?: AIConfiguration;
  };
  if (!globalObject[globalKey]) {
    globalObject[globalKey] = {
      defaultProvider: "openai",
      defaultModel: "gpt-4o-mini",
      debug: false,
      themeMode: "system",
    };
  }

  return globalObject[globalKey];
}

export function configureAI(config: Partial<AIConfiguration>): AIConfiguration {
  const current = getStore();
  const next = { ...current, ...config };
  const globalObject = globalThis as typeof globalThis & {
    [globalKey]?: AIConfiguration;
  };
  globalObject[globalKey] = next;
  return next;
}

export function getAIConfig(): AIConfiguration {
  return getStore();
}
