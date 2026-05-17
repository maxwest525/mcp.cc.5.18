import type { RiskLevel } from "../types";

/**
 * Policy: when does a route require human approval?
 * - destructive: always
 * - high: always
 * - medium: only if the agent itself flags it
 * - low: never (unless agent flag)
 */
export function requiresApproval(risk: RiskLevel, agentFlag = false): boolean {
  if (risk === "destructive" || risk === "high") return true;
  if (risk === "medium" && agentFlag) return true;
  return agentFlag;
}
