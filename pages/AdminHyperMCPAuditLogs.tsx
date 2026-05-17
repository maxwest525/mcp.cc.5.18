import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ScrollText, Download, RefreshCw, Filter, Search,
  Info, AlertTriangle, XCircle, ShieldAlert, User, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Severity = "info" | "warning" | "error" | "critical";
type Source = "ui" | "api" | "scheduler" | "webhook" | "system";

interface AuditLog {
  id: string;
  ts: string;
  tsExact: string;
  actor: string;
  actorEmail: string;
  actionType: string;
  category: "admin" | "integration" | "security" | "system";
  integration: string | null;
  description: string;
  severity: Severity;
  source: Source;
  ipAddress: string;
  metadata: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  relatedRef?: { type: "webhook" | "sync_job"; id: string };
}

const LOGS: AuditLog[] = [
  {
    id: "AL-58410", ts: "2m ago", tsExact: "2026-05-14 13:44:12 UTC",
    actor: "Alex Cohen", actorEmail: "alex@trumoveinc.com",
    actionType: "credential.rotated", category: "security",
    integration: "Meta Ads", description: "Rotated API token for Meta Ads production environment",
    severity: "warning", source: "ui", ipAddress: "73.114.22.18",
    metadata: { credential_type: "oauth_token", env: "production", expires_at: "2026-08-12T00:00:00Z" },
    before: { masked: "fb_••••3a92", expires_at: "2026-05-30T00:00:00Z" },
    after: { masked: "fb_••••7c41", expires_at: "2026-08-12T00:00:00Z" },
  },
  {
    id: "AL-58409", ts: "5m ago", tsExact: "2026-05-14 13:41:08 UTC",
    actor: "system", actorEmail: "system@hypermcp",
    actionType: "sync.failed", category: "integration",
    integration: "Granot", description: "Carrier dispatch sync failed after 3 retries · 502 Bad Gateway",
    severity: "error", source: "scheduler", ipAddress: "10.0.4.22",
    metadata: { job_id: "SJ-10410", retries: 3, upstream_status: 502 },
    relatedRef: { type: "sync_job", id: "SJ-10410" },
  },
  {
    id: "AL-58408", ts: "11m ago", tsExact: "2026-05-14 13:35:51 UTC",
    actor: "Sarah Lin", actorEmail: "sarah@trumoveinc.com",
    actionType: "integration.connected", category: "integration",
    integration: "RingCentral", description: "Connected RingCentral via OAuth 2.0",
    severity: "info", source: "ui", ipAddress: "98.32.119.4",
    metadata: { auth_type: "oauth", scopes: ["calls.read", "sms.read", "presence.read"] },
  },
  {
    id: "AL-58407", ts: "18m ago", tsExact: "2026-05-14 13:28:07 UTC",
    actor: "system", actorEmail: "system@hypermcp",
    actionType: "webhook.received", category: "system",
    integration: "Meta Ads", description: "Inbound webhook · leadgen event processed in 412ms",
    severity: "info", source: "webhook", ipAddress: "31.13.71.5",
    metadata: { event: "leadgen", form_id: "Quote-Form-A", latency_ms: 412 },
    relatedRef: { type: "webhook", id: "WH-91244" },
  },
  {
    id: "AL-58406", ts: "24m ago", tsExact: "2026-05-14 13:22:30 UTC",
    actor: "Alex Cohen", actorEmail: "alex@trumoveinc.com",
    actionType: "user_mapping.updated", category: "admin",
    integration: "HubSpot", description: "Manually mapped CRM user to HubSpot owner ID",
    severity: "info", source: "ui", ipAddress: "73.114.22.18",
    metadata: { mapping_id: "UM-2284", confidence: 1.0 },
    before: { external_user_id: null, mapping_status: "unmapped" },
    after: { external_user_id: "hs_55821", mapping_status: "mapped" },
  },
  {
    id: "AL-58405", ts: "37m ago", tsExact: "2026-05-14 13:09:14 UTC",
    actor: "system", actorEmail: "system@hypermcp",
    actionType: "auth.failed", category: "security",
    integration: "HubSpot", description: "OAuth token validation failed · invalid scope contacts.write",
    severity: "critical", source: "api", ipAddress: "10.0.4.22",
    metadata: { error: "invalid_scope", required: "contacts.write", granted: ["contacts.read"] },
  },
  {
    id: "AL-58404", ts: "1h ago", tsExact: "2026-05-14 12:44:02 UTC",
    actor: "Alex Cohen", actorEmail: "alex@trumoveinc.com",
    actionType: "flow.paused", category: "admin",
    integration: "Twilio", description: "Paused automation flow: SMS Outbound · Welcome",
    severity: "warning", source: "ui", ipAddress: "73.114.22.18",
    metadata: { flow_id: "f5", reason: "rate limit investigation" },
    before: { status: "active" }, after: { status: "paused" },
  },
  {
    id: "AL-58403", ts: "1h ago", tsExact: "2026-05-14 12:31:18 UTC",
    actor: "system", actorEmail: "system@hypermcp",
    actionType: "rate_limit.exceeded", category: "integration",
    integration: "Twilio", description: "Twilio API rate limit hit · backing off exponentially",
    severity: "warning", source: "api", ipAddress: "10.0.4.22",
    metadata: { status: 429, retry_after_s: 60 },
  },
  {
    id: "AL-58402", ts: "2h ago", tsExact: "2026-05-14 11:58:44 UTC",
    actor: "Marco Diaz", actorEmail: "marco@trumoveinc.com",
    actionType: "integration.disabled", category: "admin",
    integration: "SlickText", description: "Disabled SlickText integration for maintenance",
    severity: "warning", source: "ui", ipAddress: "104.28.31.91",
    metadata: { reason: "vendor maintenance window" },
    before: { is_active: true }, after: { is_active: false },
  },
  {
    id: "AL-58401", ts: "3h ago", tsExact: "2026-05-14 10:42:09 UTC",
    actor: "system", actorEmail: "system@hypermcp",
    actionType: "sync.completed", category: "system",
    integration: "Google Search Console", description: "Hourly metrics pull completed · 9842 rows persisted",
    severity: "info", source: "scheduler", ipAddress: "10.0.4.22",
    metadata: { records: 9842, duration_ms: 61204 },
    relatedRef: { type: "sync_job", id: "SJ-10406" },
  },
  {
    id: "AL-58400", ts: "5h ago", tsExact: "2026-05-14 08:18:55 UTC",
    actor: "Alex Cohen", actorEmail: "alex@trumoveinc.com",
    actionType: "credential.added", category: "security",
    integration: "Stripe", description: "Added new restricted API key for Stripe production",
    severity: "info", source: "ui", ipAddress: "73.114.22.18",
    metadata: { key_type: "restricted", scopes: ["charges.read", "refunds.write"] },
  },
  {
    id: "AL-58399", ts: "8h ago", tsExact: "2026-05-14 05:31:00 UTC",
    actor: "system", actorEmail: "system@hypermcp",
    actionType: "permission.denied", category: "security",
    integration: null, description: "Unauthorized access attempt to /hypermcp/credentials from non-admin role",
    severity: "critical", source: "api", ipAddress: "45.91.22.118",
    metadata: { user_role: "agent", path: "/hypermcp/credentials", method: "GET" },
  },
];

function severityBadge(s: Severity) {
  const map: Record<Severity, { label: string; cls: string; Icon: typeof Info }> = {
    info:     { label: "Info",     cls: "text-[#0B1624] bg-[#0B1624]/5 border-[#0B1624]/15", Icon: Info },
    warning:  { label: "Warning",  cls: "text-[#D97706] bg-[#F59E0B]/10 border-[#F59E0B]/40", Icon: AlertTriangle },
    error:    { label: "Error",    cls: "text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/40", Icon: XCircle },
    critical: { label: "Critical", cls: "text-white bg-[#7F1D1D] border-[#7F1D1D]", Icon: ShieldAlert },
  };
  const m = map[s];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap", m.cls)}>
      <m.Icon className="w-3 h-3" /> {m.label}
    </span>
  );
}

function sourceBadge(s: Source) {
  return (
    <span className="inline-flex items-center text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border border-[rgba(15,23,42,0.10)] bg-[#F1F5F9] text-[rgba(11,22,36,0.70)] whitespace-nowrap">
      {s}
    </span>
  );
}

export default function AdminHyperMCPAuditLogs() {
  const [logs] = useState<AuditLog[]>(LOGS);
  const [search, setSearch] = useState("");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [integrationFilter, setIntegrationFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("24h");
  const [openId, setOpenId] = useState<string | null>(null);

  const actors = useMemo(() => Array.from(new Set(logs.map((l) => l.actor))).sort(), [logs]);
  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.actionType))).sort(), [logs]);
  const integrations = useMemo(
    () => Array.from(new Set(logs.map((l) => l.integration).filter(Boolean) as string[])).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (actorFilter !== "all" && l.actor !== actorFilter) return false;
      if (actionFilter !== "all" && l.actionType !== actionFilter) return false;
      if (integrationFilter !== "all" && l.integration !== integrationFilter) return false;
      if (severityFilter !== "all" && l.severity !== severityFilter) return false;
      if (!q) return true;
      return (
        l.description.toLowerCase().includes(q) ||
        l.actor.toLowerCase().includes(q) ||
        l.actionType.toLowerCase().includes(q) ||
        (l.integration ?? "").toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
      );
    });
  }, [logs, search, actorFilter, actionFilter, integrationFilter, severityFilter]);

  const stats = useMemo(() => {
    const total = logs.length;
    const adminActions = logs.filter((l) => l.category === "admin").length;
    const integrationChanges = logs.filter((l) => l.category === "integration").length;
    const failed = logs.filter((l) => l.severity === "error" || l.severity === "critical").length;
    const security = logs.filter((l) => l.category === "security").length;
    return { total, adminActions, integrationChanges, failed, security, last24h: total };
  }, [logs]);

  const openLog = openId ? logs.find((l) => l.id === openId) ?? null : null;

  function exportLogs() {
    const headers = ["id", "timestamp", "actor", "action_type", "integration", "severity", "source", "description"];
    const rows = filtered.map((l) =>
      [l.id, l.tsExact, l.actor, l.actionType, l.integration ?? "", l.severity, l.source, `"${l.description.replace(/"/g, '""')}"`].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hypermcp-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} log entries`);
  }

  function clearFilters() {
    setSearch(""); setActorFilter("all"); setActionFilter("all");
    setIntegrationFilter("all"); setSeverityFilter("all"); setDateFilter("24h");
    toast.success("Filters cleared");
  }

  return (
    <HyperMCPShell>
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0B1624] text-white flex items-center justify-center">
                <ScrollText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-[#0B1624]">Audit Logs</h1>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[rgba(15,23,42,0.10)] text-[rgba(11,22,36,0.62)] bg-white">
                    Hyper MCP
                  </span>
                </div>
                <p className="text-[13px] text-[rgba(11,22,36,0.62)] mt-0.5">
                  Track admin actions, system changes, and integration activity.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]">
                <Link to="/hypermcp"><ArrowLeft className="w-3.5 h-3.5" /> Back</Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]" onClick={clearFilters}>
                <Filter className="w-3.5 h-3.5" /> Filter
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]" onClick={() => toast.success("Audit logs refreshed")}>
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
              <Button size="sm" className="h-8 gap-1.5 bg-[#0B1624] hover:bg-[#0B1624]/90 text-white" onClick={exportLogs}>
                <Download className="w-3.5 h-3.5" /> Export Logs
              </Button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Events", value: stats.total, hint: "all time" },
              { label: "Admin Actions", value: stats.adminActions, hint: "user-driven" },
              { label: "Integration Changes", value: stats.integrationChanges, hint: "connections / syncs" },
              { label: "Failed Actions", value: stats.failed, hint: "error + critical" },
              { label: "Security Events", value: stats.security, hint: "auth / permissions" },
              { label: "Last 24 Hours", value: stats.last24h, hint: "rolling window" },
            ].map((m) => (
              <Card key={m.label} className="p-3 bg-white border-[rgba(15,23,42,0.08)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[rgba(11,22,36,0.55)]">{m.label}</div>
                <div className="text-2xl font-semibold text-[#0B1624] mt-1 tabular-nums">{m.value}</div>
                <div className="text-[11px] text-[rgba(11,22,36,0.50)] mt-0.5">{m.hint}</div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgba(11,22,36,0.40)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, actor, action..."
                className="h-8 pl-8 text-[13px] bg-white border-[rgba(15,23,42,0.12)]"
              />
            </div>
            <Select value={actorFilter} onValueChange={setActorFilter}>
              <SelectTrigger className="h-8 w-[150px] text-[13px] bg-white border-[rgba(15,23,42,0.12)]">
                <SelectValue placeholder="Actor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actors</SelectItem>
                {actors.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 w-[180px] text-[13px] bg-white border-[rgba(15,23,42,0.12)]">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={integrationFilter} onValueChange={setIntegrationFilter}>
              <SelectTrigger className="h-8 w-[160px] text-[13px] bg-white border-[rgba(15,23,42,0.12)]">
                <SelectValue placeholder="Integration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All integrations</SelectItem>
                {integrations.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 w-[130px] text-[13px] bg-white border-[rgba(15,23,42,0.12)]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severity</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-8 w-[130px] text-[13px] bg-white border-[rgba(15,23,42,0.12)]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last hour</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[11px] text-[rgba(11,22,36,0.55)] ml-auto">
              {filtered.length} of {logs.length} events
            </span>
          </div>

          {/* Table */}
          <Card className="bg-white border-[rgba(15,23,42,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-[#FAFBFC] border-b border-[rgba(15,23,42,0.08)]">
                  <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-[rgba(11,22,36,0.55)]">
                    <th className="px-3 py-2.5 font-medium">Timestamp</th>
                    <th className="px-3 py-2.5 font-medium">Actor</th>
                    <th className="px-3 py-2.5 font-medium">Action Type</th>
                    <th className="px-3 py-2.5 font-medium">Integration</th>
                    <th className="px-3 py-2.5 font-medium">Description</th>
                    <th className="px-3 py-2.5 font-medium">Severity</th>
                    <th className="px-3 py-2.5 font-medium">Source</th>
                    <th className="px-3 py-2.5 font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setOpenId(l.id)}
                      className="border-b border-[rgba(15,23,42,0.06)] last:border-b-0 hover:bg-[#FAFBFC] cursor-pointer"
                    >
                      <td className="px-3 py-2.5 text-[rgba(11,22,36,0.70)] whitespace-nowrap">{l.ts}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-[rgba(11,22,36,0.40)]" />
                          <span className="text-[#0B1624]">{l.actor}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-[rgba(11,22,36,0.78)]">{l.actionType}</td>
                      <td className="px-3 py-2.5 text-[#0B1624]">{l.integration ?? <span className="text-[rgba(11,22,36,0.40)]">—</span>}</td>
                      <td className="px-3 py-2.5 text-[rgba(11,22,36,0.78)] max-w-[420px] truncate">{l.description}</td>
                      <td className="px-3 py-2.5">{severityBadge(l.severity)}</td>
                      <td className="px-3 py-2.5">{sourceBadge(l.source)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-[11px] text-[rgba(11,22,36,0.62)]" onClick={(e) => { e.stopPropagation(); setOpenId(l.id); }}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-12 text-center text-[rgba(11,22,36,0.55)] text-[13px]">
                        No audit events match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Detail Drawer */}
        <Sheet open={!!openLog} onOpenChange={(v) => !v && setOpenId(null)}>
          <SheetContent side="right" className="w-full sm:max-w-[640px] overflow-y-auto bg-white">
            {openLog && (
              <>
                <SheetHeader className="pb-3 border-b border-[rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <SheetTitle className="text-base font-semibold text-[#0B1624] flex items-center gap-2">
                      <span className="font-mono text-[13px]">{openLog.id}</span>
                      {severityBadge(openLog.severity)}
                    </SheetTitle>
                  </div>
                  <SheetDescription className="text-[12px] text-[rgba(11,22,36,0.62)] font-mono">
                    {openLog.actionType}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-5 mt-4">
                  {/* Summary */}
                  <div className="border border-[rgba(15,23,42,0.08)] rounded p-3 bg-[#FAFBFC]">
                    <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-1">Action Summary</div>
                    <div className="text-[13px] text-[#0B1624]">{openLog.description}</div>
                  </div>

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    {[
                      ["Timestamp", openLog.tsExact],
                      ["Actor", openLog.actor],
                      ["Actor Email", openLog.actorEmail],
                      ["Source", openLog.source],
                      ["Integration", openLog.integration ?? "—"],
                      ["Source IP", openLog.ipAddress],
                    ].map(([k, v]) => (
                      <div key={k} className="border border-[rgba(15,23,42,0.08)] rounded p-2.5 bg-white">
                        <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.55)]">{k}</div>
                        <div className="text-[12px] font-medium text-[#0B1624] mt-0.5 break-all">{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Before/After */}
                  {(openLog.before || openLog.after) && (
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Changes</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-1">Before</div>
                          <pre className="text-[11px] font-mono bg-[#FAFBFC] border border-[rgba(15,23,42,0.08)] text-[#0B1624] p-2.5 rounded overflow-x-auto max-h-48">
{openLog.before ? JSON.stringify(openLog.before, null, 2) : "—"}
                          </pre>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-1">After</div>
                          <pre className="text-[11px] font-mono bg-[#FAFBFC] border border-[rgba(15,23,42,0.08)] text-[#0B1624] p-2.5 rounded overflow-x-auto max-h-48">
{openLog.after ? JSON.stringify(openLog.after, null, 2) : "—"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Metadata Payload</h3>
                    <pre className="text-[11px] font-mono bg-[#0B1624] text-[#E2E8F0] p-3 rounded overflow-x-auto max-h-64">
{JSON.stringify(openLog.metadata, null, 2)}
                    </pre>
                  </div>

                  {/* Related */}
                  {openLog.relatedRef && (
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Related</h3>
                      <Link
                        to={openLog.relatedRef.type === "sync_job" ? "/hypermcp/sync-jobs" : "/hypermcp/webhook-logs"}
                        className="inline-flex items-center gap-1.5 text-[12px] text-[#0B1624] border border-[rgba(15,23,42,0.10)] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded px-2 py-1"
                      >
                        <span className="font-mono">{openLog.relatedRef.id}</span>
                        <span className="text-[rgba(11,22,36,0.55)]">·</span>
                        <span>{openLog.relatedRef.type === "sync_job" ? "Sync Job" : "Webhook"}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </HyperMCPShell>
  );
}
