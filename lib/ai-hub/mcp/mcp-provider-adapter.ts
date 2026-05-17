import type { McpProviderAdapter, McpServerDescriptor } from "./mcp.interface";
import type { ConnectionStatus } from "../types";

/**
 * Reference adapter for any HTTP-transport MCP server. Implementations should
 * extend this with real handshake + tool listing once we wire AI SDK MCP
 * support into an edge function. For now this returns metadata only so the
 * registry surfaces don't crash.
 */
export function createHttpMcpAdapter(args: {
  key: string;
  name: string;
  url: string;
  status: ConnectionStatus;
  capabilities?: string[];
}): McpProviderAdapter {
  const desc: McpServerDescriptor = {
    key: args.key,
    name: args.name,
    url: args.url,
    transport: "http",
    status: args.status,
    tools: [],
    capabilities: args.capabilities ?? [],
  };
  return {
    async describe() { return desc; },
    async listTools() { return desc.tools; },
  };
}
