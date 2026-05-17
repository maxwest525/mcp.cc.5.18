import type { ConnectionRow, ConnectionStatus, ToolKey } from "../types";

/**
 * A ConnectionAdapter is a thin behavioral wrapper around a row in
 * ai_hub_connections. Most logic stays declarative (the row), but adapters
 * give us a single place to add per-kind verification, capability detection,
 * and tool exposure.
 */
export interface ConnectionAdapter {
  row: ConnectionRow;
  /** Stable key, mirrors row.key. */
  key: string;
  /** Required env secrets to be configured. */
  requiredSecrets: string[];
  /** Tool keys this connection enables when active. */
  enabledTools: ToolKey[];
  /** Honest status accessor (delegates to row + any runtime knowledge). */
  getStatus(): ConnectionStatus;
  /** Optional per-connection verify; defaults to "not implemented" upstream. */
  verify?(): Promise<{ ok: boolean; error?: string }>;
}

export function adaptConnection(row: ConnectionRow): ConnectionAdapter {
  return {
    row,
    key: row.key,
    requiredSecrets: row.required_secrets ?? [],
    enabledTools: [],
    getStatus: () => row.status,
  };
}
