import type { ConnectionStatus, ToolKey } from "../types";

/**
 * Generic MCP server descriptor. The Hub treats every MCP server as a kind
 * of connection that exposes a dynamic list of tools.
 */
export interface McpServerDescriptor {
  key: string;
  name: string;
  url?: string;
  transport: "http" | "sse" | "stdio" | "internal";
  status: ConnectionStatus;
  tools: ToolKey[];
  capabilities: string[];
}

export interface McpProviderAdapter {
  describe(): Promise<McpServerDescriptor>;
  /** List the tools the MCP server currently advertises. */
  listTools(): Promise<ToolKey[]>;
  /** Optional tool invocation; not all MCP adapters support this from client. */
  callTool?(name: string, args: Record<string, unknown>): Promise<unknown>;
}
