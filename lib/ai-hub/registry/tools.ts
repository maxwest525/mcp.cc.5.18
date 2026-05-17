import { supabase } from "@/integrations/supabase/client";
import type { ConnectionKey, ToolRow } from "../types";
import { BUILT_IN_INSPECTION_TOOLS } from "../tools/built-in-inspection-tools";

const FN = "ai-hub-registry";

let cache: { ts: number; rows: ToolRow[] } | null = null;
const TTL_MS = 30_000;

async function fetchRemote(): Promise<ToolRow[]> {
  const { data, error } = await supabase.functions.invoke(FN, { body: {}, method: "GET" as any });
  if (error) throw error;
  return (data?.tools ?? []) as ToolRow[];
}

/**
 * Returns the unified tool registry: built-in inspection tools merged with
 * any DB-registered tools from ai_hub_tools.
 */
export async function listTools(force = false): Promise<ToolRow[]> {
  if (!force && cache && Date.now() - cache.ts < TTL_MS) return cache.rows;
  const remote = await fetchRemote().catch(() => [] as ToolRow[]);
  const builtIn: ToolRow[] = BUILT_IN_INSPECTION_TOOLS.map((t) => ({
    key: t.name,
    name: t.name,
    description: t.description,
    enabled: true,
    parameters_schema: t.parameters,
    read_only: true,
    connection_key: null,
  }));
  // Built-ins take precedence for matching keys
  const byKey = new Map<string, ToolRow>();
  for (const r of remote) byKey.set(r.key, r);
  for (const b of builtIn) byKey.set(b.key, b);
  const rows = [...byKey.values()];
  cache = { ts: Date.now(), rows };
  return rows;
}

export async function getToolsForConnection(connectionKey: ConnectionKey): Promise<ToolRow[]> {
  const all = await listTools();
  return all.filter((t) => t.connection_key === connectionKey);
}

export function invalidateToolsCache() {
  cache = null;
}
