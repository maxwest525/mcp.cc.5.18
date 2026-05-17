import { supabase } from "@/integrations/supabase/client";
import type { ConnectionKey, ConnectionRow } from "../types";

const FN = "ai-hub-registry";

let cache: { ts: number; rows: ConnectionRow[] } | null = null;
const TTL_MS = 15_000;

async function fetchAll(): Promise<ConnectionRow[]> {
  const { data, error } = await supabase.functions.invoke(FN, { body: {}, method: "GET" as any });
  if (error) throw error;
  return (data?.connections ?? []) as ConnectionRow[];
}

export async function listConnections(force = false): Promise<ConnectionRow[]> {
  if (!force && cache && Date.now() - cache.ts < TTL_MS) return cache.rows;
  const rows = await fetchAll();
  cache = { ts: Date.now(), rows };
  return rows;
}

export async function getConnection(key: ConnectionKey): Promise<ConnectionRow | null> {
  const all = await listConnections();
  return all.find((c) => c.key === key) ?? null;
}

export async function listMissingSetup(): Promise<ConnectionRow[]> {
  const all = await listConnections();
  return all.filter((c) => c.status === "not_configured");
}

export function invalidateConnectionsCache() {
  cache = null;
}

/**
 * Connection-level verification.
 * Today only LLM-provider-style connections are verifiable end-to-end via the
 * registry edge function. For other kinds we return a static "not_supported"
 * marker so callers can degrade gracefully.
 */
export async function verifyConnection(key: ConnectionKey): Promise<{ ok: boolean; error?: string }> {
  const conn = await getConnection(key);
  if (!conn) return { ok: false, error: `connection '${key}' not found` };
  if (conn.kind === "llm_provider") {
    const { data, error } = await supabase.functions.invoke("ai-hub-registry", {
      body: { action: "verify", key },
    });
    if (error) return { ok: false, error: error.message };
    invalidateConnectionsCache();
    return { ok: !!data?.ok, error: data?.error ?? undefined };
  }
  return { ok: false, error: "verifier_not_implemented_for_kind" };
}
