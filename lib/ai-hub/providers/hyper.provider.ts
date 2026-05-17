import type { ProviderAdapter } from "./provider.interface";
import { getProvider, verifyProvider } from "../registry/providers";

export const hyperProvider: ProviderAdapter = {
  key: "hyper",
  name: "Hyper (MCP Agent Router)",
  kind: "router",
  capabilities: ["agent_routing", "mcp", "diagnostics", "deployment", "compliance", "setup", "executive"],
  supportsTools: true,
  supportsStreaming: false,
  supportsMcp: true,
  models: ["routed/auto"],
  async getStatus() {
    const p = await getProvider("hyper");
    return p?.status ?? "not_configured";
  },
  async verify() {
    return verifyProvider("hyper");
  },
};
