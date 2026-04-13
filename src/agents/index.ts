import type {
  AIAgentConfig,
  AIAgentResult,
  AIAgentStepResult,
  AIConversationMessage,
  AIToolCall,
  AIToolsMap,
} from "../types";
import { executeToolCall, parseToolCall } from "../tools";

export function createAgent(config: AIAgentConfig) {
  return {
    run: async (): Promise<AIAgentResult> => runAgent(config),
  };
}

export async function runAgent(config: AIAgentConfig): Promise<AIAgentResult> {
  const steps: AIAgentStepResult[] = [];
  const tools: AIToolsMap = config.tools ?? {};

  for (const step of config.steps) {
    const messages: AIConversationMessage[] = [
      {
        role: "system",
        content: `You are an execution agent. Goal: ${config.goal}`,
      },
      {
        role: "user",
        content: step.instruction,
      },
    ];

    const result = await config.provider.sendMessage({ messages });
    const toolCall = parseToolCall(result.content) as AIToolCall | null;

    if (toolCall && tools[toolCall.name]) {
      const toolResult = await executeToolCall(toolCall, tools, {
        conversationId: "agent",
        messages: [],
        args: toolCall.args,
      });

      steps.push({
        step,
        response: result.content,
        toolResult,
      });
      continue;
    }

    steps.push({
      step,
      response: result.content,
    });
  }

  return {
    goal: config.goal,
    completed: true,
    steps,
  };
}
