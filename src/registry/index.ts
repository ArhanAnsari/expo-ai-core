import type { AIProvider, AIProviderName } from "../types";

const providers = new Map<string, AIProvider>();
/** >  * One Quick Tip for v1.0.1:

Since model names change every few months, you might want to consider adding a

"Custom Model" option in your registerProvider logic. This allows users to use

a model that was released after you published your npm package without waiting

for you to push a new version!
*/
const modelMap = new Map<string, string[]>([
  [
    "openai",
    ["gpt-5.4", "gpt-5.4-pro", "gpt-5.4-mini", "o3-thinking", "gpt-4.1"],
  ],
  [
    "gemini",
    [
      "gemini-3.1-pro",
      "gemini-3.1-flash",
      "gemini-3.1-flash-lite",
      "gemini-2.5-pro",
      "nano-banana-2",
    ],
  ],
  [
    "anthropic",
    [
      "claude-opus-4.6",
      "claude-sonnet-4.6",
      "claude-haiku-4.5",
      "claude-sonnet-4.0",
      "claude-mythos-preview",
    ],
  ],
  [
    "groq",
    [
      "llama-4-maverick",
      "llama-4-scout-17b",
      "llama-3.3-70b-versatile",
      "qwen3-32b",
      "gpt-oss-120b",
    ],
  ],
  [
    "together",
    [
      "Qwen/Qwen3.5-122B",
      "Mistral-4-Small",
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "deepseek-v3.2",
      "meta-muse-spark",
    ],
  ],
  ["ollama", ["llama4", "gemma4", "qwen3", "mistral-large-2", "phi-4"]],
]);

export function registerProvider(provider: AIProvider): void {
  providers.set(provider.name, provider);
}

export function unregisterProvider(name: AIProviderName): void {
  providers.delete(name);
}

export function getProvider(name: AIProviderName): AIProvider | undefined {
  return providers.get(name);
}

export function getProviderOrThrow(name: AIProviderName): AIProvider {
  const provider = getProvider(name);
  if (!provider) {
    throw new Error(`Provider '${name}' is not registered.`);
  }

  return provider;
}

export function setProviderModels(
  name: AIProviderName,
  models: string[],
): void {
  modelMap.set(name, models);
}

export function getModels(name: AIProviderName): string[] {
  return modelMap.get(name) ?? [];
}

export function listProviders(): AIProvider[] {
  return Array.from(providers.values());
}

export const listRegisteredProviders = listProviders;
export const getRegisteredProvider = getProvider;

export function hasProvider(name: AIProviderName): boolean {
  return providers.has(name);
}
