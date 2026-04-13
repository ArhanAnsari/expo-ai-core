import type {
  AIMessage,
  AIToolCall,
  AIToolContext,
  AIToolsMap,
} from "../types";

const TOOL_JSON_BLOCK_REGEX = /```tool\s*([\s\S]*?)```/i;
const TOOL_XML_REGEX =
  /<tool_call\s+name=['\"]([^'\"]+)['\"]\s*>([\s\S]*?)<\/tool_call>/i;
const TOOL_FN_REGEX =
  /\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*\})\s*\}/i;

export function parseToolCall(content: string): AIToolCall | null {
  if (!content) {
    return null;
  }

  const xmlMatch = content.match(TOOL_XML_REGEX);
  if (xmlMatch) {
    try {
      const parsedArgs = JSON.parse(xmlMatch[2] || "{}");
      return {
        name: xmlMatch[1],
        args: parsedArgs && typeof parsedArgs === "object" ? parsedArgs : {},
      };
    } catch {
      return null;
    }
  }

  const codeBlock = content.match(TOOL_JSON_BLOCK_REGEX);
  if (codeBlock?.[1]) {
    try {
      const payload = JSON.parse(codeBlock[1]);
      if (payload?.tool && typeof payload.tool === "string") {
        return {
          name: payload.tool,
          args:
            payload.arguments && typeof payload.arguments === "object"
              ? payload.arguments
              : {},
        };
      }
    } catch {
      return null;
    }
  }

  const rawJson = content.match(TOOL_FN_REGEX);
  if (rawJson) {
    try {
      const parsedArgs = JSON.parse(rawJson[2]);
      return {
        name: rawJson[1],
        args: parsedArgs && typeof parsedArgs === "object" ? parsedArgs : {},
      };
    } catch {
      return null;
    }
  }

  return null;
}

export async function executeToolCall(
  toolCall: AIToolCall,
  tools: AIToolsMap,
  context: AIToolContext,
): Promise<unknown> {
  const tool = tools[toolCall.name];
  if (!tool) {
    throw new Error(
      `Tool '${toolCall.name}' was requested by the model but is not registered.`,
    );
  }

  return tool(toolCall.args, context);
}

export function mergeTools(
  ...collections: Array<AIToolsMap | undefined>
): AIToolsMap {
  return collections.reduce<AIToolsMap>((acc, current) => {
    if (!current) {
      return acc;
    }

    for (const [name, handler] of Object.entries(current)) {
      acc[name] = handler;
    }

    return acc;
  }, {});
}

export function buildToolResultMessage(
  toolName: string,
  value: unknown,
): AIMessage {
  return {
    id: `tool_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    role: "tool",
    content: typeof value === "string" ? value : JSON.stringify(value, null, 2),
    createdAt: Date.now(),
    status: "sent",
    metadata: {
      toolName,
    },
  };
}
