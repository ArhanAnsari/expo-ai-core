import type { AIPlugin, AIToolsMap } from "../types";

export function createPlugin(plugin: AIPlugin): AIPlugin {
  if (!plugin.name?.trim()) {
    throw new Error("Plugin name is required.");
  }

  return plugin;
}

export function collectPluginTools(plugins?: AIPlugin[]): AIToolsMap {
  if (!plugins?.length) {
    return {};
  }

  return plugins.reduce<AIToolsMap>((acc, plugin) => {
    if (!plugin.tools) {
      return acc;
    }

    for (const [name, handler] of Object.entries(plugin.tools)) {
      acc[name] = handler;
    }

    return acc;
  }, {});
}

export async function runPluginHandlers(
  plugins: AIPlugin[] | undefined,
  input: string,
  conversationMessages: import("../types").AIMessage[],
): Promise<void> {
  if (!plugins?.length) {
    return;
  }

  await Promise.all(
    plugins.map(async (plugin) => {
      if (!plugin.handler) {
        return;
      }

      await plugin.handler(input, conversationMessages);
    }),
  );
}
