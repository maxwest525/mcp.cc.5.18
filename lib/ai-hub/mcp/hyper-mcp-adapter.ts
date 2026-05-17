import type { McpProviderAdapter } from "./mcp.interface";
import { hyperProvider } from "../providers/hyper.provider";

/**
 * Hyper acts as our internal MCP-style agent router. It is reachable via the
 * `hypermcp-agent-router` edge function, not over the public MCP protocol.
 * We expose it through the same interface so future tool listings can be
 * unified.
 */
export const hyperMcpAdapter: McpProviderAdapter = {
  async describe() {
    const status = await hyperProvider.getStatus();
    return {
      key: "hyper",
      name: "Hyper Agent Router",
      transport: "internal",
      status,
      tools: [],
      capabilities: hyperProvider.capabilities,
    };
  },
  async listTools() {
    // Hyper currently exposes routed agents rather than discrete MCP tools.
    return [];
  },
};
