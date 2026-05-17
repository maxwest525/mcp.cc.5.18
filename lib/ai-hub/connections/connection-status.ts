import type { ConnectionStatus } from "../types";

export const STATUS_LABEL: Record<ConnectionStatus, string> = {
  not_configured: "Not Connected",
  configured: "Configured",
  verified: "Verified",
  active: "Active",
  failed: "Failed",
  disabled: "Disabled",
};

export const STATUS_TONE: Record<ConnectionStatus, "neutral" | "warn" | "ok" | "error"> = {
  not_configured: "neutral",
  configured: "warn",
  verified: "ok",
  active: "ok",
  failed: "error",
  disabled: "neutral",
};

export function isReady(status: ConnectionStatus): boolean {
  return status === "verified" || status === "active";
}
