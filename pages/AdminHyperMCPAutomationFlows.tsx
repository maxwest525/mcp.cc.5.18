import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import OperationalContext from "@/components/hypermcp/OperationalContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, Workflow, PlayCircle, PauseCircle, ScrollText, FlaskConical,
  ChevronRight, CheckCircle2, AlertTriangle, XCircle, Clock, Zap, Search,
  Plus, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FlowStatus = "active" | "paused" | "error" | "draft";

interface FlowExecution {
  id: string;
  ts: string;
  status: "success" | "failed" | "retried";
  durationMs: number;
  message?: string;
}

interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  source: string;
  destination: string;
  trigger: string;
  status: FlowStatus;
  active: boolean;
  lastRun: string;
  successRate: number; // 0-100
  avgExecMs: number;
  totalRuns: number;
  systems: string[]; // pipeline nodes
  triggerConditions: string[];
  payloadExample: Record<string, unknown>;
  recentExecutions: FlowExecution[];
  failures: FlowExecution[];
  retryQueue: { id: string; attempts: number; nextRetry: string; reason: string }[];
}

const FLOWS: AutomationFlow[] = [
  {
    id: "f1",
    name: "Meta Lead → CRM",
    description: "Ingest Meta Lead Ads form submissions, normalize, and create CRM lead.",
    source: "Meta Ads",
    destination: "CRM",
    trigger: "leadgen.webhook",
    status: "active",
    active: true,
    lastRun: "42s ago",
    successRate: 98.4,
    avgExecMs: 412,
    totalRuns: 12480,
    systems: ["Meta Ads", "Webhook", "Hyper MCP", "CRM"],
    triggerConditions: [
      "form_id ∈ {Quote-Form-A, Quote-Form-B}",
      "page_id = 1029384756",
      "field 'phone' present",
    ],
    payloadExample: {
      event: "leadgen",
      form_id: "Quote-Form-A",
      created_time: "2026-05-14T11:42:18Z",
      field_data: [
        { name: "full_name", value: "Jane Doe" },
        { name: "phone", value: "+15551234567" },
        { name: "moving_date", value: "2026-06-12" },
      ],
    },
    recentExecutions: [
      { id: "e1", ts: "42s ago", status: "success", durationMs: 388 },
      { id: "e2", ts: "2m ago", status: "success", durationMs: 412 },
      { id: "e3", ts: "5m ago", status: "retried", durationMs: 1102, message: "CRM 502, retried OK" },
      { id: "e4", ts: "9m ago", status: "success", durationMs: 401 },
    ],
    failures: [
      { id: "x1", ts: "3h ago", status: "failed", durationMs: 8120, message: "CRM gateway timeout" },
    ],
    retryQueue: [
      { id: "r1", attempts: 2, nextRetry: "in 1m", reason: "CRM 502 Bad Gateway" },
    ],
  },
  {
    id: "f2",
    name: "CRM Lead → Granot",
    description: "Push qualified CRM leads to Granot for dispatch and survey scheduling.",
    source: "CRM",
    destination: "Granot",
    trigger: "lead.qualified",
    status: "active",
    active: true,
    lastRun: "3m ago",
    successRate: 96.1,
    avgExecMs: 684,
    totalRuns: 5421,
    systems: ["CRM", "Hyper MCP", "Granot"],
    triggerConditions: [
      "stage = 'qualified'",
      "deposit_collected = true OR estimate_signed = true",
    ],
    payloadExample: {
      lead_id: "L-3091",
      stage: "qualified",
      origin: { city: "Miami", zip: "33101" },
      destination: { city: "Atlanta", zip: "30303" },
      cubic_feet: 720,
    },
    recentExecutions: [
      { id: "e1", ts: "3m ago", status: "success", durationMs: 642 },
      { id: "e2", ts: "12m ago", status: "success", durationMs: 701 },
      { id: "e3", ts: "28m ago", status: "failed", durationMs: 9000, message: "Granot 401 Unauthorized" },
    ],
    failures: [
      { id: "x1", ts: "28m ago", status: "failed", durationMs: 9000, message: "Granot 401 Unauthorized" },
    ],
    retryQueue: [],
  },
  {
    id: "f3",
    name: "CRM Status Change → SMS",
    description: "Trigger customer SMS notifications on key CRM status transitions.",
    source: "CRM",
    destination: "Twilio",
    trigger: "deal.stage_changed",
    status: "active",
    active: true,
    lastRun: "18s ago",
    successRate: 99.2,
    avgExecMs: 218,
    totalRuns: 22418,
    systems: ["CRM", "Hyper MCP", "Twilio", "Customer"],
    triggerConditions: [
      "stage ∈ {booked, dispatched, completed}",
      "customer.sms_opt_in = true",
    ],
    payloadExample: {
      deal_id: "D-8821",
      stage: "dispatched",
      customer_phone: "+15557894561",
      template: "dispatched_v3",
    },
    recentExecutions: [
      { id: "e1", ts: "18s ago", status: "success", durationMs: 201 },
      { id: "e2", ts: "1m ago", status: "success", durationMs: 234 },
    ],
    failures: [],
    retryQueue: [],
  },
  {
    id: "f4",
    name: "Missed Call → Callback Workflow",
    description: "Detect missed inbound calls and queue agent callback within SLA.",
    source: "RingCentral",
    destination: "CRM",
    trigger: "call.missed",
    status: "active",
    active: true,
    lastRun: "6m ago",
    successRate: 97.8,
    avgExecMs: 312,
    totalRuns: 1842,
    systems: ["RingCentral", "Hyper MCP", "CRM", "Agent Queue"],
    triggerConditions: [
      "call.direction = 'inbound'",
      "call.duration = 0",
      "business_hours = true",
    ],
    payloadExample: {
      call_id: "C-44218",
      from: "+15553334444",
      to: "+18007770000",
      ts: "2026-05-14T11:36:02Z",
    },
    recentExecutions: [
      { id: "e1", ts: "6m ago", status: "success", durationMs: 298 },
      { id: "e2", ts: "21m ago", status: "success", durationMs: 322 },
    ],
    failures: [],
    retryQueue: [],
  },
  {
    id: "f5",
    name: "SearchAtlas Alert → Marketing Queue",
    description: "Forward SEO alerts and ranking drops to marketing review queue.",
    source: "SearchAtlas",
    destination: "Marketing Queue",
    trigger: "seo.alert",
    status: "paused",
    active: false,
    lastRun: "2 d ago",
    successRate: 92.0,
    avgExecMs: 540,
    totalRuns: 312,
    systems: ["SearchAtlas", "Hyper MCP", "Marketing Queue"],
    triggerConditions: [
      "alert.severity ∈ {high, critical}",
      "domain = 'trumoveinc.com'",
    ],
    payloadExample: {
      alert_id: "A-901",
      keyword: "long distance movers",
      change: -8,
      severity: "high",
    },
    recentExecutions: [
      { id: "e1", ts: "2 d ago", status: "success", durationMs: 511 },
    ],
    failures: [],
    retryQueue: [],
  },
  {
    id: "f6",
    name: "Convoso Call Result → CRM Update",
    description: "Sync Convoso disposition codes back into CRM lead lifecycle.",
    source: "Convoso",
    destination: "CRM",
    trigger: "call.disposition",
    status: "active",
    active: true,
    lastRun: "Just now",
    successRate: 99.6,
    avgExecMs: 188,
    totalRuns: 31204,
    systems: ["Convoso", "Hyper MCP", "CRM"],
    triggerConditions: [
      "disposition ∈ ['SALE', 'CALLBACK', 'NOT_INTERESTED', 'DNC']",
    ],
    payloadExample: {
      call_id: "CV-99281",
      lead_id: "L-3098",
      disposition: "CALLBACK",
      callback_at: "2026-05-15T15:00:00Z",
      agent: "agent_22",
    },
    recentExecutions: [
      { id: "e1", ts: "Just now", status: "success", durationMs: 174 },
      { id: "e2", ts: "1m ago", status: "success", durationMs: 192 },
    ],
    failures: [],
    retryQueue: [],
  },
  {
    id: "f7",
    name: "Webhook Retry Queue",
    description: "Centralized retry handler for failed outbound webhooks across all flows.",
    source: "Hyper MCP",
    destination: "Multiple",
    trigger: "webhook.failed",
    status: "error",
    active: true,
    lastRun: "1m ago",
    successRate: 84.3,
    avgExecMs: 1240,
    totalRuns: 942,
    systems: ["Hyper MCP", "Retry Worker", "Destination"],
    triggerConditions: [
      "previous_attempt.status_code ∈ [408, 429, 500, 502, 503, 504]",
      "attempts < 5",
    ],
    payloadExample: {
      original_event_id: "E-77182",
      destination: "Granot",
      attempt: 3,
      next_backoff_seconds: 60,
    },
    recentExecutions: [
      { id: "e1", ts: "1m ago", status: "failed", durationMs: 9012, message: "Destination still 502" },
      { id: "e2", ts: "3m ago", status: "retried", durationMs: 1418 },
      { id: "e3", ts: "5m ago", status: "success", durationMs: 612 },
    ],
    failures: [
      { id: "x1", ts: "1m ago", status: "failed", durationMs: 9012, message: "Granot 502" },
      { id: "x2", ts: "14m ago", status: "failed", durationMs: 8800, message: "Meta API 500" },
    ],
    retryQueue: [
      { id: "r1", attempts: 3, nextRetry: "in 1m", reason: "Granot 502" },
      { id: "r2", attempts: 2, nextRetry: "in 4m", reason: "Twilio 429" },
      { id: "r3", attempts: 1, nextRetry: "in 12m", reason: "CRM timeout" },
    ],
  },
  {
    id: "f8",
    name: "Carrier Assignment Workflow",
    description: "Match qualified jobs to vetted carriers based on lane, capacity and rating.",
    source: "CRM",
    destination: "Carrier Network",
    trigger: "deal.ready_for_dispatch",
    status: "active",
    active: true,
    lastRun: "11m ago",
    successRate: 94.7,
    avgExecMs: 1820,
    totalRuns: 1188,
    systems: ["CRM", "Hyper MCP", "Carrier Match", "Carrier Network"],
    triggerConditions: [
      "deal.stage = 'ready_for_dispatch'",
      "carrier.rating ≥ 4.2",
      "carrier.capacity_available = true",
    ],
    payloadExample: {
      deal_id: "D-8842",
      origin_zip: "33101",
      destination_zip: "30303",
      cubic_feet: 720,
      pickup_window: ["2026-06-12", "2026-06-13"],
    },
    recentExecutions: [
      { id: "e1", ts: "11m ago", status: "success", durationMs: 1742 },
      { id: "e2", ts: "44m ago", status: "success", durationMs: 1981 },
      { id: "e3", ts: "1 hr ago", status: "retried", durationMs: 3801, message: "First carrier declined" },
    ],
    failures: [],
    retryQueue: [],
  },
];

function statusBadge(status: FlowStatus) {
  const map: Record<FlowStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    active:  { label: "Active",  cls: "text-[#16A34A] bg-[#22C55E]/10 border-[#22C55E]/40", Icon: CheckCircle2 },
    paused:  { label: "Paused",  cls: "text-[#64748B] bg-[#64748B]/10 border-[#64748B]/30", Icon: PauseCircle },
    error:   { label: "Error",   cls: "text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/40", Icon: AlertTriangle },
    draft:   { label: "Draft",   cls: "text-[#0B1624] bg-[#0B1624]/5 border-[#0B1624]/15", Icon: Clock },
  };
  const m = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border", m.cls)}>
      <m.Icon className="w-3 h-3" /> {m.label}
    </span>
  );
}

function execIcon(s: FlowExecution["status"]) {
  if (s === "success") return <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />;
  if (s === "failed") return <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />;
  return <ArrowRight className="w-3.5 h-3.5 text-[#D97706]" />;
}

function FlowDiagram({ nodes }: { nodes: string[] }) {
  return (
    <div className="flex items-center flex-wrap gap-1.5">
      {nodes.map((n, i) => (
        <div key={`${n}-${i}`} className="flex items-center gap-1.5">
          <span className="inline-flex items-center text-[11px] font-medium text-[#0B1624] bg-[#F1F5F9] border border-[rgba(15,23,42,0.10)] rounded px-2 py-1">
            {n}
          </span>
          {i < nodes.length - 1 && (
            <ChevronRight className="w-3.5 h-3.5 text-[rgba(11,22,36,0.40)]" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminHyperMCPAutomationFlows() {
  const [flows, setFlows] = useState<AutomationFlow[]>(FLOWS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [openFlowId, setOpenFlowId] = useState<string | null>(null);

  const sources = useMemo(
    () => Array.from(new Set(flows.map((f) => f.source))).sort(),
    [flows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flows.filter((f) => {
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (sourceFilter !== "all" && f.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.trigger.toLowerCase().includes(q) ||
        f.destination.toLowerCase().includes(q)
      );
    });
  }, [flows, search, statusFilter, sourceFilter]);

  const stats = useMemo(() => {
    const total = flows.length;
    const active = flows.filter((f) => f.status === "active" && f.active).length;
    const paused = flows.filter((f) => f.status === "paused" || !f.active).length;
    const errors = flows.filter((f) => f.status === "error").length;
    const avgSuccess = flows.length
      ? (flows.reduce((s, f) => s + f.successRate, 0) / flows.length).toFixed(1)
      : "—";
    const totalRuns = flows.reduce((s, f) => s + f.totalRuns, 0);
    return { total, active, paused, errors, avgSuccess, totalRuns };
  }, [flows]);

  const openFlow = openFlowId ? flows.find((f) => f.id === openFlowId) ?? null : null;

  function toggleActive(id: string, value: boolean) {
    setFlows((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, active: value, status: value ? (f.status === "paused" ? "active" : f.status) : "paused" }
          : f
      )
    );
    toast.success(value ? "Flow resumed" : "Flow paused");
  }

  function pauseFlow(id: string) {
    setFlows((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: false, status: "paused" } : f))
    );
    toast.success("Flow paused");
  }

  function runTest(id: string) {
    const f = flows.find((x) => x.id === id);
    toast.success(`Test execution queued${f ? ` · ${f.name}` : ""}`);
  }

  return (
    <HyperMCPShell>
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0B1624] text-white flex items-center justify-center">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-[#0B1624]">
                    Automation Flows
                  </h1>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[rgba(15,23,42,0.10)] text-[rgba(11,22,36,0.62)] bg-white">
                    Hyper MCP
                  </span>
                </div>
                <p className="text-sm text-[rgba(11,22,36,0.62)] mt-0.5 max-w-2xl">
                  Orchestration pipelines connecting your systems. Monitor triggers, executions, and retry queues.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="bg-transparent border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#EEF2F7]">
                <Link to="/hypermcp"><ArrowLeft className="w-4 h-4 mr-1.5" /> Command Center</Link>
              </Button>
              <Button size="sm" className="bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium">
                <Plus className="w-4 h-4 mr-1.5" /> New Flow
              </Button>
            </div>
          </div>

          <OperationalContext kind="workflow" />

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Flows", value: stats.total },
              { label: "Active", value: stats.active },
              { label: "Paused", value: stats.paused },
              { label: "Errors", value: stats.errors },
              { label: "Avg Success", value: `${stats.avgSuccess}%` },
              { label: "Executions", value: stats.totalRuns.toLocaleString() },
            ].map((s) => (
              <Card key={s.label} className="bg-white border-[rgba(15,23,42,0.06)] rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">{s.label}</div>
                <div className="mt-2 text-xl font-semibold text-[#0B1624] tabular-nums">{s.value}</div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="bg-white border-[rgba(15,23,42,0.06)] rounded-xl p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(11,22,36,0.40)]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search flow name, trigger, destination…"
                  className="pl-9 h-9 bg-white border-[rgba(15,23,42,0.10)] text-[#0B1624]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[140px] bg-white border-[rgba(15,23,42,0.10)] text-[#0B1624]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-9 w-[160px] bg-white border-[rgba(15,23,42,0.10)] text-[#0B1624]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-[rgba(11,22,36,0.62)] ml-auto">
                {filtered.length} of {flows.length}
              </div>
            </div>
          </Card>

          {/* Flow cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((f) => (
              <Card
                key={f.id}
                className="bg-white border-[rgba(15,23,42,0.06)] rounded-xl p-4 hover:border-[rgba(15,23,42,0.12)] transition-colors shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                {/* Top: name + status + toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-[#0B1624] truncate">{f.name}</h3>
                      {statusBadge(f.status)}
                    </div>
                    <p className="text-xs text-[rgba(11,22,36,0.62)] mt-0.5 line-clamp-1">{f.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">
                      {f.active ? "On" : "Off"}
                    </span>
                    <Switch
                      checked={f.active}
                      onCheckedChange={(v) => toggleActive(f.id, v)}
                    />
                  </div>
                </div>

                {/* Diagram */}
                <div className="mt-3 p-3 rounded-lg bg-[#F7F8FA] border border-[rgba(15,23,42,0.06)]">
                  <FlowDiagram nodes={f.systems} />
                </div>

                {/* Meta grid */}
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">Trigger</div>
                    <div className="mt-0.5 font-medium text-[#0B1624] truncate">
                      <Zap className="w-3 h-3 inline mr-1 text-[#D97706]" />{f.trigger}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">Last Run</div>
                    <div className="mt-0.5 font-medium text-[#0B1624]">{f.lastRun}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">Success</div>
                    <div className="mt-0.5 font-medium text-[#0B1624] tabular-nums">{f.successRate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">Avg Exec</div>
                    <div className="mt-0.5 font-medium text-[#0B1624] tabular-nums">{f.avgExecMs} ms</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 pt-3 border-t border-[rgba(15,23,42,0.06)] flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="h-8 bg-transparent border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#EEF2F7]"
                    onClick={() => setOpenFlowId(f.id)}>
                    View Details <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 bg-transparent border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#EEF2F7]"
                    onClick={() => pauseFlow(f.id)} disabled={!f.active}>
                    <PauseCircle className="w-3.5 h-3.5 mr-1" /> Pause
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 bg-transparent border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#EEF2F7]"
                    onClick={() => runTest(f.id)}>
                    <FlaskConical className="w-3.5 h-3.5 mr-1" /> Run Test
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-8 bg-transparent border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#EEF2F7]">
                    <Link to="/hypermcp/webhook-logs"><ScrollText className="w-3.5 h-3.5 mr-1" /> Logs</Link>
                  </Button>
                </div>
              </Card>
            ))}

            {filtered.length === 0 && (
              <Card className="col-span-full bg-white border-[rgba(15,23,42,0.06)] rounded-xl p-10 text-center text-sm text-[rgba(11,22,36,0.62)]">
                No flows match your filters.
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Drawer */}
      <Sheet open={!!openFlow} onOpenChange={(o) => !o && setOpenFlowId(null)}>
        <SheetContent className="w-full sm:max-w-[640px] bg-white text-[#0B1624] border-l border-[rgba(15,23,42,0.08)] overflow-y-auto">
          {openFlow && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-[#0B1624]">{openFlow.name}</SheetTitle>
                  {statusBadge(openFlow.status)}
                </div>
                <SheetDescription className="text-[rgba(11,22,36,0.62)]">
                  {openFlow.description}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 p-3 rounded-lg bg-[#F7F8FA] border border-[rgba(15,23,42,0.06)]">
                <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)] mb-2">Pipeline</div>
                <FlowDiagram nodes={openFlow.systems} />
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-[rgba(15,23,42,0.06)] bg-white">
                  <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">Source</div>
                  <div className="mt-0.5 font-medium">{openFlow.source}</div>
                </div>
                <div className="p-3 rounded-lg border border-[rgba(15,23,42,0.06)] bg-white">
                  <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">Destination</div>
                  <div className="mt-0.5 font-medium">{openFlow.destination}</div>
                </div>
                <div className="p-3 rounded-lg border border-[rgba(15,23,42,0.06)] bg-white">
                  <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">Trigger</div>
                  <div className="mt-0.5 font-medium truncate">{openFlow.trigger}</div>
                </div>
                <div className="p-3 rounded-lg border border-[rgba(15,23,42,0.06)] bg-white">
                  <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">Total Runs</div>
                  <div className="mt-0.5 font-medium tabular-nums">{openFlow.totalRuns.toLocaleString()}</div>
                </div>
              </div>

              <Tabs defaultValue="conditions" className="mt-5">
                <TabsList className="bg-[#F1F5F9] border border-[rgba(15,23,42,0.06)]">
                  <TabsTrigger value="conditions">Conditions</TabsTrigger>
                  <TabsTrigger value="payload">Payload</TabsTrigger>
                  <TabsTrigger value="executions">Executions</TabsTrigger>
                  <TabsTrigger value="failures">Failures</TabsTrigger>
                  <TabsTrigger value="retry">Retry Queue</TabsTrigger>
                </TabsList>

                <TabsContent value="conditions" className="mt-3">
                  <div className="rounded-lg border border-[rgba(15,23,42,0.06)] bg-white divide-y divide-[rgba(15,23,42,0.06)]">
                    {openFlow.triggerConditions.map((c, i) => (
                      <div key={i} className="px-3 py-2 text-xs font-mono text-[#0B1624]">{c}</div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="payload" className="mt-3">
                  <pre className="text-[11px] leading-relaxed bg-[#0B1624] text-[#E2E8F0] rounded-lg p-3 overflow-auto max-h-[320px]">
{JSON.stringify(openFlow.payloadExample, null, 2)}
                  </pre>
                </TabsContent>

                <TabsContent value="executions" className="mt-3">
                  <div className="rounded-lg border border-[rgba(15,23,42,0.06)] bg-white">
                    <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)] border-b border-[rgba(15,23,42,0.06)]">
                      Execution Timeline
                    </div>
                    <div className="divide-y divide-[rgba(15,23,42,0.06)]">
                      {openFlow.recentExecutions.map((e) => (
                        <div key={e.id} className="px-3 py-2 flex items-center gap-3 text-xs">
                          {execIcon(e.status)}
                          <span className="text-[rgba(11,22,36,0.62)] w-20 shrink-0">{e.ts}</span>
                          <span className="font-medium capitalize w-16 shrink-0">{e.status}</span>
                          <span className="tabular-nums text-[rgba(11,22,36,0.62)] w-20 shrink-0">{e.durationMs} ms</span>
                          <span className="truncate text-[rgba(11,22,36,0.62)]">{e.message ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="failures" className="mt-3">
                  {openFlow.failures.length === 0 ? (
                    <div className="rounded-lg border border-[rgba(15,23,42,0.06)] bg-white p-4 text-xs text-[rgba(11,22,36,0.62)]">
                      No recent failures.
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[rgba(15,23,42,0.06)] bg-white divide-y divide-[rgba(15,23,42,0.06)]">
                      {openFlow.failures.map((e) => (
                        <div key={e.id} className="px-3 py-2 flex items-center gap-3 text-xs">
                          <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                          <span className="text-[rgba(11,22,36,0.62)] w-20 shrink-0">{e.ts}</span>
                          <span className="tabular-nums text-[rgba(11,22,36,0.62)] w-20 shrink-0">{e.durationMs} ms</span>
                          <span className="truncate">{e.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="retry" className="mt-3">
                  {openFlow.retryQueue.length === 0 ? (
                    <div className="rounded-lg border border-[rgba(15,23,42,0.06)] bg-white p-4 text-xs text-[rgba(11,22,36,0.62)]">
                      Retry queue empty.
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[rgba(15,23,42,0.06)] bg-white divide-y divide-[rgba(15,23,42,0.06)]">
                      {openFlow.retryQueue.map((r) => (
                        <div key={r.id} className="px-3 py-2 flex items-center gap-3 text-xs">
                          <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                          <span className="font-medium w-24 shrink-0">Attempt {r.attempts}</span>
                          <span className="text-[rgba(11,22,36,0.62)] w-24 shrink-0">{r.nextRetry}</span>
                          <span className="truncate text-[rgba(11,22,36,0.62)]">{r.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="mt-5 flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="h-8 bg-transparent border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#EEF2F7]"
                  onClick={() => runTest(openFlow.id)}>
                  <FlaskConical className="w-3.5 h-3.5 mr-1" /> Run Test
                </Button>
                {openFlow.active ? (
                  <Button size="sm" variant="outline" className="h-8 bg-transparent border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#EEF2F7]"
                    onClick={() => { pauseFlow(openFlow.id); }}>
                    <PauseCircle className="w-3.5 h-3.5 mr-1" /> Pause Flow
                  </Button>
                ) : (
                  <Button size="sm" className="h-8 bg-[#22C55E] hover:bg-[#16A34A] text-white"
                    onClick={() => toggleActive(openFlow.id, true)}>
                    <PlayCircle className="w-3.5 h-3.5 mr-1" /> Resume
                  </Button>
                )}
                <Button asChild size="sm" variant="outline" className="h-8 bg-transparent border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#EEF2F7]">
                  <Link to="/hypermcp/webhook-logs"><ScrollText className="w-3.5 h-3.5 mr-1" /> View Logs</Link>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}
