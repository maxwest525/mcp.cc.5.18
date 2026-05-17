import type { ConnectionKey, ToolKey } from "../types";

export interface ToolDefinition {
  name: ToolKey;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
    additionalProperties?: boolean;
  };
  /** True if calling this tool cannot mutate state. */
  readOnly: boolean;
  /** Optional connection this tool belongs to. */
  connectionKey?: ConnectionKey;
}

/**
 * OpenAI tool schema produced from a ToolDefinition. This is the single
 * canonical shape passed to any chat-completion API that supports
 * function-calling.
 */
export interface OpenAIToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: ToolDefinition["parameters"];
  };
}

export function toOpenAITool(t: ToolDefinition): OpenAIToolSchema {
  return {
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  };
}
