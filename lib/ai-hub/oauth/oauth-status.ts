import type { ConnectionRow } from "../types";
import type { OAuthConnectionStatus } from "./oauth.interface";

/**
 * Derive an OAuth status snapshot from a registry connection row. Pure.
 * Real OAuth adapters will override this with provider-specific checks.
 */
export function deriveOAuthStatus(row: ConnectionRow): OAuthConnectionStatus {
  return {
    connectionKey: row.key,
    status: row.status,
    authorized: row.status === "verified" || row.status === "active",
  };
}
