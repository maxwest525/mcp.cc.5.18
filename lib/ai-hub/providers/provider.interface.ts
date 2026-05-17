import type { ProviderKey, ProviderStatus, VerifyResult } from "../types";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  tools?: Array<{ type: "function"; function: { name: string; description?: string; parameters?: any } }>;
  toolChoice?: "auto" | "none" | "required";
  stream?: boolean;
}

export interface ChatResult {
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  raw?: unknown;
}

/**
 * Common adapter interface every provider must satisfy.
 * Adapters are mostly metadata + verification on the client. Actual chat
 * execution still flows through the `ai-command-execute` edge function so
 * provider keys never reach the browser. `executeChat` here is intentionally
 * marked optional for that reason.
 */
export interface ProviderAdapter {
  key: ProviderKey;
  name: string;
  kind: "llm" | "router" | "embedding";
  /** Display capabilities. */
  capabilities: string[];
  /** Whether this provider supports OpenAI-style tool calling. */
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsMcp: boolean;
  /** Static model inventory metadata (the live default lives in the registry). */
  models: string[];

  getStatus(): Promise<ProviderStatus>;
  verify(): Promise<VerifyResult>;

  /** Optional direct execution surface — usually unused on the client. */
  executeChat?(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult>;
}
