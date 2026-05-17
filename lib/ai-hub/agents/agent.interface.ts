import type { AgentRow, ToolKey, ProviderKey, RiskLevel } from "../types";

export interface AgentAdapter {
  row: AgentRow;
  key: string;
  name: string;
  preferredProvider?: ProviderKey;
  preferredModel?: string;
  allowedTools: ToolKey[];
  defaultRisk: RiskLevel;
  requiresApproval: boolean;
}

export function adaptAgent(row: AgentRow): AgentAdapter {
  const rules = (row.approval_rules ?? {}) as Record<string, unknown>;
  return {
    row,
    key: row.key,
    name: row.name,
    preferredProvider: row.provider,
    preferredModel: row.model,
    allowedTools: row.allowed_tools ?? [],
    defaultRisk: ((rules.default_risk as RiskLevel) ?? "low"),
    requiresApproval: Boolean(rules.requires_approval ?? false),
  };
}
