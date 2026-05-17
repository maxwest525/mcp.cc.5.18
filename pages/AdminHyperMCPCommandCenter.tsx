import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Radar, Activity, Plug, Workflow as WorkflowIcon, ListChecks, ShieldAlert,
  Bell, ShieldCheck, Brain, Building2, Rocket, CheckCircle2, XCircle,
  AlertTriangle, Clock, ArrowUpRight, RefreshCw, PauseCircle, PlayCircle,
  Stethoscope, Zap, ChevronRight, TrendingUp, TrendingDown, Database,
  PhoneCall, Headphones, Server, Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/* ─────────── Types ─────────── */

type SystemStatus = "operational" | "degraded" | "incident" | "maintenance";
type EventSeverity = "info" | "warn" | "critical";
type EventCategory =
  | "workflow" | "integration" | "deployment" | "queue"
  | "credential" | "ai" | "vendor" | "approval";

interface SystemCard {
  name: string;
  type: string;
  icon: any;
  status: SystemStatus;
  latencyMs: number;
  queueDepth: number;
  incidents: number;
  lastEvent: string;
}

interface FeedEvent {
  id: string;
  ts: string;
  category: EventCategory;
  severity: EventSeverity;
  source: string;
  text: string;
}

/* ─────────── Mock data ─────────── */

const SYSTEMS: SystemCard[] = [
  { name: "CRM", type: "Internal core", icon: Database, status: "operational", latencyMs: 84, queueDepth: 0, incidents: 0, lastEvent: "Lead.created · 12s ago" },
  { name: "Pulse", type: "Coaching engine", icon: Headphones, status: "operational", latencyMs: 142, queueDepth: 3, incidents: 0, lastEvent: "Transcript scored · 1m ago" },
  { name: "Convoso", type: "Dialer", icon: PhoneCall, status: "degraded", latencyMs: 612, queueDepth: 24, incidents: 1, lastEvent: "Call.disposition delayed · 4m" },
  { name: "RingCentral", type: "Telephony", icon: PhoneCall, status: "operational", latencyMs: 121, queueDepth: 0, incidents: 0, lastEvent: "Inbound routed · 18s ago" },
  { name: "Granot", type: "Tariff & rating", icon: Server, status: "operational", latencyMs: 188, queueDepth: 1, incidents: 0, lastEvent: "Rate.refresh · 3m ago" },
  { name: "AI Orchestration", type: "Model router", icon: Brain, status: "degraded", latencyMs: 1840, queueDepth: 11, incidents: 1, lastEvent: "Fallback to gpt-5-mini · 2m" },
  { name: "Workflow Engine", type: "Pipelines", icon: WorkflowIcon, status: "operational", latencyMs: 92, queueDepth: 6, incidents: 0, lastEvent: "lead-router run · 9s ago" },
  { name: "Queue Engine", type: "PGMQ", icon: ListChecks, status: "operational", latencyMs: 41, queueDepth: 128, incidents: 0, lastEvent: "Batch processed · 3s ago" },
  { name: "Notification Engine", type: "Email + SMS", icon: Bell, status: "operational", latencyMs: 210, queueDepth: 4, incidents: 0, lastEvent: "Alert.sent · 22s ago" },
  { name: "Policy Engine", type: "Guardrails", icon: ShieldCheck, status: "operational", latencyMs: 38, queueDepth: 0, incidents: 0, lastEvent: "Policy eval · 6s ago" },
];

const FEED: FeedEvent[] = [
  { id: "e1", ts: "12s ago", category: "workflow", severity: "critical", source: "lead-router", text: "Workflow failed at step `assign-agent` (timeout 30s)" },
  { id: "e2", ts: "1m ago", category: "ai", severity: "warn", source: "AI Orchestration", text: "Primary model gpt-5 latency >2s, routed to gpt-5-mini" },
  { id: "e3", ts: "2m ago", category: "integration", severity: "warn", source: "Convoso", text: "Disposition webhook backlog growing (+24 events)" },
  { id: "e4", ts: "4m ago", category: "approval", severity: "warn", source: "Approvals", text: "Production change escalated: vendor-attribution v1.0.4" },
  { id: "e5", ts: "6m ago", category: "deployment", severity: "info", source: "Deployment Center", text: "Promoted webhook-router v2.4.0 → staging" },
  { id: "e6", ts: "8m ago", category: "queue", severity: "warn", source: "PGMQ:lead_inbound", text: "Queue depth spiked to 128 (threshold 100)" },
  { id: "e7", ts: "12m ago", category: "vendor", severity: "warn", source: "AdSpark Media", text: "Attribution payload missing utm_campaign on 12% of events" },
  { id: "e8", ts: "18m ago", category: "credential", severity: "warn", source: "Credentials Vault", text: "Twilio API key rotates in 6 days" },
  { id: "e9", ts: "22m ago", category: "workflow", severity: "info", source: "esign-dispatch", text: "248 documents delivered today (98.4% success)" },
  { id: "e10", ts: "31m ago", category: "deployment", severity: "info", source: "Deployment Center", text: "Rollback ready: lead-router v2.3.7" },
  { id: "e11", ts: "44m ago", category: "ai", severity: "critical", source: "Trudy Assistant", text: "AI execution failed: ratelimit on tool `search_leads`" },
  { id: "e12", ts: "1 hr ago", category: "integration", severity: "info", source: "FMCSA", text: "Daily safety score sync complete (1,284 carriers)" },
];

/* ─────────── Helpers ─────────── */

const statusBadge = (s: SystemStatus) => {
  const map: Record<SystemStatus, { cls: string; label: string }> = {
    operational: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Operational" },
    degraded: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Degraded" },
    incident: { cls: "bg-red-50 text-red-700 border-red-200", label: "Incident" },
    maintenance: { cls: "bg-slate-100 text-slate-600 border-slate-200", label: "Maintenance" },
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border", map[s].cls)}>{map[s].label}</span>;
};

const sevDot = (s: EventSeverity) => cn(
  "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
  s === "info" && "bg-slate-400",
  s === "warn" && "bg-amber-500",
  s === "critical" && "bg-red-500",
);

const CAT_ICON: Record<EventCategory, any> = {
  workflow: WorkflowIcon, integration: Plug, deployment: Rocket,
  queue: ListChecks, credential: ShieldCheck, ai: Brain,
  vendor: Building2, approval: ShieldAlert,
};

/* ─────────── Page ─────────── */

export default function AdminHyperMCPCommandCenter() {
  const navigate = useNavigate();
  const [catFilter, setCatFilter] = useState<EventCategory | "all">("all");

  const feed = useMemo(() =>
    catFilter === "all" ? FEED : FEED.filter(e => e.category === catFilter),
  [catFilter]);

  const kpis = [
    { label: "System Health", value: "97.4%", icon: Gauge, tone: "text-emerald-600", trend: "+0.3%" },
    { label: "Active Integrations", value: "14", icon: Plug, tone: "text-slate-700", trend: "0" },
    { label: "Workflow Success", value: "98.1%", icon: WorkflowIcon, tone: "text-emerald-600", trend: "-0.2%" },
    { label: "Queue Backlog", value: "128", icon: ListChecks, tone: "text-amber-600", trend: "+24" },
    { label: "Active Incidents", value: "2", icon: ShieldAlert, tone: "text-red-600", trend: "+1" },
    { label: "Critical Alerts", value: "3", icon: AlertTriangle, tone: "text-red-600", trend: "+2" },
    { label: "Pending Approvals", value: "5", icon: ShieldCheck, tone: "text-amber-600", trend: "+1" },
    { label: "AI Execution", value: "94.2%", icon: Brain, tone: "text-amber-600", trend: "-1.4%" },
    { label: "Vendor Risk", value: "4", icon: Building2, tone: "text-amber-600", trend: "+1" },
    { label: "Deployments", value: "2 active", icon: Rocket, tone: "text-slate-700", trend: "" },
  ];

  return (
    <HyperMCPShell>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <Radar className="w-6 h-6 text-slate-700" />
              Command Center
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Unified mission control for HyperMCP integrations, workflows, AI orchestration, and incidents.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("Diagnostics started across all systems")}>
              <Stethoscope className="w-4 h-4 mr-1.5" /> Run Diagnostics
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Health checks triggered")}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Health Check
            </Button>
            <Button size="sm" onClick={() => navigate("/hypermcp/incident-response")}>
              <ShieldAlert className="w-4 h-4 mr-1.5" /> Open Incidents
            </Button>
          </div>
        </div>

        {/* Executive KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {kpis.map((k, i) => (
            <Card key={i} className="p-3 border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">{k.label}</p>
                <k.icon className={cn("w-4 h-4", k.tone)} />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-xl font-semibold text-slate-900">{k.value}</p>
                {k.trend && (
                  <span className={cn(
                    "text-[11px] font-mono",
                    k.trend.startsWith("+") && k.label !== "Workflow Success" && k.label !== "AI Execution" && k.label !== "System Health" ? "text-amber-600" :
                    k.trend.startsWith("-") ? "text-red-600" : "text-slate-500",
                  )}>
                    {k.trend}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Feed + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-700" /> Live Operational Feed
                </p>
                <p className="text-[11px] text-slate-500">Unified events across the HyperMCP ecosystem</p>
              </div>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value as EventCategory | "all")}
                className="h-8 px-2 text-xs border border-slate-200 rounded bg-white text-slate-700">
                <option value="all">All categories</option>
                <option value="workflow">Workflows</option>
                <option value="integration">Integrations</option>
                <option value="deployment">Deployments</option>
                <option value="queue">Queues</option>
                <option value="credential">Credentials</option>
                <option value="ai">AI</option>
                <option value="vendor">Vendors</option>
                <option value="approval">Approvals</option>
              </select>
            </div>
            <ul className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {feed.map(e => {
                const Icon = CAT_ICON[e.category];
                return (
                  <li key={e.id} className="px-3 py-2 hover:bg-slate-50 flex items-start gap-2.5">
                    <span className={sevDot(e.severity)} />
                    <Icon className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-slate-900">{e.source}</span>
                        <span className="text-[10px] uppercase tracking-wide text-slate-500 font-mono">{e.category}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-auto">{e.ts}</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-0.5">{e.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-slate-700" /> Quick Actions
              </p>
              <p className="text-[11px] text-slate-500">Operator-level controls</p>
            </div>
            <div className="p-2 grid grid-cols-1 gap-1.5">
              {[
                { label: "Retry failed workflows", icon: RefreshCw, action: () => toast.success("Retried 14 failed workflow runs") },
                { label: "Pause queues", icon: PauseCircle, action: () => toast.success("All queues paused") },
                { label: "Resume queues", icon: PlayCircle, action: () => toast.success("All queues resumed") },
                { label: "Run diagnostics", icon: Stethoscope, action: () => toast.success("Diagnostics started") },
                { label: "Trigger health checks", icon: Activity, action: () => toast.success("Health checks dispatched") },
                { label: "Open incidents", icon: ShieldAlert, action: () => navigate("/hypermcp/incident-response") },
                { label: "View approvals", icon: ShieldCheck, action: () => navigate("/hypermcp/approvals") },
                { label: "Open observability", icon: Gauge, action: () => navigate("/hypermcp/observability") },
              ].map((a, i) => (
                <button key={i} onClick={a.action}
                  className="flex items-center justify-between px-2.5 py-2 text-xs text-slate-800 rounded border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                  <span className="flex items-center gap-2">
                    <a.icon className="w-3.5 h-3.5 text-slate-600" /> {a.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Active Systems Grid */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-3 border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-700" /> Active Systems
            </p>
            <p className="text-[11px] text-slate-500">Real-time status of all connected systems</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 divide-x divide-y divide-slate-100">
            {SYSTEMS.map(s => (
              <div key={s.name} className="p-3 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <s.icon className="w-4 h-4 text-slate-700 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{s.type}</p>
                    </div>
                  </div>
                  {statusBadge(s.status)}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
                  <div>
                    <p className="text-slate-400">Latency</p>
                    <p className={cn("font-mono font-medium", s.latencyMs > 1000 ? "text-red-600" : s.latencyMs > 400 ? "text-amber-600" : "text-slate-800")}>{s.latencyMs}ms</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Queue</p>
                    <p className="font-mono font-medium text-slate-800">{s.queueDepth}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Incidents</p>
                    <p className={cn("font-mono font-medium", s.incidents > 0 ? "text-red-600" : "text-slate-800")}>{s.incidents}</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-mono truncate">{s.lastEvent}</p>
                <div className="mt-2 flex gap-1">
                  <button onClick={() => toast.success(`${s.name} health check started`)}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 hover:bg-white">Check</button>
                  <button onClick={() => toast.success(`${s.name} restarted`)}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 hover:bg-white">Restart</button>
                  <button onClick={() => toast.info(`${s.name} logs opened`)}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 hover:bg-white">Logs</button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Snapshot row 1: Queue + Incident & Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-slate-700" /> Executive Queue Snapshot
              </p>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate("/hypermcp/task-queue")}>
                Open queues <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Failed jobs (24h)", value: "47", tone: "text-red-600" },
                  { label: "Retry queue depth", value: "23", tone: "text-amber-600" },
                  { label: "Approval queue", value: "5 pending", tone: "text-amber-600" },
                  { label: "Stalled workflows", value: "3", tone: "text-amber-600" },
                  { label: "Dead-letter queue", value: "12 messages", tone: "text-red-600" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-700">{row.label}</td>
                    <td className={cn("px-3 py-2 text-right font-mono font-medium", row.tone)}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Incident & Risk Snapshot
              </p>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate("/hypermcp/incident-response")}>
                Open incidents <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <ul className="divide-y divide-slate-100 text-sm">
              {[
                { sev: "critical", text: "Convoso disposition webhook degraded — 4m delay", meta: "INC-1042" },
                { sev: "critical", text: "AI orchestration fallback triggered (gpt-5 → mini)", meta: "INC-1041" },
                { sev: "warn", text: "Vendor AdSpark Media: 12% mapping gap", meta: "VEN-204" },
                { sev: "warn", text: "Workflow lead-router: failure rate +3.2%", meta: "WF-118" },
                { sev: "warn", text: "Integration FMCSA: review due (90 days)", meta: "INT-77" },
              ].map((row, i) => (
                <li key={i} className="px-3 py-2 flex items-start gap-2">
                  <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full", row.sev === "critical" ? "bg-red-500" : "bg-amber-500")} />
                  <p className="text-xs text-slate-800 flex-1">{row.text}</p>
                  <span className="text-[10px] text-slate-500 font-mono">{row.meta}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Snapshot row 2: AI + Deployment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Brain className="w-4 h-4 text-slate-700" /> AI Orchestration Snapshot
              </p>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate("/hypermcp/ai-orchestration")}>
                Open AI <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Active AI agents", value: "8", tone: "text-slate-800" },
                  { label: "Failed executions (1h)", value: "11", tone: "text-red-600" },
                  { label: "Fallback routes triggered", value: "27", tone: "text-amber-600" },
                  { label: "AI queue backlog", value: "11 jobs", tone: "text-amber-600" },
                  { label: "Approval-required outputs", value: "3", tone: "text-amber-600" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-700">{row.label}</td>
                    <td className={cn("px-3 py-2 text-right font-mono font-medium", row.tone)}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-slate-700" /> Deployment & Environment
              </p>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate("/hypermcp/deployments")}>
                Open deployments <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Active deployments", value: "2", tone: "text-slate-800" },
                  { label: "Production changes today", value: "4", tone: "text-slate-800" },
                  { label: "Failed validations", value: "1", tone: "text-red-600" },
                  { label: "Pending promotions", value: "2 (staging → prod)", tone: "text-amber-600" },
                  { label: "Rollback-ready releases", value: "3", tone: "text-emerald-600" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-700">{row.label}</td>
                    <td className={cn("px-3 py-2 text-right font-mono font-medium", row.tone)}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Dependency Visualization */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-3 border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <WorkflowIcon className="w-4 h-4 text-slate-700" /> Operational Dependency Map
            </p>
            <p className="text-[11px] text-slate-500">Integrations → HyperMCP → Queues → Workflows → AI → CRM / Pulse / External</p>
          </div>
          <div className="p-4 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {[
                { label: "Integrations", items: ["Convoso", "RingCentral", "FMCSA", "AdSpark"], tone: "border-slate-300" },
                { label: "HyperMCP Core", items: ["Webhook Router", "Policy Engine", "Auth"], tone: "border-slate-400" },
                { label: "Queue Engine", items: ["lead.inbound", "ai.dispatch", "notify.email", "dlq"], tone: "border-slate-300" },
                { label: "Workflows", items: ["lead-router", "esign-dispatch", "vendor-attribution"], tone: "border-slate-300" },
                { label: "AI Orchestration", items: ["Trudy", "Estimator", "Coach", "Classifier"], tone: "border-slate-300" },
                { label: "Targets", items: ["CRM", "Pulse", "Granot", "Customer Portal"], tone: "border-slate-300" },
              ].map((col, i, arr) => (
                <div key={col.label} className="flex items-center gap-2">
                  <div className={cn("w-44 border rounded p-2 bg-white", col.tone)}>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">{col.label}</p>
                    <ul className="space-y-1">
                      {col.items.map(item => (
                        <li key={item} className="text-xs text-slate-800 px-1.5 py-1 rounded bg-slate-50 border border-slate-100 font-mono truncate">{item}</li>
                      ))}
                    </ul>
                  </div>
                  {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </HyperMCPShell>
  );
}
