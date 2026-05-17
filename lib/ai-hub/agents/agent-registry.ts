import { listAgents as listAgentRows, getAgent as getAgentRow } from "../registry/agents";
import { adaptAgent, type AgentAdapter } from "./agent.interface";
import type { AgentKey } from "../types";

export async function listAgentAdapters(): Promise<AgentAdapter[]> {
  const rows = await listAgentRows();
  return rows.map(adaptAgent);
}

export async function getAgentAdapter(key: AgentKey): Promise<AgentAdapter | null> {
  const row = await getAgentRow(key);
  return row ? adaptAgent(row) : null;
}
