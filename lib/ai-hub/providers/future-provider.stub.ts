import type { ProviderAdapter } from "./provider.interface";

/**
 * Stub adapters for providers we plan to support but have not wired yet.
 * They report `not_configured` and a no-op verify so the rest of the SDK can
 * already reference them without runtime errors.
 */
function stub(key: string, name: string, models: string[] = []): ProviderAdapter {
  return {
    key,
    name,
    kind: "llm",
    capabilities: ["chat"],
    supportsTools: true,
    supportsStreaming: true,
    supportsMcp: false,
    models,
    async getStatus() { return "not_configured"; },
    async verify() { return { ok: false, error: `${name} adapter not implemented yet` }; },
  };
}

export const anthropicProvider = stub("anthropic", "Anthropic", [
  "claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4-5",
]);

export const xaiProvider = stub("xai", "xAI", ["grok-4", "grok-4-fast"]);
