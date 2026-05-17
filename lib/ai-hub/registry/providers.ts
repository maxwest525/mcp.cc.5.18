import { supabase } from "@/integrations/supabase/client";
import type { ProviderKey, ProviderRow, VerifyResult } from "../types";

const FN = "ai-hub-registry";

let cache: { ts: number; providers: ProviderRow[] } | null = null;
const TTL_MS = 15_000;

async function fetchAll(): Promise<{ providers: ProviderRow[]; raw: any }> {
  const { data, error } = await supabase.functions.invoke(FN, { body: {}, method: "GET" as any });
  if (error) throw error;
  return { providers: (data?.providers ?? []) as ProviderRow[], raw: data };
}

export async function listProviders(force = false): Promise<ProviderRow[]> {
  if (!force && cache && Date.now() - cache.ts < TTL_MS) return cache.providers;
  const { providers } = await fetchAll();
  cache = { ts: Date.now(), providers };
  return providers;
}

export async function getProvider(key: ProviderKey): Promise<ProviderRow | null> {
  const all = await listProviders();
  return all.find((p) => p.key === key) ?? null;
}

export async function verifyProvider(key: ProviderKey): Promise<VerifyResult> {
  const { data, error } = await supabase.functions.invoke(FN, {
    body: { action: "verify", key },
  });
  if (error) return { ok: false, error: error.message };
  cache = null;
  return {
    ok: !!data?.ok,
    error: data?.error ?? undefined,
    provider: data?.provider ?? undefined,
  };
}

export function invalidateProvidersCache() {
  cache = null;
}
