// AI Hub SDK — canonical types
// Single source of truth shared by Hub UI, registry calls, and execution wiring.

export type ProviderKey = string; // e.g. "openai" | "lovable" | "hyper" | "anthropic" | "xai"
export type ConnectionKey = string;
export type ToolKey = string;
export type AgentKey = string;

export type ConnectionStatus =
  | "not_configured"
  | "configured"
  | "verified"
  | "active"
  | "failed"
  | "disabled";

export type ProviderStatus = ConnectionStatus;

export type ConnectionKind =
  | "llm_provider"
  | "api_key"
  | "oauth"
  | "webhook"
  | "mcp"
  | "internal_crm";

export type AuthType = "api_key" | "oauth" | "webhook" | "internal" | "none";

export type RiskLevel = "low" | "medium" | "high" | "destructive";

export type ExecutionType =
  | "chat"
  | "tool_call"
  | "agent_route"
  | "mcp_call"
  | "background_job";

export interface ProviderRow {
  key: ProviderKey;
  name: string;
  kind: string;
  status: ProviderStatus;
  default_model?: string | null;
  last_verified_at?: string | null;
  last_error?: string | null;
  description?: string | null;
  enables?: string[] | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
}

export interface ConnectionRow {
  key: ConnectionKey;
  name: string;
  kind: ConnectionKind;
  category?: string | null;
  auth_type: AuthType;
  status: ConnectionStatus;
  required_secrets?: string[] | null;
  description?: string | null;
  enables?: string[] | null;
  setup_help?: string | null;
  tags?: string[] | null;
  priority?: number | null;
  capabilities?: string[] | null;
  last_verified_at?: string | null;
  provider_url?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ToolRow {
  key: ToolKey;
  name: string;
  description?: string | null;
  enabled: boolean;
  parameters_schema?: Record<string, unknown> | null;
  connection_key?: ConnectionKey | null;
  read_only?: boolean | null;
}

export interface AgentRow {
  key: AgentKey;
  name: string;
  category?: string;
  provider?: ProviderKey;
  model?: string;
  execution_type?: ExecutionType;
  enabled?: boolean;
  status?: string;
  approval_rules?: Record<string, unknown> | null;
  allowed_tools?: ToolKey[] | null;
  integration_requirements?: string[] | null;
}

export interface VerifyResult {
  ok: boolean;
  error?: string;
  capabilities?: string[];
  provider?: ProviderRow;
}

export interface SystemSummary {
  providers: { total: number; verified: number; configured: number; not_configured: number };
  connections: { total: number; configured: number; not_configured: number; by_kind?: Record<string, number> };
  agents: { total: number; categories: string[] };
  executions_total: number;
  generated_at?: string;
}

export interface ExecutionRoute {
  provider: "openai" | "lovable" | "hyper";
  model: string;
  agent: string;
  agent_key?: string;
  execution_type: string;
  tools: ToolKey[];
  estimated_cost_cents: number;
  requires_approval: boolean;
  risk_level: RiskLevel | string;
  reasoning: string;
}

export interface ExecutionContext {
  threadId: string | null;
  userId: string;
  message: string;
  route: ExecutionRoute;
  knowledgeScope?: string;
}

export interface ExecutionResult {
  ok: boolean;
  thread_id: string | null;
  reply: string;
  elapsed_ms: number;
  provider: string;
  model: string;
  agent: string;
  execution_id: string | null;
  status: "complete" | "failed";
  error?: string;
}
