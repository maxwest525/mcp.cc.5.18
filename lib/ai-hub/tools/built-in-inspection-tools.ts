import type { ToolDefinition } from "./tool.interface";

/**
 * Canonical list of read-only inspection tools the AI Operations Hub exposes.
 * Mirrors the implementations inside `ai-command-execute` / `ai-hub-tools`
 * edge functions. Treat this file as the single source of truth — the edge
 * function should be regenerated from this list during the Phase-3 port.
 */
export const BUILT_IN_INSPECTION_TOOLS: ToolDefinition[] = [
  {
    name: "list_providers",
    description:
      "List all configured AI/LLM providers in the AI Operations Hub registry with their honest status (verified, configured, not_configured, failed, disabled).",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    readOnly: true,
  },
  {
    name: "list_connections",
    description:
      "List all integrations (APIs, OAuth apps, MCP servers, webhooks, internal tools) in the registry with their honest status.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    readOnly: true,
  },
  {
    name: "list_agents",
    description:
      "List configured AI Operations Hub agents (their category, provider, model, allowed tools, approval rules).",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    readOnly: true,
  },
  {
    name: "system_summary",
    description:
      "High-level numeric summary of providers, integrations, agents, and execution counts.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    readOnly: true,
  },
  {
    name: "get_connection_detail",
    description: "Full registry detail for one connection by key.",
    parameters: {
      type: "object",
      properties: { connection_key: { type: "string", description: "Connection key, e.g. 'searchatlas'" } },
      required: ["connection_key"],
      additionalProperties: false,
    },
    readOnly: true,
  },
  {
    name: "get_provider_detail",
    description: "Full registry detail for one LLM provider by key.",
    parameters: {
      type: "object",
      properties: { provider_key: { type: "string", description: "Provider key, e.g. 'openai'" } },
      required: ["provider_key"],
      additionalProperties: false,
    },
    readOnly: true,
  },
  {
    name: "list_missing_setup_requirements",
    description: "List every connector that is not yet configured, with what it unlocks and how to set it up.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    readOnly: true,
  },
  {
    name: "recommend_next_connectors",
    description:
      "Recommend which connectors to wire next given a goal (e.g. 'marketing', 'autonomous loop', 'crm', 'execution', 'communications', 'ads', 'seo').",
    parameters: {
      type: "object",
      properties: { goal: { type: "string", description: "Plain-English goal." } },
      required: ["goal"],
      additionalProperties: false,
    },
    readOnly: true,
  },
];
