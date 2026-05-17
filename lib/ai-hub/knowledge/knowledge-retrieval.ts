import { supabase } from "@/integrations/supabase/client";
import type { KnowledgeChunk, KnowledgeContext } from "./knowledge-context";

/**
 * Client-side wrapper around match_ai_command_knowledge RPC. The actual
 * embedding step happens server-side inside the executor for security; this
 * helper is for UI surfaces that want to preview retrieved KB chunks.
 */
export async function retrieveKnowledgeForScope(args: {
  query: string;
  scope: string;
  matchCount?: number;
  minSimilarity?: number;
  embedding?: number[];
}): Promise<KnowledgeContext> {
  if (!args.embedding) {
    return { scope: args.scope, query: args.query, chunks: [] };
  }
  const { data, error } = await supabase.rpc("match_ai_command_knowledge", {
    query_embedding: args.embedding as unknown as string,
    target_module_key: args.scope,
    match_count: args.matchCount ?? 6,
    min_similarity: args.minSimilarity ?? 0.55,
  });
  if (error) return { scope: args.scope, query: args.query, chunks: [] };
  const chunks = ((data ?? []) as Array<{ id?: string; content: string; similarity?: number }>).map<KnowledgeChunk>((r) => ({
    id: r.id,
    content: r.content,
    similarity: r.similarity,
  }));
  return { scope: args.scope, query: args.query, chunks };
}
