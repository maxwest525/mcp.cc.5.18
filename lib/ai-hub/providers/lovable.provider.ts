import type { ProviderAdapter } from "./provider.interface";
import { getProvider, verifyProvider } from "../registry/providers";

export const lovableProvider: ProviderAdapter = {
  key: "lovable",
  name: "Lovable AI Gateway",
  kind: "llm",
  capabilities: ["chat", "multi_provider_routing", "google_models", "openai_models"],
  supportsTools: true,
  supportsStreaming: true,
  supportsMcp: false,
  models: [
    "google/gemini-2.5-pro",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "google/gemini-3-flash-preview",
    "google/gemini-3.1-pro-preview",
    "openai/gpt-5",
    "openai/gpt-5-mini",
    "openai/gpt-5-nano",
  ],
  async getStatus() {
    const p = await getProvider("lovable");
    return p?.status ?? "not_configured";
  },
  async verify() {
    return verifyProvider("lovable");
  },
};
