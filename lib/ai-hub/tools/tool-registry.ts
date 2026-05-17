import type { ToolDefinition, OpenAIToolSchema } from "./tool.interface";
import { toOpenAITool } from "./tool.interface";
import { BUILT_IN_INSPECTION_TOOLS } from "./built-in-inspection-tools";
import type { ToolKey } from "../types";

class ToolRegistry {
  private tools = new Map<ToolKey, ToolDefinition>();

  constructor(initial: ToolDefinition[] = []) {
    for (const t of initial) this.register(t);
  }

  register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  unregister(key: ToolKey) {
    this.tools.delete(key);
  }

  get(key: ToolKey): ToolDefinition | undefined {
    return this.tools.get(key);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  /** Produce OpenAI-shaped tools array for a chat completion call. */
  toOpenAITools(filter?: (t: ToolDefinition) => boolean): OpenAIToolSchema[] {
    return this.list().filter(filter ?? (() => true)).map(toOpenAITool);
  }
}

export const toolRegistry = new ToolRegistry(BUILT_IN_INSPECTION_TOOLS);
export type { ToolRegistry };
