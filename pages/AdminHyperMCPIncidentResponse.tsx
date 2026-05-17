import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import OperationalContext from "@/components/hypermcp/OperationalContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertTriangle, Search, Download, Plus, Activity, Clock, CheckCircle2,
  ArrowUpRight, ShieldAlert, Server, Workflow, Plug, Brain, KeyRound,
  ListChecks, Rocket, Bell, Pause, RotateCw, RefreshCw, PowerOff, Undo2,
  Send, FileText, ArrowRight, Layers, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─────────── Types ─────────── */

type Severity = "low" | "medium" | "high" | "critical";
type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved" | "escalated";
type FeedType =
  | "service_degradation" | "workflow_outage" | "queue_spike" | "credential_failure"
  | "webhook_failure" | "deployment_failure" | "ai_routing_failure";

interface TimelineStep {
  ts: string;
  type: "created" | "escalated" | "recovery_started" | "validation" | "resolved" | "note";
  text: string;
  by?: string;
}

interface Incident {
  id: string;
  severity: Severity;
  title: string;
  affected: string[];
  status: IncidentStatus;
  createdAt: string;
  owner: string;
  escalationLevel: 0 | 1 | 2 | 3;
  description: string;
  relatedWorkflows: string[];
  relatedIntegrations: string[];
  auditRefs: string[];
  queueFailures: string[];
  rootCause: string;
  recoverySteps: { label: string; status: "pending" | "in_progress" | "done" }[];
  responders: string[];
  comms: { ts: string; user: string; message: string }[];
  timeline: TimelineStep[];
}

interface FeedEvent {
  id: string;
  ts: string;
  type: FeedType;
  service: string;
  text: string;
  severity: Severity;
}

/* ─────────── Mock Data ─────────── */

const KPIS = [
  { label: "Active Incidents", value: "7", delta: "+2", Icon: AlertTriangle },
  { label: "Critical Incidents", value: "2", delta: "+1", Icon: ShieldAlert },
  { label: "Resolved Today", value: "14", delta: "+5", Icon: CheckCircle2 },
  { label: "Avg Resolution", value: "23m 14s", delta: "-1m", Icon: Clock },
  { label: "Escalated", value: "3", delta: "+1", Icon: ArrowUpRight },
  { label: "Systems Degraded", value: "4", delta: "+1", Icon: Server },
];

const INCIDENTS: Incident[] = [
  {
    id: "INC-2841",
    severity: "critical",
    title: "AI routing latency spike — Gemini 2.5 Pro",
    affected: ["AI Orchestration", "Lead Enrichment Workflow", "Pulse Summarizer"],
    status: "investigating",
    createdAt: "2026-05-14 09:42",
    owner: "K. Reyes",
    escalationLevel: 2,
    description:
      "P95 latency on Gemini 2.5 Pro increased from 480ms → 6.2s starting 09:38 UTC. Multiple downstream workflows degraded.",
    relatedWorkflows: ["wf_lead_enrichment", "wf_pulse_summary", "wf_carrier_screening"],
    relatedIntegrations: ["Lovable AI Gateway", "Pulse Engine"],
    auditRefs: ["audit_8821", "audit_8822"],
    queueFailures: ["queue_ai_dispatch (217 failed)", "queue_pulse_summary (84 failed)"],
    rootCause: "Pending investigation — upstream model provider rate-limiting suspected.",
    recoverySteps: [
      { label: "Failover to gemini-2.5-flash", status: "in_progress" },
      { label: "Throttle non-critical AI calls", status: "done" },
      { label: "Drain ai_dispatch queue", status: "pending" },
      { label: "Replay failed enrichments", status: "pending" },
    ],
    responders: ["K. Reyes (IC)", "M. Chen", "On-call: AI Platform"],
    comms: [
      { ts: "09:42", user: "system", message: "Incident auto-created from observability alert." },
      { ts: "09:44", user: "K. Reyes", message: "Acknowledged. Routing 60% of traffic to Flash." },
      { ts: "09:51", user: "M. Chen", message: "Confirmed provider-side issue, status page updated." },
    ],
    timeline: [
      { ts: "09:42", type: "created", text: "Incident created (auto)" },
      { ts: "09:43", type: "escalated", text: "Escalated to L2 — AI Platform", by: "system" },
      { ts: "09:48", type: "recovery_started", text: "Failover initiated", by: "K. Reyes" },
      { ts: "09:51", type: "validation", text: "Health checks running on Flash routing" },
    ],
  },
  {
    id: "INC-2840",
    severity: "high",
    title: "Webhook delivery failures — Twilio inbound SMS",
    affected: ["Webhook Engine", "SMS Inbound Pipeline"],
    status: "identified",
    createdAt: "2026-05-14 08:11",
    owner: "D. Patel",
    escalationLevel: 1,
    description: "32% webhook failures from Twilio inbound — signature validation timing out.",
    relatedWorkflows: ["wf_sms_router", "wf_lead_intake"],
    relatedIntegrations: ["Twilio", "SlickText"],
    auditRefs: ["audit_8810"],
    queueFailures: ["queue_inbound_sms (412 failed)"],
    rootCause: "TLS handshake delay against signature verification endpoint.",
    recoverySteps: [
      { label: "Bypass signature verification (temp)", status: "done" },
      { label: "Patch TLS client config", status: "in_progress" },
      { label: "Replay failed webhooks", status: "pending" },
    ],
    responders: ["D. Patel (IC)", "On-call: Integrations"],
    comms: [
      { ts: "08:11", user: "system", message: "Incident created from webhook failure spike." },
      { ts: "08:18", user: "D. Patel", message: "Root cause identified — TLS handshake." },
    ],
    timeline: [
      { ts: "08:11", type: "created", text: "Incident created" },
      { ts: "08:14", type: "escalated", text: "Escalated to L1" },
      { ts: "08:18", type: "recovery_started", text: "Temporary mitigation deployed" },
    ],
  },
  {
    id: "INC-2839",
    severity: "medium",
    title: "Queue backlog — sync_jobs.crm_export",
    affected: ["Queue Processor", "CRM Export Worker"],
    status: "monitoring",
    createdAt: "2026-05-14 07:02",
    owner: "L. Nguyen",
    escalationLevel: 1,
    description: "Backlog grew to 14k items after worker pod restart loop.",
    relatedWorkflows: ["wf_crm_export"],
    relatedIntegrations: ["Salesforce", "HubSpot"],
    auditRefs: ["audit_8801"],
    queueFailures: ["queue_crm_export (depth 14,021)"],
    rootCause: "Memory leak in export worker v1.42.1 — rolled back to v1.41.6.",
    recoverySteps: [
      { label: "Roll back worker", status: "done" },
      { label: "Scale processors 4 → 12", status: "done" },
      { label: "Drain backlog", status: "in_progress" },
    ],
    responders: ["L. Nguyen (IC)"],
    comms: [
      { ts: "07:02", user: "system", message: "Queue depth threshold breached." },
      { ts: "07:30", user: "L. Nguyen", message: "Rollback complete. Backlog draining." },
    ],
    timeline: [
      { ts: "07:02", type: "created", text: "Incident created" },
      { ts: "07:18", type: "recovery_started", text: "Worker rollback initiated" },
      { ts: "07:30", type: "validation", text: "Backlog draining at 320/min" },
    ],
  },
  {
    id: "INC-2838",
    severity: "high",
    title: "Credential expiry — Google Ads OAuth refresh token",
    affected: ["Credentials Vault", "Google Ads Sync"],
    status: "escalated",
    createdAt: "2026-05-14 05:47",
    owner: "Unassigned",
    escalationLevel: 2,
    description: "Refresh token revoked by provider. All Google Ads syncs failing.",
    relatedWorkflows: ["wf_ads_sync"],
    relatedIntegrations: ["Google Ads"],
    auditRefs: ["audit_8790"],
    queueFailures: ["queue_ads_sync (98 failed)"],
    rootCause: "Token revoked outside system — likely manual action in provider console.",
    recoverySteps: [
      { label: "Notify account owner", status: "done" },
      { label: "Re-authenticate OAuth", status: "pending" },
      { label: "Replay failed syncs", status: "pending" },
    ],
    responders: ["On-call: Integrations"],
    comms: [
      { ts: "05:47", user: "system", message: "Credential failure detected." },
      { ts: "06:10", user: "system", message: "Auto-escalated — no acknowledgement in 20m." },
    ],
    timeline: [
      { ts: "05:47", type: "created", text: "Incident created" },
      { ts: "06:10", type: "escalated", text: "Auto-escalated to L2" },
    ],
  },
  {
    id: "INC-2837",
    severity: "low",
    title: "Deployment validation warning — workflow v3.12",
    affected: ["Deployment Center"],
    status: "resolved",
    createdAt: "2026-05-14 04:22",
    owner: "S. Park",
    escalationLevel: 0,
    description: "Non-blocking validation warning during staging promotion.",
    relatedWorkflows: ["wf_lead_router"],
    relatedIntegrations: [],
    auditRefs: ["audit_8771"],
    queueFailures: [],
    rootCause: "Deprecated field reference in mapping config.",
    recoverySteps: [{ label: "Update mapping config", status: "done" }],
    responders: ["S. Park"],
    comms: [{ ts: "04:30", user: "S. Park", message: "Resolved — config patched." }],
    timeline: [
      { ts: "04:22", type: "created", text: "Incident created" },
      { ts: "04:30", type: "resolved", text: "Resolved — config patched" },
    ],
  },
];

const FEED: FeedEvent[] = [
  { id: "f1", ts: "09:51", type: "ai_routing_failure", service: "AI Orchestration", text: "Gemini 2.5 Pro p95 latency 6.2s", severity: "critical" },
  { id: "f2", ts: "09:46", type: "service_degradation", service: "Pulse Engine", text: "Summarizer throughput -42%", severity: "high" },
  { id: "f3", ts: "09:38", type: "queue_spike", service: "Queue Processor", text: "ai_dispatch depth 1,820", severity: "high" },
  { id: "f4", ts: "08:11", type: "webhook_failure", service: "Webhook Engine", text: "Twilio inbound failures 32%", severity: "high" },
  { id: "f5", ts: "07:02", type: "queue_spike", service: "Queue Processor", text: "crm_export depth 14,021", severity: "medium" },
  { id: "f6", ts: "06:14", type: "deployment_failure", service: "Deployment Center", text: "Validation warning on v3.12", severity: "low" },
  { id: "f7", ts: "05:47", type: "credential_failure", service: "Credentials Vault", text: "Google Ads refresh token revoked", severity: "high" },
  { id: "f8", ts: "04:55", type: "workflow_outage", service: "Workflow Engine", text: "wf_carrier_screening 3 consecutive fails", severity: "medium" },
];

const RULES = [
  "Integration disconnect alert",
  "Credential expiration alert",
  "Workflow failure alert",
  "Queue backlog alert",
  "Approval overdue alert",
];

/* ─────────── Style helpers ─────────── */

const sevBadge = (s: Severity) =>
  cn(
    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border",
    s === "critical" && "bg-red-50 text-red-700 border-red-200",
    s === "high" && "bg-orange-50 text-orange-700 border-orange-200",
    s === "medium" && "bg-amber-50 text-amber-700 border-amber-200",
    s === "low" && "bg-slate-50 text-slate-600 border-slate-200",
  );

const statusBadge = (s: IncidentStatus) =>
  cn(
    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border",
    s === "investigating" && "bg-blue-50 text-blue-700 border-blue-200",
    s === "identified" && "bg-violet-50 text-violet-700 border-violet-200",
    s === "monitoring" && "bg-cyan-50 text-cyan-700 border-cyan-200",
    s === "resolved" && "bg-emerald-50 text-emerald-700 border-emerald-200",
    s === "escalated" && "bg-red-50 text-red-700 border-red-200",
  );

const feedIcon = (t: FeedType) => {
  switch (t) {
    case "service_degradation": return Activity;
    case "workflow_outage": return Workflow;
    case "queue_spike": return ListChecks;
    case "credential_failure": return KeyRound;
    case "webhook_failure": return Plug;
    case "deployment_failure": return Rocket;
    case "ai_routing_failure": return Brain;
  }
};

/* ─────────── Page ─────────── */

export default function AdminHyperMCPIncidentResponse() {
  const [query, setQuery] = useState("");
  const [sevFilter, setSevFilter] = useState<Severity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "all">("all");
  const [open, setOpen] = useState<Incident | null>(null);

  const filtered = useMemo(() => {
    return INCIDENTS.filter((i) => {
      if (sevFilter !== "all" && i.severity !== sevFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (query && !`${i.id} ${i.title} ${i.owner}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [query, sevFilter, statusFilter]);

  return (
    <HyperMCPShell>
      <div className="p-6 space-y-5 bg-[#fafafa] min-h-screen">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Incident Response</h1>
            <p className="text-xs text-slate-500 mt-1">
              Monitor, escalate, coordinate, and resolve orchestration and infrastructure incidents.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toast.success("Diagnostics started")}>
              <Activity className="w-3.5 h-3.5 mr-1.5" /> Run Diagnostics
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toast.warning("Escalation triggered")}>
              <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" /> Escalate
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toast.success("Report exported")}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export Report
            </Button>
            <Button size="sm" className="h-8 text-xs bg-slate-900 hover:bg-slate-800" onClick={() => toast.success("Incident created")}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Incident
            </Button>
          </div>
        </div>

        <OperationalContext kind="incident" />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {KPIS.map((k) => (
            <Card key={k.label} className="p-3 border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{k.label}</span>
                <k.Icon className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-lg font-semibold text-slate-900">{k.value}</span>
                <span className="text-[10px] text-slate-500">{k.delta}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Incidents table */}
          <Card className="col-span-12 lg:col-span-8 border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Incidents</h2>
                <span className="text-[10px] text-slate-500">{filtered.length} of {INCIDENTS.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search ID, title, owner..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-7 pl-7 text-xs w-56"
                  />
                </div>
                <select
                  value={sevFilter}
                  onChange={(e) => setSevFilter(e.target.value as any)}
                  className="h-7 text-xs border border-slate-200 rounded px-2 bg-white text-slate-700"
                >
                  <option value="all">All severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="h-7 text-xs border border-slate-200 rounded px-2 bg-white text-slate-700"
                >
                  <option value="all">All statuses</option>
                  <option value="investigating">Investigating</option>
                  <option value="identified">Identified</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="resolved">Resolved</option>
                  <option value="escalated">Escalated</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2 font-medium">ID</th>
                    <th className="px-3 py-2 font-medium">Severity</th>
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Affected</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 font-medium">Esc.</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr
                      key={i.id}
                      onClick={() => setOpen(i)}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{i.id}</td>
                      <td className="px-3 py-2"><span className={sevBadge(i.severity)}>{i.severity}</span></td>
                      <td className="px-3 py-2 text-slate-900 font-medium max-w-[280px] truncate">{i.title}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[180px] truncate">{i.affected.join(", ")}</td>
                      <td className="px-3 py-2"><span className={statusBadge(i.status)}>{i.status}</span></td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{i.createdAt}</td>
                      <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{i.owner}</td>
                      <td className="px-3 py-2 text-slate-700">L{i.escalationLevel}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                          onClick={(e) => { e.stopPropagation(); setOpen(i); }}
                        >
                          View <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Live feed */}
          <Card className="col-span-12 lg:col-span-4 border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Live Incident Feed</h2>
              <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
              {FEED.map((f) => {
                const Icon = feedIcon(f.type);
                return (
                  <div key={f.id} className="px-3 py-2.5 flex items-start gap-2.5 hover:bg-slate-50">
                    <Icon className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 justify-between">
                        <span className="text-[11px] font-medium text-slate-900 truncate">{f.service}</span>
                        <span className={sevBadge(f.severity)}>{f.severity}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{f.text}</p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{f.ts}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Recovery + Rules + Timeline summary */}
        <div className="grid grid-cols-12 gap-4">
          {/* Recovery coordination */}
          <Card className="col-span-12 lg:col-span-5 border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="p-3 border-b border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Recovery Coordination</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Coordinated response actions across orchestration layer</p>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {[
                { label: "Pause Workflows", Icon: Pause },
                { label: "Restart Queue Processors", Icon: RotateCw },
                { label: "Retry Failed Syncs", Icon: RefreshCw },
                { label: "Disable Integrations", Icon: PowerOff },
                { label: "Trigger Rollback", Icon: Undo2 },
                { label: "Notify Stakeholders", Icon: Send },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => toast.success(`${a.label} dispatched`)}
                  className="flex items-center gap-2 px-3 py-2 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs text-slate-700 text-left"
                >
                  <a.Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-medium">{a.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Timeline visualization */}
          <Card className="col-span-12 lg:col-span-4 border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="p-3 border-b border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Incident Timeline</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Most recent — INC-2841</p>
            </div>
            <div className="p-3">
              <ol className="relative border-l border-slate-200 ml-2 space-y-3">
                {INCIDENTS[0].timeline.map((t, idx) => (
                  <li key={idx} className="ml-3">
                    <span className="absolute -left-[5px] mt-1 w-2.5 h-2.5 rounded-full bg-white border border-slate-300" />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500">{t.ts}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">{t.type.replace("_", " ")}</span>
                    </div>
                    <p className="text-[11px] text-slate-800 mt-0.5">{t.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Card>

          {/* Rules */}
          <Card className="col-span-12 lg:col-span-3 border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="p-3 border-b border-slate-200">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Active Alert Rules</h2>
            </div>
            <ul className="p-3 space-y-1.5">
              {RULES.map((r) => (
                <li key={r} className="flex items-center gap-2 text-[11px] text-slate-700">
                  <Bell className="w-3 h-3 text-slate-400" /> {r}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent side="right" className="w-[640px] sm:max-w-[640px] p-0 overflow-y-auto">
          {open && (
            <>
              <SheetHeader className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[11px] text-slate-500">{open.id}</span>
                  <span className={sevBadge(open.severity)}>{open.severity}</span>
                  <span className={statusBadge(open.status)}>{open.status}</span>
                  <span className="text-[10px] text-slate-500">L{open.escalationLevel}</span>
                </div>
                <SheetTitle className="text-base text-slate-900">{open.title}</SheetTitle>
                <SheetDescription className="text-xs text-slate-600">{open.description}</SheetDescription>
                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" className="h-7 text-xs bg-slate-900 hover:bg-slate-800" onClick={() => toast.success("Resolved")}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.warning("Escalated")}>
                    <ArrowUpRight className="w-3 h-3 mr-1" /> Escalate
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.success("Owner assigned")}>
                    Assign Owner
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.success("Follow-up created")}>
                    <Plus className="w-3 h-3 mr-1" /> Follow-Up Task
                  </Button>
                </div>
              </SheetHeader>

              <div className="p-4 space-y-4">
                {/* Affected systems */}
                <Section title="Affected Systems" icon={Server}>
                  <div className="flex flex-wrap gap-1.5">
                    {open.affected.map((a) => (
                      <span key={a} className="px-2 py-0.5 rounded bg-slate-100 text-[11px] text-slate-700 border border-slate-200">{a}</span>
                    ))}
                  </div>
                </Section>

                {/* Related */}
                <div className="grid grid-cols-2 gap-3">
                  <Section title="Related Workflows" icon={Workflow}>
                    <ul className="space-y-1">
                      {open.relatedWorkflows.map((w) => <li key={w} className="text-[11px] font-mono text-slate-700">{w}</li>)}
                    </ul>
                  </Section>
                  <Section title="Related Integrations" icon={Plug}>
                    <ul className="space-y-1">
                      {open.relatedIntegrations.map((w) => <li key={w} className="text-[11px] text-slate-700">{w}</li>)}
                    </ul>
                  </Section>
                  <Section title="Audit Logs" icon={FileText}>
                    <ul className="space-y-1">
                      {open.auditRefs.map((w) => <li key={w} className="text-[11px] font-mono text-slate-700">{w}</li>)}
                    </ul>
                  </Section>
                  <Section title="Queue Failures" icon={ListChecks}>
                    <ul className="space-y-1">
                      {open.queueFailures.length ? open.queueFailures.map((w) => <li key={w} className="text-[11px] font-mono text-slate-700">{w}</li>) : <li className="text-[11px] text-slate-500">None</li>}
                    </ul>
                  </Section>
                </div>

                {/* Root cause */}
                <Section title="Root Cause" icon={AlertCircle}>
                  <p className="text-[11px] text-slate-700">{open.rootCause}</p>
                </Section>

                {/* Recovery steps */}
                <Section title="Recovery Steps" icon={Layers}>
                  <ul className="space-y-1.5">
                    {open.recoverySteps.map((s, i) => (
                      <li key={i} className="flex items-center gap-2 text-[11px]">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          s.status === "done" && "bg-emerald-500",
                          s.status === "in_progress" && "bg-amber-500",
                          s.status === "pending" && "bg-slate-300",
                        )} />
                        <span className="text-slate-800 flex-1">{s.label}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">{s.status.replace("_", " ")}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                {/* Responders */}
                <Section title="Assigned Responders" icon={ShieldAlert}>
                  <div className="flex flex-wrap gap-1.5">
                    {open.responders.map((r) => (
                      <span key={r} className="px-2 py-0.5 rounded bg-slate-100 text-[11px] text-slate-700 border border-slate-200">{r}</span>
                    ))}
                  </div>
                </Section>

                {/* Timeline */}
                <Section title="Incident Timeline" icon={Clock}>
                  <ol className="relative border-l border-slate-200 ml-2 space-y-2.5">
                    {open.timeline.map((t, idx) => (
                      <li key={idx} className="ml-3">
                        <span className="absolute -left-[5px] mt-1 w-2.5 h-2.5 rounded-full bg-white border border-slate-300" />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-500">{t.ts}</span>
                          <span className="text-[10px] uppercase tracking-wider text-slate-500">{t.type.replace("_", " ")}</span>
                          {t.by && <span className="text-[10px] text-slate-400">· {t.by}</span>}
                        </div>
                        <p className="text-[11px] text-slate-800 mt-0.5">{t.text}</p>
                      </li>
                    ))}
                  </ol>
                </Section>

                {/* Comms */}
                <Section title="Communication Log" icon={Send}>
                  <div className="space-y-1.5">
                    {open.comms.map((c, i) => (
                      <div key={i} className="px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-800">{c.user}</span>
                          <span className="text-[10px] font-mono text-slate-500">{c.ts}</span>
                        </div>
                        <p className="text-[11px] text-slate-700 mt-0.5">{c.message}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}

function Section({
  title, icon: Icon, children,
}: { title: string; icon: typeof Server; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded">
      <div className="px-3 py-1.5 border-b border-slate-200 bg-slate-50 flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-slate-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
