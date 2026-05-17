import { verifyConnection as registryVerify } from "../registry/connections";
import type { ConnectionKey } from "../types";

/**
 * Public entrypoint for connection verification. Delegates to the registry
 * (which today only handles LLM-provider connections); future per-kind
 * verifiers (OAuth refresh, MCP handshake, webhook ping) plug in here.
 */
export async function runConnectionVerification(key: ConnectionKey) {
  return registryVerify(key);
}
