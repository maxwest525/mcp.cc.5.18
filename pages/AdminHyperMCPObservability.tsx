import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Activity, Search, Download, RefreshCw, Play, Zap, Clock, AlertTriangle,
  TrendingUp, ArrowRight, Plug, Workflow, Brain, KeyRound, ArrowRightLeft,
  Bell, Rocket, ShieldCheck, ListChecks, GitBranch, FileText, CheckCircle2,
  XCircle, Layers, Gauge, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─────────── Types ─────────── */

type SvcStatus = "healthy" | "degraded" | "down";
type Severity = "info" | "warning" | "critical";

interface ServiceCard {
  id: string;
  name: string;
  Icon: typeof Plug;
  status: SvcStatus;
  throughput: string;
  latencyMs: number;
  errorPct: number;
  queueDepth: number;
  lastIncident: string;
}

interface WorkflowRow {
  id: string;
  name: string;
  avgRuntimeMs: number;
  successRate: number;
  failureRate: number;
  retries: number;
  queueDelayMs: number;
  slowestStep: string;
}

interface BottleneckRow {
  label: string;
  value: string;
  delta: string;
}

interface TimelineEvent {
  id: string;
  ts: string;
  type: "degradation" | "queue_spike" | "deployment" | "workflow_failure" | "credential_expiry" | "ai_spike";
  service: string;
  title: string;
  severity: Severity;
  description: string;
  affected: string[];
  relatedWorkflows: string[];
  retries: number;
  recovery: string[];
  remediation: string;
  auditRefs: string[];
  deploymentRefs: string[];
}

/* ─────────── Mock Data ─────────── */

const KPIS = [
  { label: "Events / min", value: "12,847", delta: "+4.2%", Icon: Zap },
  { label: "Avg Workflow Latency", value: "284 ms", delta: "-6 ms", Icon: Clock },
  { label: "Queue Throughput", value: "8,920/m", delta: "+2.1%", Icon: TrendingUp },
  { label: "Error Rate", value: "0.42%", delta: "+0.08%", Icon: AlertTriangle },
  { label: "Retry Volume", value: "318", delta: "+12", Icon: RefreshCw },
  { label: "Workflow Success", value: "99.21%", delta: "-0.06%", Icon: CheckCircle2 },
  { label: "API Response", value: "118 ms", delta: "stable", Icon: Gauge },
  { label: "Active Streams", value: "47", delta: "+3", Icon: Activity },
];

const SERVICES: ServiceCard[] = [
  { id: "webhook", name: "Webhook Engine", Icon: Activity, status: "healthy", throughput: "4.2k/m", latencyMs: 86, errorPct: 0.21, queueDepth: 14, lastIncident: "11d ago" },
  { id: "workflow", name: "Workflow Engine", Icon: Workflow, status: "degraded", throughput: "1.8k/m", latencyMs: 412, errorPct: 1.18, queueDepth: 187, lastIncident: "32m ago" },
  { id: "queue", name: "Queue Processor", Icon: ListChecks, status: "healthy", throughput: "8.9k/m", latencyMs: 42, errorPct: 0.08, queueDepth: 56, lastIncident: "4d ago" },
  { id: "ai", name: "AI Orchestration", Icon: Brain, status: "healthy", throughput: "612/m", latencyMs: 1842, errorPct: 0.32, queueDepth: 8, lastIncident: "2d ago" },
  { id: "creds", name: "Credential Validation", Icon: KeyRound, status: "healthy", throughput: "240/m", latencyMs: 64, errorPct: 0.04, queueDepth: 0, lastIncident: "18d ago" },
  { id: "mapping", name: "Mapping Engine", Icon: ArrowRightLeft, status: "healthy", throughput: "3.1k/m", latencyMs: 38, errorPct: 0.12, queueDepth: 2, lastIncident: "7d ago" },
  { id: "notify", name: "Notification Service", Icon: Bell, status: "degraded", throughput: "920/m", latencyMs: 312, errorPct: 0.94, queueDepth: 43, lastIncident: "1h ago" },
  { id: "deploy", name: "Deployment Service", Icon: Rocket, status: "healthy", throughput: "12/h", latencyMs: 0, errorPct: 0, queueDepth: 0, lastIncident: "9d ago" },
  { id: "approval", name: "Approval Service", Icon: ShieldCheck, status: "healthy", throughput: "38/h", latencyMs: 92, errorPct: 0.0, queueDepth: 1, lastIncident: "21d ago" },
];

const WORKFLOWS: WorkflowRow[] = [
  { id: "wf-001", name: "Lead Intake → CRM Sync", avgRuntimeMs: 412, successRate: 99.4, failureRate: 0.6, retries: 38, queueDelayMs: 84, slowestStep: "CRM Upsert" },
  { id: "wf-002", name: "Estimate → Esign Dispatch", avgRuntimeMs: 1820, successRate: 98.1, failureRate: 1.9, retries: 71, queueDelayMs: 142, slowestStep: "PDF Render" },
  { id: "wf-003", name: "Carrier Vetting Sync", avgRuntimeMs: 2410, successRate: 96.8, failureRate: 3.2, retries: 124, queueDelayMs: 318, slowestStep: "FMCSA Scrape" },
  { id: "wf-004", name: "Deal Stage Webhook Fanout", avgRuntimeMs: 184, successRate: 99.8, failureRate: 0.2, retries: 12, queueDelayMs: 22, slowestStep: "Slack Notify" },
  { id: "wf-005", name: "AI Move Estimate", avgRuntimeMs: 1640, successRate: 99.2, failureRate: 0.8, retries: 18, queueDelayMs: 64, slowestStep: "Gemini Inference" },
  { id: "wf-006", name: "Inventory → Quote Recalc", avgRuntimeMs: 296, successRate: 99.6, failureRate: 0.4, retries: 9, queueDelayMs: 18, slowestStep: "Pricing Engine" },
];

const BOTTLENECKS: { title: string; rows: BottleneckRow[] }[] = [
  {
    title: "Slowest Integrations",
    rows: [
      { label: "FMCSA Scraper", value: "2,410 ms", delta: "+212 ms" },
      { label: "Granot API", value: "1,124 ms", delta: "+48 ms" },
      { label: "Resend Email", value: "642 ms", delta: "stable" },
    ],
  },
  {
    title: "Largest Queue Bottlenecks",
    rows: [
      { label: "workflow.execute", value: "187 jobs", delta: "+62" },
      { label: "notify.dispatch", value: "43 jobs", delta: "+18" },
      { label: "credential.verify", value: "11 jobs", delta: "-3" },
    ],
  },
  {
    title: "Most Retried Workflows",
    rows: [
      { label: "Carrier Vetting Sync", value: "124 retries", delta: "+22" },
      { label: "Estimate → Esign", value: "71 retries", delta: "+9" },
      { label: "Lead Intake", value: "38 retries", delta: "+4" },
    ],
  },
  {
    title: "Highest Latency Services",
    rows: [
      { label: "AI Orchestration", value: "1,842 ms", delta: "+114 ms" },
      { label: "Workflow Engine", value: "412 ms", delta: "+86 ms" },
      { label: "Notification Service", value: "312 ms", delta: "+58 ms" },
    ],
  },
  {
    title: "Most Failure-Prone Events",
    rows: [
      { label: "carrier.fmcsa.fetch", value: "3.2% fail", delta: "+0.8%" },
      { label: "esign.pdf.render", value: "1.9% fail", delta: "+0.3%" },
      { label: "notify.sms.send", value: "0.94% fail", delta: "+0.2%" },
    ],
  },
  {
    title: "Dependency Failures",
    rows: [
      { label: "FMCSA upstream", value: "4 incidents", delta: "24h" },
      { label: "Twilio SMS API", value: "1 incident", delta: "24h" },
      { label: "Gemini Gateway", value: "2 incidents", delta: "24h" },
    ],
  },
];

const TIMELINE: TimelineEvent[] = [
  {
    id: "evt-001",
    ts: "2 min ago",
    type: "queue_spike",
    service: "Workflow Engine",
    title: "Queue depth exceeded 150 jobs",
    severity: "warning",
    description: "Workflow execution queue spiked to 187 jobs after carrier vetting batch was triggered manually.",
    affected: ["Workflow Engine", "Queue Processor"],
    relatedWorkflows: ["Carrier Vetting Sync", "Lead Intake → CRM Sync"],
    retries: 22,
    recovery: ["Auto-scaled worker pool", "Throttled vetting batch"],
    remediation: "Add queue depth alert at 100 jobs and pre-warm workers during peak hours.",
    auditRefs: ["audit-9821", "audit-9824"],
    deploymentRefs: [],
  },
  {
    id: "evt-002",
    ts: "32 min ago",
    type: "degradation",
    service: "Workflow Engine",
    title: "Workflow latency degraded above 400ms",
    severity: "critical",
    description: "P95 workflow latency crossed 400ms threshold. Slowest step: PDF Render in Estimate → Esign.",
    affected: ["Workflow Engine", "AI Orchestration"],
    relatedWorkflows: ["Estimate → Esign Dispatch"],
    retries: 9,
    recovery: ["Restarted PDF render worker", "Cleared template cache"],
    remediation: "Move PDF render to dedicated worker pool; cache rendered headers.",
    auditRefs: ["audit-9810"],
    deploymentRefs: ["dep-2410"],
  },
  {
    id: "evt-003",
    ts: "1 h ago",
    type: "deployment",
    service: "Notification Service",
    title: "Notification rule deployment v2.18.0",
    severity: "info",
    description: "Released new alert rules for credential expiration and queue backlog thresholds.",
    affected: ["Notification Service"],
    relatedWorkflows: [],
    retries: 0,
    recovery: ["Validated rule parsing", "Smoke-tested 4 sample alerts"],
    remediation: "Monitor false-positive rate over next 24h.",
    auditRefs: ["audit-9805"],
    deploymentRefs: ["dep-2418"],
  },
  {
    id: "evt-004",
    ts: "3 h ago",
    type: "workflow_failure",
    service: "Carrier Vetting",
    title: "FMCSA scrape failure surge",
    severity: "warning",
    description: "Upstream FMCSA endpoint returned 503 for 8 minutes. 124 retries triggered.",
    affected: ["Mapping Engine", "Workflow Engine"],
    relatedWorkflows: ["Carrier Vetting Sync"],
    retries: 124,
    recovery: ["Backoff applied", "Fallback to cached carrier data"],
    remediation: "Implement circuit breaker on FMCSA scraper after 5 consecutive failures.",
    auditRefs: ["audit-9788"],
    deploymentRefs: [],
  },
  {
    id: "evt-005",
    ts: "5 h ago",
    type: "credential_expiry",
    service: "Credential Validation",
    title: "Twilio API key expires in 7 days",
    severity: "warning",
    description: "Outbound SMS credentials approaching expiration window.",
    affected: ["Notification Service"],
    relatedWorkflows: ["Deal Stage Webhook Fanout"],
    retries: 0,
    recovery: ["Notified owner", "Created rotation task"],
    remediation: "Rotate credential before expiry; schedule auto-rotation policy.",
    auditRefs: ["audit-9742"],
    deploymentRefs: [],
  },
  {
    id: "evt-006",
    ts: "8 h ago",
    type: "ai_spike",
    service: "AI Orchestration",
    title: "Gemini inference volume spike",
    severity: "info",
    description: "AI Move Estimate volume increased 3.2× during morning peak. Latency stayed within SLO.",
    affected: ["AI Orchestration"],
    relatedWorkflows: ["AI Move Estimate"],
    retries: 4,
    recovery: ["Auto-scaled inference pool"],
    remediation: "No action required; tracking ongoing baseline shift.",
    auditRefs: [],
    deploymentRefs: [],
  },
];

const DEPENDENCY_CHAIN = [
  { label: "Integrations", Icon: Plug, status: "healthy" as SvcStatus },
  { label: "Queue", Icon: ListChecks, status: "healthy" as SvcStatus },
  { label: "Workflow Engine", Icon: Workflow, status: "degraded" as SvcStatus },
  { label: "AI Orchestration", Icon: Brain, status: "healthy" as SvcStatus },
  { label: "CRM / External", Icon: ArrowRight, status: "healthy" as SvcStatus },
];

/* ─────────── Visual helpers ─────────── */

const STATUS_STYLES: Record<SvcStatus, string> = {
  healthy: "text-[#16A34A] bg-[#f0fdf4] border-[#bbf7d0]",
  degraded: "text-[#b45309] bg-[#fffbeb] border-[#fde68a]",
  down: "text-[#b91c1c] bg-[#fef2f2] border-[#fecaca]",
};

const SEVERITY_STYLES: Record<Severity, string> = {
  info: "text-[#1e40af] bg-[#eff6ff] border-[#bfdbfe]",
  warning: "text-[#b45309] bg-[#fffbeb] border-[#fde68a]",
  critical: "text-[#b91c1c] bg-[#fef2f2] border-[#fecaca]",
};

const TYPE_LABEL: Record<TimelineEvent["type"], string> = {
  degradation: "Service Degradation",
  queue_spike: "Queue Spike",
  deployment: "Deployment",
  workflow_failure: "Workflow Failure",
  credential_expiry: "Credential Expiry",
  ai_spike: "AI Execution Spike",
};

/* ─────────── Component ─────────── */

export default function AdminHyperMCPObservability() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TimelineEvent | null>(null);

  const filteredWorkflows = useMemo(() => {
    if (!search) return WORKFLOWS;
    const q = search.toLowerCase();
    return WORKFLOWS.filter((w) => w.name.toLowerCase().includes(q));
  }, [search]);

  return (
    <HyperMCPShell breadcrumb="Observability">
      <div className="p-5 space-y-5 bg-[#f8fafc] min-h-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-[#0f172a] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#16A34A]" />
              Observability
            </h1>
            <p className="text-xs text-[#64748b] mt-0.5">
              Monitor orchestration reliability, latency, throughput, bottlenecks, and operational behavior.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toast.success("Diagnostics started")}>
              <Play className="w-3.5 h-3.5 mr-1.5" /> Run Diagnostics
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toast.success("Metrics export queued")}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export Metrics
            </Button>
            <Button size="sm" className="h-8 text-xs bg-[#1A365D] hover:bg-[#1A365D]/90" onClick={() => toast.success("Streams refreshed")}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Streams
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2.5">
          {KPIS.map((k) => {
            const Icon = k.Icon;
            return (
              <Card key={k.label} className="p-3 border-[#e2e8f0] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between text-[10px] text-[#64748b] uppercase tracking-wider">
                  <span className="truncate">{k.label}</span>
                  <Icon className="w-3 h-3 text-[#94a3b8]" />
                </div>
                <div className="mt-1.5 text-base font-semibold text-[#0f172a]">{k.value}</div>
                <div className="text-[10px] text-[#64748b] mt-0.5">{k.delta}</div>
              </Card>
            );
          })}
        </div>

        {/* Service Performance Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">Service Performance</h2>
            <span className="text-[10px] text-[#94a3b8]">9 services monitored</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {SERVICES.map((s) => {
              const Icon = s.Icon;
              return (
                <Card key={s.id} className="p-3 border-[#e2e8f0] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-[#475569]" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#0f172a]">{s.name}</div>
                        <div className="text-[10px] text-[#94a3b8]">Last incident · {s.lastIncident}</div>
                      </div>
                    </div>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase", STATUS_STYLES[s.status])}>
                      {s.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#f1f5f9]">
                    <Metric label="Tput" value={s.throughput} />
                    <Metric label="Latency" value={`${s.latencyMs}ms`} />
                    <Metric label="Err" value={`${s.errorPct}%`} warn={s.errorPct > 0.5} />
                    <Metric label="Queue" value={`${s.queueDepth}`} warn={s.queueDepth > 100} />
                  </div>
                  <div className="mt-2.5 flex justify-end">
                    <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#1A365D]" onClick={() => toast.info(`Opening ${s.name} metrics`)}>
                      View Metrics <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Workflow Performance Table */}
        <Card className="border-[#e2e8f0] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between p-3 border-b border-[#e2e8f0]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">Workflow Performance</h2>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workflows..."
                className="h-7 pl-7 text-xs"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#f8fafc] text-[10px] uppercase tracking-wider text-[#64748b]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Workflow</th>
                  <th className="text-right px-3 py-2 font-medium">Avg Runtime</th>
                  <th className="text-right px-3 py-2 font-medium">Success</th>
                  <th className="text-right px-3 py-2 font-medium">Failure</th>
                  <th className="text-right px-3 py-2 font-medium">Retries</th>
                  <th className="text-right px-3 py-2 font-medium">Queue Delay</th>
                  <th className="text-left px-3 py-2 font-medium">Slowest Step</th>
                  <th className="text-right px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkflows.map((w) => (
                  <tr key={w.id} className="border-t border-[#f1f5f9] hover:bg-[#f8fafc]">
                    <td className="px-3 py-2 font-medium text-[#0f172a]">{w.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#0f172a]">{w.avgRuntimeMs.toLocaleString()} ms</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#16A34A]">{w.successRate}%</td>
                    <td className={cn("px-3 py-2 text-right tabular-nums", w.failureRate > 2 ? "text-[#b91c1c]" : "text-[#475569]")}>{w.failureRate}%</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#475569]">{w.retries}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#475569]">{w.queueDelayMs} ms</td>
                    <td className="px-3 py-2 text-[#64748b]">{w.slowestStep}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" className="h-6 text-[11px] text-[#1A365D]" onClick={() => toast.info(`Opening ${w.name} traces`)}>
                        Traces
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottleneck Analysis */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#475569] mb-2">Bottleneck Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {BOTTLENECKS.map((b) => (
              <Card key={b.title} className="p-3 border-[#e2e8f0] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-semibold text-[#0f172a] mb-2">{b.title}</div>
                <div className="space-y-1.5">
                  {b.rows.map((r) => (
                    <div key={r.label} className="flex items-center justify-between text-xs py-1 border-b border-[#f1f5f9] last:border-0">
                      <span className="text-[#475569] truncate pr-2">{r.label}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="tabular-nums font-medium text-[#0f172a]">{r.value}</span>
                        <span className="text-[10px] text-[#94a3b8]">{r.delta}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Timeline & Event Correlation */}
        <Card className="border-[#e2e8f0] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between p-3 border-b border-[#e2e8f0]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">Timeline & Event Correlation</h2>
            <span className="text-[10px] text-[#94a3b8]">Last 24 hours</span>
          </div>
          <div className="p-3">
            <div className="relative pl-4 border-l border-[#e2e8f0] space-y-3">
              {TIMELINE.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className="block w-full text-left relative group"
                >
                  <span className={cn(
                    "absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                    e.severity === "critical" ? "bg-[#dc2626]" : e.severity === "warning" ? "bg-[#d97706]" : "bg-[#2563eb]",
                  )} />
                  <div className="rounded border border-[#e2e8f0] bg-white p-2.5 hover:border-[#16A34A] hover:bg-[#f0fdf4]/40 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase shrink-0", SEVERITY_STYLES[e.severity])}>
                          {e.severity}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-[#64748b] shrink-0">{TYPE_LABEL[e.type]}</span>
                        <span className="text-xs font-medium text-[#0f172a] truncate">{e.title}</span>
                      </div>
                      <span className="text-[10px] text-[#94a3b8] shrink-0">{e.ts}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-[#64748b]">{e.service} · {e.affected.length} affected</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Dependency Visualization */}
        <Card className="border-[#e2e8f0] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="p-3 border-b border-[#e2e8f0]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">Dependency Map</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {DEPENDENCY_CHAIN.map((d, i) => {
                const Icon = d.Icon;
                return (
                  <div key={d.label} className="flex items-center gap-2">
                    <div className={cn(
                      "px-3 py-2 rounded-md border bg-white flex items-center gap-2 min-w-[150px]",
                      d.status === "degraded" ? "border-[#fde68a] bg-[#fffbeb]" : "border-[#e2e8f0]",
                    )}>
                      <Icon className="w-3.5 h-3.5 text-[#475569]" />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-[#0f172a]">{d.label}</div>
                        <div className={cn("text-[10px] uppercase tracking-wider mt-0.5",
                          d.status === "degraded" ? "text-[#b45309]" : "text-[#16A34A]"
                        )}>
                          {d.status}
                        </div>
                      </div>
                    </div>
                    {i < DEPENDENCY_CHAIN.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-[#cbd5e1] shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-[11px] text-[#64748b]">
              Flow: Inbound integrations land in the queue, are picked up by the workflow engine, fan out to AI orchestration when needed, and write back to CRM and external systems.
            </div>
          </div>
        </Card>
      </div>

      {/* Incident Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase", SEVERITY_STYLES[selected.severity])}>
                    {selected.severity}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[#64748b]">{TYPE_LABEL[selected.type]}</span>
                </div>
                <SheetTitle className="text-base">{selected.title}</SheetTitle>
                <SheetDescription className="text-xs">
                  {selected.service} · {selected.ts}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                <Section title="Description">
                  <p className="text-xs text-[#475569] leading-relaxed">{selected.description}</p>
                </Section>

                <Section title="Affected Systems">
                  <ChipList items={selected.affected} />
                </Section>

                <Section title="Related Workflows">
                  {selected.relatedWorkflows.length > 0 ? (
                    <ChipList items={selected.relatedWorkflows} />
                  ) : (
                    <span className="text-[11px] text-[#94a3b8]">No workflows directly affected.</span>
                  )}
                </Section>

                <div className="grid grid-cols-2 gap-3">
                  <StatBlock label="Retry Attempts" value={selected.retries.toString()} Icon={RefreshCw} />
                  <StatBlock label="Recovery Steps" value={selected.recovery.length.toString()} Icon={CheckCircle2} />
                </div>

                <Section title="Recovery Actions">
                  <ul className="space-y-1">
                    {selected.recovery.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-xs text-[#475569]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] mt-0.5 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title="Suggested Remediation">
                  <div className="text-xs text-[#475569] bg-[#f8fafc] border border-[#e2e8f0] rounded p-2.5 leading-relaxed">
                    {selected.remediation}
                  </div>
                </Section>

                <Section title="Related Audit Logs">
                  {selected.auditRefs.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.auditRefs.map((a) => (
                        <span key={a} className="text-[11px] px-1.5 py-0.5 rounded border border-[#e2e8f0] bg-white font-mono text-[#475569]">
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#94a3b8]">No related audit logs.</span>
                  )}
                </Section>

                <Section title="Related Deployments">
                  {selected.deploymentRefs.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.deploymentRefs.map((d) => (
                        <span key={d} className="text-[11px] px-1.5 py-0.5 rounded border border-[#e2e8f0] bg-white font-mono text-[#475569]">
                          {d}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#94a3b8]">No related deployments.</span>
                  )}
                </Section>

                <div className="flex items-center gap-2 pt-2 border-t border-[#e2e8f0]">
                  <Button size="sm" className="h-8 text-xs bg-[#1A365D] hover:bg-[#1A365D]/90" onClick={() => toast.success("Incident acknowledged")}>
                    Acknowledge
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toast.info("Opening runbook")}>
                    Open Runbook
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => toast.info("Escalated to on-call")}>
                    Escalate
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}

/* ─────────── Subcomponents ─────────── */

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-[#94a3b8]">{label}</div>
      <div className={cn("text-xs font-semibold tabular-nums mt-0.5", warn ? "text-[#b45309]" : "text-[#0f172a]")}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#64748b] font-semibold mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className="text-[11px] px-2 py-0.5 rounded-full border border-[#e2e8f0] bg-[#f8fafc] text-[#475569]">
          {i}
        </span>
      ))}
    </div>
  );
}

function StatBlock({ label, value, Icon }: { label: string; value: string; Icon: typeof Activity }) {
  return (
    <div className="rounded border border-[#e2e8f0] p-2.5 bg-[#f8fafc]">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#64748b]">
        <span>{label}</span>
        <Icon className="w-3 h-3 text-[#94a3b8]" />
      </div>
      <div className="text-base font-semibold text-[#0f172a] mt-1 tabular-nums">{value}</div>
    </div>
  );
}
