import type { AgentAdapter } from "./agent.interface";
import type { ExecutionRoute, RiskLevel } from "../types";
import { classifyExecutionRisk } from "../approvals/risk-classifier";
import { requiresApproval as policyRequiresApproval } from "../approvals/approval-policy";

/**
 * Build a default ExecutionRoute for the given agent + user message.
 * Pure function — no I/O. The actual call still goes through the
 * `ai-command-execute` edge function.
 */
export function buildRouteForAgent(
  agent: AgentAdapter,
  message: string,
  opts: { estimatedCostCents?: number; reasoning?: string } = {},
): ExecutionRoute {
  const risk: RiskLevel = classifyExecutionRisk(message, agent.defaultRisk);
  const provider = (agent.preferredProvider ?? "openai") as ExecutionRoute["provider"];
  const model = agent.preferredModel ?? (provider === "openai" ? "gpt-5-mini" : "google/gemini-2.5-flash");
  return {
    provider,
    model,
    agent: agent.name,
    agent_key: agent.key,
    execution_type: agent.row.execution_type ?? "chat",
    tools: agent.allowedTools,
    estimated_cost_cents: opts.estimatedCostCents ?? 1,
    requires_approval: policyRequiresApproval(risk, agent.requiresApproval),
    risk_level: risk,
    reasoning: opts.reasoning ?? `Routed to ${agent.name} (${provider}/${model}) at risk=${risk}`,
  };
}
