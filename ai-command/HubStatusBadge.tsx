import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type HubStatus =
  | "verified"
  | "configured"
  | "active"
  | "not_configured"
  | "failed"
  | "disabled"
  | "pending";

const LABELS: Record<HubStatus, string> = {
  verified: "Verified",
  configured: "Configured",
  active: "Active",
  not_configured: "Not Connected",
  failed: "Failed",
  disabled: "Disabled",
  pending: "Setup Required",
};

const STYLES: Record<HubStatus, string> = {
  verified: "border-emerald-500/40 text-emerald-500",
  active: "border-emerald-500/40 text-emerald-500",
  configured: "border-sky-500/40 text-sky-500",
  not_configured: "border-border text-muted-foreground",
  failed: "border-red-500/40 text-red-500",
  disabled: "border-border text-muted-foreground opacity-60",
  pending: "border-amber-500/40 text-amber-500",
};

export function HubStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = (LABELS[status as HubStatus] ? (status as HubStatus) : "not_configured") as HubStatus;
  return (
    <Badge variant="outline" className={cn("text-[9px] font-mono", STYLES[s], className)}>
      {LABELS[s]}
    </Badge>
  );
}
