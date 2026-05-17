import { supabase } from "@/integrations/supabase/client";
import type { AgentKey, AgentRow } from "../types";

let cache: { ts: number; rows: AgentRow[] } | null = null;
const TTL_MS = 30_000;

export async function listAgents(force = false): Promise<AgentRow[]> {
  if (!force && cache && Date.now() - cache.ts < TTL_MS) return cache.rows;
  const { data, error } = await supabase
    .from("ai_command_agent_modules")
    .select("key,name,category,provider,model,execution_type,enabled,status,approval_rules,allowed_tools,integration_requirements")
    .eq("enabled", true)
    .order("category");
  if (error) throw error;
  const rows = (data ?? []) as unknown as AgentRow[];
  cache = { ts: Date.now(), rows };
  return rows;
}

export async function getAgent(key: AgentKey): Promise<AgentRow | null> {
  const all = await listAgents();
  return all.find((a) => a.key === key) ?? null;
}

export function invalidateAgentsCache() {
  cache = null;
}
