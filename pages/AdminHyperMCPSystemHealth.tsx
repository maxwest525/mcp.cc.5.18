import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  RefreshCcw, PlayCircle, Download, Activity, AlertTriangle, CheckCircle2,
  XCircle, Wrench, Database, Phone, PhoneCall, Workflow, Search, Truck, Mail,
  Radio, Webhook, ListOrdered, Lock, ArrowRight, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

type ServiceStatus = "healthy" | "degraded" | "offline" | "maintenance";

interface ServiceCard {
  id: string;
  name: string;
  group: string;
  icon: React.ElementType;
  status: ServiceStatus;
  lastEventAgo: string;
  latencyMs: number | null;
  failures24h: number;
  queueBacklog?: number | null;
  uptimePct: number;
  endpoint?: string;
}

const SERVICES: ServiceCard[] = [
  { id: "supabase",       name: "Supabase",              group: "Data",          icon: Database, status: "healthy",   lastEventAgo: "12s ago",  latencyMs: 84,  failures24h: 0,  uptimePct: 99.99, endpoint: "db.supabase.co" },
  { id: "crm-api",        name: "CRM API",               group: "Core",          icon: Workflow, status: "healthy",   lastEventAgo: "3s ago",   latencyMs: 112, failures24h: 0,  uptimePct: 99.98, endpoint: "api.trumove.internal" },
  { id: "convoso",        name: "Convoso",               group: "Telephony",     icon: Phone,    status: "degraded",  lastEventAgo: "1m ago",   latencyMs: 612, failures24h: 4,  uptimePct: 98.42, endpoint: "api.convoso.com" },
  { id: "ringcentral",    name: "RingCentral",           group: "Telephony",     icon: PhoneCall,status: "healthy",   lastEventAgo: "8s ago",   latencyMs: 174, failures24h: 0,  uptimePct: 99.94, endpoint: "platform.ringcentral.com" },
  { id: "zapier",         name: "Zapier",                group: "Automation",    icon: Workflow, status: "healthy",   lastEventAgo: "45s ago",  latencyMs: 318, failures24h: 1,  uptimePct: 99.71, endpoint: "hooks.zapier.com" },
  { id: "searchatlas",    name: "SearchAtlas",           group: "Marketing",     icon: Search,   status: "healthy",   lastEventAgo: "2m ago",   latencyMs: 421, failures24h: 0,  uptimePct: 99.62, endpoint: "api.searchatlas.com" },
  { id: "granot",         name: "Granot",                group: "Tariff",        icon: Truck,    status: "offline",   lastEventAgo: "3h ago",   latencyMs: null,failures24h: 12, uptimePct: 87.10, endpoint: "api.granot.com" },
  { id: "email-sms",      name: "Email / SMS",           group: "Comms",         icon: Mail,     status: "healthy",   lastEventAgo: "5s ago",   latencyMs: 142, failures24h: 2,  uptimePct: 99.88, endpoint: "resend + slicktext" },
  { id: "pulse",          name: "Pulse",                 group: "Compliance",    icon: Radio,    status: "healthy",   lastEventAgo: "9s ago",   latencyMs: 96,  failures24h: 0,  uptimePct: 99.95, endpoint: "pulse.internal" },
  { id: "webhook-engine", name: "Webhook Engine",        group: "Orchestration", icon: Webhook,  status: "degraded",  lastEventAgo: "20s ago",  latencyMs: 540, failures24h: 7,  queueBacklog: 38, uptimePct: 99.10, endpoint: "hypermcp/webhooks" },
  { id: "automation-q",   name: "Automation Queue",      group: "Orchestration", icon: ListOrdered, status: "healthy",lastEventAgo: "1s ago",   latencyMs: 22,  failures24h: 1,  queueBacklog: 12, uptimePct: 99.97, endpoint: "queue://automation" },
  { id: "auth",           name: "Authentication Service",group: "Security",      icon: Lock,     status: "healthy",   lastEventAgo: "11s ago",  latencyMs: 64,  failures24h: 0,  uptimePct: 99.99, endpoint: "auth.supabase.co" },
];

const EVENTS = [
  { t: "Just now",    sev: "info" as const,    msg: "Sync restored: SearchAtlas keyword pull completed",    src: "SearchAtlas" },
  { t: "20s ago",     sev: "warning" as const, msg: "Latency spike detected on Webhook Engine (540ms p95)", src: "Webhook Engine" },
  { t: "1m ago",      sev: "warning" as const, msg: "Queue backlog increasing — Automation Queue at 12 jobs", src: "Automation Queue" },
  { t: "3m ago",      sev: "success" as const, msg: "Webhook retry succeeded after 2 attempts (Convoso)",   src: "Convoso" },
  { t: "12m ago",     sev: "error" as const,   msg: "API disconnected: Granot (auth handshake failed)",     src: "Granot" },
  { t: "27m ago",     sev: "warning" as const, msg: "Authentication token expired for Zapier integration",  src: "Zapier" },
  { t: "1h ago",      sev: "success" as const, msg: "Health check completed across 12 systems",              src: "System" },
  { t: "2h ago",      sev: "info" as const,    msg: "Maintenance window closed for Pulse",                  src: "Pulse" },
];

function statusMeta(s: ServiceStatus) {
  switch (s) {
    case "healthy":     return { label: "Healthy",     dot: "bg-emerald-500",  text: "text-emerald-700",  bg: "bg-emerald-50 border-emerald-200" };
    case "degraded":    return { label: "Degraded",    dot: "bg-amber-500",    text: "text-amber-700",    bg: "bg-amber-50 border-amber-200" };
    case "offline":     return { label: "Offline",     dot: "bg-rose-500",     text: "text-rose-700",     bg: "bg-rose-50 border-rose-200" };
    case "maintenance": return { label: "Maintenance", dot: "bg-slate-400",    text: "text-slate-700",    bg: "bg-slate-50 border-slate-200" };
  }
}

function sevMeta(sev: "info" | "warning" | "error" | "success") {
  switch (sev) {
    case "info":    return { dot: "bg-slate-400",   icon: Activity,       text: "text-slate-700" };
    case "warning": return { dot: "bg-amber-500",   icon: AlertTriangle,  text: "text-amber-700" };
    case "error":   return { dot: "bg-rose-500",    icon: XCircle,        text: "text-rose-700" };
    case "success": return { dot: "bg-emerald-500", icon: CheckCircle2,   text: "text-emerald-700" };
  }
}

const Kpi = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Card className="border-border/70">
    <CardContent className="p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1 leading-tight">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </CardContent>
  </Card>
);

export default function AdminHyperMCPSystemHealth() {
  const [services] = useState<ServiceCard[]>(SERVICES);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = services.find((s) => s.id === openId) || null;

  const kpis = useMemo(() => {
    const total = services.length;
    const healthy = services.filter((s) => s.status === "healthy").length;
    const degraded = services.filter((s) => s.status === "degraded").length;
    const failed = services.filter((s) => s.status === "offline").length;
    const lat = services.filter((s) => s.latencyMs != null).map((s) => s.latencyMs!) ;
    const avgLat = lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : 0;
    const backlog = services.reduce((sum, s) => sum + (s.queueBacklog || 0), 0);
    const overall = Math.round((healthy / total) * 1000) / 10;
    return { overall, connected: total - failed, degraded, failed, avgLat, backlog };
  }, [services]);

  return (
    <HyperMCPShell breadcrumbs={[{ label: "System Health" }]}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">System Health</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor platform connectivity, orchestration health, and infrastructure status.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success("Report exported")}>
              <Download className="w-4 h-4 mr-1" />Export Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.success("Systems refreshed")}>
              <RefreshCcw className="w-4 h-4 mr-1" />Refresh Systems
            </Button>
            <Button size="sm" onClick={() => toast.success("Full health check started")}>
              <PlayCircle className="w-4 h-4 mr-1" />Run Full Health Check
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          <Kpi label="Overall Health"        value={`${kpis.overall}%`} hint="Across 12 services" />
          <Kpi label="Connected"              value={`${kpis.connected}`} hint="Integrations online" />
          <Kpi label="Degraded"               value={`${kpis.degraded}`} hint="Performance issues" />
          <Kpi label="Failed"                 value={`${kpis.failed}`} hint="Offline services" />
          <Kpi label="Avg API Latency"        value={`${kpis.avgLat}ms`} hint="p50 across services" />
          <Kpi label="Active Webhooks"        value="184" hint="In last 24h" />
          <Kpi label="Queue Backlog"          value={`${kpis.backlog}`} hint="All queues" />
          <Kpi label="Last Health Check"      value="4m ago" hint="Auto-scheduled" />
        </div>

        {/* Infrastructure Status Grid */}
        <Card className="border-border/70">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">Infrastructure Status</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Connected systems and their current health.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {services.map((svc) => {
                const meta = statusMeta(svc.status);
                const Icon = svc.icon;
                return (
                  <button
                    key={svc.id}
                    onClick={() => setOpenId(svc.id)}
                    className="text-left rounded-md border border-border/70 hover:border-foreground/30 hover:shadow-sm transition-all bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{svc.name}</div>
                          <div className="text-[11px] text-muted-foreground">{svc.group}</div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[10px] font-medium ${meta.bg} ${meta.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-[11px]">
                      <div className="text-muted-foreground">Last event</div>
                      <div className="text-right">{svc.lastEventAgo}</div>
                      <div className="text-muted-foreground">Latency</div>
                      <div className="text-right">{svc.latencyMs != null ? `${svc.latencyMs}ms` : "—"}</div>
                      <div className="text-muted-foreground">Failures (24h)</div>
                      <div className="text-right">{svc.failures24h}</div>
                      {svc.queueBacklog != null && (
                        <>
                          <div className="text-muted-foreground">Queue backlog</div>
                          <div className="text-right">{svc.queueBacklog}</div>
                        </>
                      )}
                      <div className="text-muted-foreground">Uptime</div>
                      <div className="text-right">{svc.uptimePct.toFixed(2)}%</div>
                    </div>
                    <div className="flex items-center justify-end mt-2 pt-2 border-t border-border/50">
                      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                        View Diagnostics <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Live Event Stream */}
          <Card className="border-border/70 xl:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">Live Event Stream</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Real-time orchestration and infrastructure events.</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Streaming</Badge>
              </div>
              <div className="divide-y divide-border/60">
                {EVENTS.map((ev, i) => {
                  const m = sevMeta(ev.sev);
                  const I = m.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 py-2.5">
                      <span className={`w-1.5 h-1.5 mt-2 rounded-full ${m.dot}`} />
                      <I className={`w-3.5 h-3.5 mt-0.5 ${m.text}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs">{ev.msg}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{ev.src} · {ev.t}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Queue Health */}
          <Card className="border-border/70">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold">Queue Health</h3>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Automation & webhook job queues.</p>
              <div className="space-y-2 text-xs">
                {[
                  { label: "Pending jobs", value: "47" },
                  { label: "Running jobs", value: "8" },
                  { label: "Failed jobs (24h)", value: "3" },
                  { label: "Retry queue depth", value: "12" },
                  { label: "Oldest queued event", value: "2m 14s" },
                  { label: "Avg processing time", value: "318ms" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-1 border-b border-border/40 last:border-b-0">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dependency Map */}
        <Card className="border-border/70">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold">System Dependency Map</h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">High-level orchestration flow across services.</p>
            <div className="flex items-center justify-center gap-2 flex-wrap py-2">
              {[
                { label: "CRM",                 sub: "Source of truth" },
                { label: "HyperMCP",            sub: "Orchestration layer" },
                { label: "Automation Queue",    sub: "Scheduling" },
                { label: "Webhook Engine",      sub: "Event dispatch" },
                { label: "External Services",   sub: "APIs & vendors" },
              ].map((node, i, arr) => (
                <div key={node.label} className="flex items-center gap-2">
                  <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 min-w-[140px] text-center">
                    <div className="text-xs font-medium">{node.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{node.sub}</div>
                  </div>
                  {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagnostics Drawer */}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="sm:max-w-[520px] p-0 overflow-y-auto">
          {open && (() => {
            const meta = statusMeta(open.status);
            const Icon = open.icon;
            return (
              <>
                <SheetHeader className="p-5 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-base">{open.name}</SheetTitle>
                      <SheetDescription className="text-xs">{open.group} · {open.endpoint}</SheetDescription>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium ${meta.bg} ${meta.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>
                </SheetHeader>

                <div className="p-5 space-y-5">
                  {/* Metadata */}
                  <div>
                    <div className="text-xs font-semibold mb-2">Service Metadata</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div className="text-muted-foreground">Endpoint</div><div className="text-right font-mono text-[11px]">{open.endpoint}</div>
                      <div className="text-muted-foreground">Latency (p50)</div><div className="text-right">{open.latencyMs != null ? `${open.latencyMs}ms` : "—"}</div>
                      <div className="text-muted-foreground">Uptime (30d)</div><div className="text-right">{open.uptimePct.toFixed(2)}%</div>
                      <div className="text-muted-foreground">Last successful sync</div><div className="text-right">{open.lastEventAgo}</div>
                      <div className="text-muted-foreground">Failures (24h)</div><div className="text-right">{open.failures24h}</div>
                      <div className="text-muted-foreground">Queue backlog</div><div className="text-right">{open.queueBacklog ?? 0}</div>
                    </div>
                  </div>

                  {/* Recent failures */}
                  <div>
                    <div className="text-xs font-semibold mb-2">Recent Failures</div>
                    <div className="space-y-1.5 text-xs">
                      {open.failures24h === 0 ? (
                        <div className="text-muted-foreground text-[11px]">No failures recorded in the last 24 hours.</div>
                      ) : (
                        Array.from({ length: Math.min(open.failures24h, 4) }).map((_, i) => (
                          <div key={i} className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-b-0">
                            <span>HTTP 504 — upstream timeout</span>
                            <span className="text-muted-foreground text-[11px]">{(i + 1) * 7}m ago</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Retry attempts */}
                  <div>
                    <div className="text-xs font-semibold mb-2">Retry Attempts</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md border border-border/70 p-2 text-center">
                        <div className="text-[10px] text-muted-foreground">Succeeded</div>
                        <div className="text-sm font-semibold mt-0.5">{Math.max(0, open.failures24h - 1)}</div>
                      </div>
                      <div className="rounded-md border border-border/70 p-2 text-center">
                        <div className="text-[10px] text-muted-foreground">Pending</div>
                        <div className="text-sm font-semibold mt-0.5">{open.queueBacklog ?? 0}</div>
                      </div>
                      <div className="rounded-md border border-border/70 p-2 text-center">
                        <div className="text-[10px] text-muted-foreground">Exhausted</div>
                        <div className="text-sm font-semibold mt-0.5">{open.status === "offline" ? open.failures24h : 0}</div>
                      </div>
                    </div>
                  </div>

                  {/* Webhook events */}
                  <div>
                    <div className="text-xs font-semibold mb-2">Recent Webhook Events</div>
                    <div className="divide-y divide-border/40 text-xs">
                      {[
                        { ev: "lead.created",   code: 200, t: "12s ago" },
                        { ev: "deal.updated",   code: 200, t: "1m ago" },
                        { ev: "user.synced",    code: open.status === "healthy" ? 200 : 504, t: "4m ago" },
                        { ev: "payment.posted", code: 200, t: "9m ago" },
                      ].map((r, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5">
                          <span className="font-mono text-[11px]">{r.ev}</span>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{r.code}</Badge>
                            <span className="text-muted-foreground text-[11px]">{r.t}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Connected systems */}
                  <div>
                    <div className="text-xs font-semibold mb-2">Connected Systems</div>
                    <div className="flex flex-wrap gap-1.5">
                      {["CRM API", "Webhook Engine", "Automation Queue", "Audit Logs"].map((c) => (
                        <Badge key={c} variant="outline" className="text-[10px] font-normal">{c}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Suggested remediation */}
                  <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
                      <div className="text-xs font-semibold">Suggested Remediation</div>
                    </div>
                    <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
                      {open.status === "offline" && <li>Re-authenticate credentials in the Credentials Vault.</li>}
                      {open.status === "degraded" && <li>Investigate latency spikes; check upstream provider status.</li>}
                      <li>Replay the most recent failed events from the Webhook Logs.</li>
                      <li>Verify webhook signing secret has not rotated.</li>
                      <li>Run a targeted health check against this endpoint.</li>
                    </ul>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => toast.success(`Health check queued for ${open.name}`)}>
                        Run Health Check
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success("Failed events queued for retry")}>
                        Retry Failed
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}
