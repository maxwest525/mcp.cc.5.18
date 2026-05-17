/**
 * AI Hub SDK — public surface.
 *
 * This module is the canonical domain layer for everything in the AI
 * Operations Hub: providers, connections, tools, agents, execution routing,
 * verification, approvals, MCP, OAuth, and knowledge context.
 *
 * UI components and edge-function callers should depend on this module
 * rather than reaching into supabase tables or invoking edge functions
 * directly. The Deno edge functions still hold the privileged execution
 * (LLM keys, mutations); this SDK is the trusted client wrapper.
 */

// Types
export * from "./types";

// Registry (data access)
export {
  listProviders,
  getProvider,
  verifyProvider,
  invalidateProvidersCache,
} from "./registry/providers";
export {
  listConnections,
  getConnection,
  listMissingSetup,
  verifyConnection,
  invalidateConnectionsCache,
} from "./registry/connections";
export { listTools, getToolsForConnection, invalidateToolsCache } from "./registry/tools";
export { listAgents, getAgent, invalidateAgentsCache } from "./registry/agents";

// Provider adapters
export type { ProviderAdapter, ChatMessage, ChatOptions, ChatResult } from "./providers/provider.interface";
export { openaiProvider } from "./providers/openai.provider";
export { lovableProvider } from "./providers/lovable.provider";
export { hyperProvider } from "./providers/hyper.provider";
export { anthropicProvider, xaiProvider } from "./providers/future-provider.stub";

// Connections
export type { ConnectionAdapter } from "./connections/connection.interface";
export { adaptConnection } from "./connections/connection.interface";
export { STATUS_LABEL, STATUS_TONE, isReady } from "./connections/connection-status";
export { runConnectionVerification } from "./connections/connection-verification";

// Tools
export type { ToolDefinition, OpenAIToolSchema } from "./tools/tool.interface";
export { toOpenAITool } from "./tools/tool.interface";
export { BUILT_IN_INSPECTION_TOOLS } from "./tools/built-in-inspection-tools";
export { toolRegistry } from "./tools/tool-registry";

// Agents
export type { AgentAdapter } from "./agents/agent.interface";
export { adaptAgent } from "./agents/agent.interface";
export { listAgentAdapters, getAgentAdapter } from "./agents/agent-registry";
export { buildRouteForAgent } from "./agents/agent-routing";

// Approvals
export { classifyExecutionRisk } from "./approvals/risk-classifier";
export { requiresApproval } from "./approvals/approval-policy";

// Execution
export { buildExecutionContext } from "./execution/execution-context";
export { routeAIRequest, executeToolCall } from "./execution/execution-engine";
export { hubEvents } from "./execution/execution-events";
export type { HubEventMap } from "./execution/execution-events";

// MCP
export type { McpServerDescriptor, McpProviderAdapter } from "./mcp/mcp.interface";
export { createHttpMcpAdapter } from "./mcp/mcp-provider-adapter";
export { hyperMcpAdapter } from "./mcp/hyper-mcp-adapter";

// OAuth
export type { OAuthAdapter, OAuthConnectionStatus } from "./oauth/oauth.interface";
export { deriveOAuthStatus } from "./oauth/oauth-status";

// Knowledge
export type { KnowledgeChunk, KnowledgeContext } from "./knowledge/knowledge-context";
export { formatKnowledgeForPrompt } from "./knowledge/knowledge-context";
export { retrieveKnowledgeForScope } from "./knowledge/knowledge-retrieval";

// Convenience aggregator
import { listProviders } from "./registry/providers";
import { listConnections } from "./registry/connections";
import { listAgents } from "./registry/agents";
import type { SystemSummary } from "./types";

export async function summarizeSystemState(): Promise<SystemSummary> {
  const [providers, connections, agents] = await Promise.all([
    listProviders(),
    listConnections(),
    listAgents(),
  ]);
  const byKind: Record<string, number> = {};
  for (const c of connections) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;
  return {
    providers: {
      total: providers.length,
      verified: providers.filter((p) => p.status === "verified").length,
      configured: providers.filter((p) => p.status === "configured").length,
      not_configured: providers.filter((p) => p.status === "not_configured").length,
    },
    connections: {
      total: connections.length,
      configured: connections.filter((c) => ["configured", "active", "verified"].includes(c.status)).length,
      not_configured: connections.filter((c) => c.status === "not_configured").length,
      by_kind: byKind,
    },
    agents: {
      total: agents.length,
      categories: [...new Set(agents.map((a) => a.category).filter(Boolean) as string[])],
    },
    executions_total: 0,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Goal-based connector recommendations. Pure client-side using the registry.
 */
export async function recommendNextConnectors(goal: string): Promise<Array<{
  key: string; name: string; why?: string[] | null; missing?: string[] | null; setup_help?: string | null;
}>> {
  const goalLc = goal.toLowerCase();
  const tagMap: Record<string, string[]> = {
    marketing: ["marketing_brain", "research_data"],
    research: ["research_data"],
    execution: ["execution_layer", "publishing_deployment"],
    crm: ["crm_operations"],
    communications: ["communications"],
    voice: ["communications"],
    seo: ["marketing_brain", "research_data"],
    ads: ["marketing_brain"],
    autonomous: ["core_ai_runtime", "marketing_brain", "execution_layer", "research_data"],
  };
  const tags = Object.entries(tagMap).find(([g]) => goalLc.includes(g))?.[1] ?? ["marketing_brain", "execution_layer"];
  const connections = await listConnections();
  return connections
    .filter((c) => c.status === "not_configured" && (c.tags ?? []).some((t) => tags.includes(t)))
    .slice(0, 8)
    .map((c) => ({
      key: c.key,
      name: c.name,
      why: c.enables ?? null,
      missing: c.required_secrets ?? null,
      setup_help: c.setup_help ?? null,
    }));
}
