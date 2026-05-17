import type { ProviderAdapter } from "./provider.interface";
import { getProvider, verifyProvider } from "../registry/providers";

export const openaiProvider: ProviderAdapter = {
  key: "openai",
  name: "OpenAI",
  kind: "llm",
  capabilities: ["chat", "tools", "embeddings", "vision", "function_calling"],
  supportsTools: true,
  supportsStreaming: true,
  supportsMcp: false,
  models: ["gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-5.2", "gpt-4o", "gpt-4o-mini"],
  async getStatus() {
    const p = await getProvider("openai");
    return p?.status ?? "not_configured";
  },
  async verify() {
    return verifyProvider("openai");
  },
};
