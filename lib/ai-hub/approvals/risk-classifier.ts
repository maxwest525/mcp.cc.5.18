import type { RiskLevel } from "../types";

const DESTRUCTIVE = /\b(delete|drop|wipe|truncate|cancel\s+all|refund\s+all)\b/i;
const HIGH = /\b(send|publish|charge|invoice|book|dispatch|deploy|push)\b/i;
const MEDIUM = /\b(update|edit|change|modify|reschedule)\b/i;

/**
 * Heuristic risk classifier. Pure, deterministic, no I/O.
 * Falls back to the agent's declared default if nothing matches.
 */
export function classifyExecutionRisk(message: string, fallback: RiskLevel = "low"): RiskLevel {
  if (DESTRUCTIVE.test(message)) return "destructive";
  if (HIGH.test(message)) return "high";
  if (MEDIUM.test(message)) return "medium";
  return fallback;
}
