export interface KnowledgeChunk {
  id?: string;
  content: string;
  similarity?: number;
  source?: string;
}

export interface KnowledgeContext {
  scope: string;
  query: string;
  chunks: KnowledgeChunk[];
}

export function formatKnowledgeForPrompt(ctx: KnowledgeContext): string {
  if (!ctx.chunks.length) return "";
  return ctx.chunks
    .map((c, i) => `[KB ${i + 1}]\n${c.content}`)
    .join("\n\n");
}
