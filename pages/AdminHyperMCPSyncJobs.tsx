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
  ArrowLeft, RefreshCw, PlayCircle, PauseCircle, RotateCcw, Search,
  CheckCircle2, XCircle, Clock, Loader2, AlertTriangle, MoreHorizontal,
  Activity, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SyncStatus = "running" | "queued" | "completed" | "failed" | "retrying" | "paused";

interface TimelineEvent {
  ts: string;
  label: string;
  level: "info" | "success" | "warn" | "error";
}

interface SyncJob {
  id: string;
  integration: string;
  jobType: string;
  status: SyncStatus;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  recordsProcessed: number;
  retryCount: number;
  triggerSource: string;
  systems: string[];
  errors: { ts: string; message: string }[];
  retryAttempts: { attempt: number; ts: string; result: string }[];
  payload: Record<string, unknown>;
  timeline: TimelineEvent[];
}

const JOBS: SyncJob[] = [
  {
    id: "SJ-10412",
    integration: "Meta Ads",
    jobType: "leadgen.pull",
    status: "running",
    startedAt: "12s ago",
    completedAt: null,
    durationMs: null,
    recordsProcessed: 184,
    retryCount: 0,
    triggerSource: "scheduler:every-1m",
    systems: ["Meta Ads", "Hyper MCP", "CRM"],
    errors: [],
    retryAttempts: [],
    payload: { form_ids: ["Quote-Form-A", "Quote-Form-B"], page_id: "1029384756" },
    timeline: [
      { ts: "12s ago", label: "Job started", level: "info" },
      { ts: "9s ago", label: "Authenticated · token TTL 41m", level: "success" },
      { ts: "4s ago", label: "Streaming page 2/4", level: "info" },
    ],
  },
  {
    id: "SJ-10411",
    integration: "RingCentral",
    jobType: "calls.sync",
    status: "completed",
    startedAt: "2m ago",
    completedAt: "1m ago",
    durationMs: 48210,
    recordsProcessed: 1284,
    retryCount: 0,
    triggerSource: "scheduler:every-5m",
    systems: ["RingCentral", "Hyper MCP", "CRM"],
    errors: [],
    retryAttempts: [],
    payload: { since: "2026-05-14T11:30:00Z" },
    timeline: [
      { ts: "2m ago", label: "Job started", level: "info" },
      { ts: "2m ago", label: "Fetched 1284 call records", level: "info" },
      { ts: "1m ago", label: "Upserted into calls", level: "success" },
      { ts: "1m ago", label: "Job completed", level: "success" },
    ],
  },
  {
    id: "SJ-10410",
    integration: "Granot",
    jobType: "carrier.dispatch",
    status: "failed",
    startedAt: "6m ago",
    completedAt: "5m ago",
    durationMs: 9012,
    recordsProcessed: 0,
    retryCount: 3,
    triggerSource: "event:deal.ready_for_dispatch",
    systems: ["CRM", "Hyper MCP", "Granot"],
    errors: [
      { ts: "5m ago", message: "Granot API responded 502 Bad Gateway" },
      { ts: "5m ago", message: "Final attempt failed after 3 retries" },
    ],
    retryAttempts: [
      { attempt: 1, ts: "5m ago", result: "502 Bad Gateway" },
      { attempt: 2, ts: "5m ago", result: "502 Bad Gateway" },
      { attempt: 3, ts: "5m ago", result: "502 Bad Gateway" },
    ],
    payload: { deal_id: "D-8842", origin_zip: "33101", destination_zip: "30303", cubic_feet: 720 },
    timeline: [
      { ts: "6m ago", label: "Job started", level: "info" },
      { ts: "6m ago", label: "POST /v1/dispatch", level: "info" },
      { ts: "5m ago", label: "Upstream 502 · retrying", level: "warn" },
      { ts: "5m ago", label: "Job failed after 3 attempts", level: "error" },
    ],
  },
  {
    id: "SJ-10409",
    integration: "Twilio",
    jobType: "sms.outbound",
    status: "retrying",
    startedAt: "3m ago",
    completedAt: null,
    durationMs: null,
    recordsProcessed: 42,
    retryCount: 2,
    triggerSource: "event:lead.created",
    systems: ["CRM", "Hyper MCP", "Twilio"],
    errors: [{ ts: "2m ago", message: "Twilio 429 Too Many Requests" }],
    retryAttempts: [
      { attempt: 1, ts: "3m ago", result: "429 throttled" },
      { attempt: 2, ts: "1m ago", result: "in flight" },
    ],
    payload: { template: "welcome_v3", count: 50 },
    timeline: [
      { ts: "3m ago", label: "Job started", level: "info" },
      { ts: "2m ago", label: "Twilio 429 · backing off", level: "warn" },
      { ts: "1m ago", label: "Retry attempt 2/5", level: "info" },
    ],
  },
  {
    id: "SJ-10408",
    integration: "FMCSA",
    jobType: "carrier.vetting",
    status: "queued",
    startedAt: "—",
    completedAt: null,
    durationMs: null,
    recordsProcessed: 0,
    retryCount: 0,
    triggerSource: "scheduler:hourly",
    systems: ["FMCSA", "Hyper MCP"],
    errors: [],
    retryAttempts: [],
    payload: { batch_size: 250 },
    timeline: [{ ts: "queued", label: "Awaiting worker", level: "info" }],
  },
  {
    id: "SJ-10407",
    integration: "Resend",
    jobType: "email.transactional",
    status: "completed",
    startedAt: "12m ago",
    completedAt: "12m ago",
    durationMs: 4120,
    recordsProcessed: 318,
    retryCount: 0,
    triggerSource: "event:esign.sent",
    systems: ["CRM", "Hyper MCP", "Resend"],
    errors: [],
    retryAttempts: [],
    payload: { template: "esign_invite", count: 318 },
    timeline: [
      { ts: "12m ago", label: "Job started", level: "info" },
      { ts: "12m ago", label: "318 emails dispatched", level: "success" },
    ],
  },
  {
    id: "SJ-10406",
    integration: "Google Search Console",
    jobType: "gsc.metrics.pull",
    status: "completed",
    startedAt: "28m ago",
    completedAt: "27m ago",
    durationMs: 61204,
    recordsProcessed: 9842,
    retryCount: 1,
    triggerSource: "scheduler:hourly",
    systems: ["GSC", "Hyper MCP"],
    errors: [],
    retryAttempts: [{ attempt: 1, ts: "28m ago", result: "auth refresh" }],
    payload: { property: "sc-domain:trumoveinc.com", days: 1 },
    timeline: [
      { ts: "28m ago", label: "Job started", level: "info" },
      { ts: "28m ago", label: "Token refreshed", level: "info" },
      { ts: "27m ago", label: "Persisted 9842 rows", level: "success" },
    ],
  },
  {
    id: "SJ-10405",
    integration: "SlickText",
    jobType: "sms.inbound",
    status: "paused",
    startedAt: "—",
    completedAt: null,
    durationMs: null,
    recordsProcessed: 0,
    retryCount: 0,
    triggerSource: "scheduler:every-2m",
    systems: ["SlickText", "Hyper MCP", "CRM"],
    errors: [],
    retryAttempts: [],
    payload: { number: "+18336931695" },
    timeline: [{ ts: "paused", label: "Paused by admin", level: "warn" }],
  },
  {
    id: "SJ-10404",
    integration: "Stripe",
    jobType: "payments.reconcile",
    status: "running",
    startedAt: "40s ago",
    completedAt: null,
    durationMs: null,
    recordsProcessed: 612,
    retryCount: 0,
    triggerSource: "scheduler:every-15m",
    systems: ["Stripe", "Hyper MCP", "CRM"],
    errors: [],
    retryAttempts: [],
    payload: { window: "15m" },
    timeline: [
      { ts: "40s ago", label: "Job started", level: "info" },
      { ts: "20s ago", label: "Reconciling charges", level: "info" },
    ],
  },
  {
    id: "SJ-10403",
    integration: "HubSpot",
    jobType: "contact.sync",
    status: "failed",
    startedAt: "1h ago",
    completedAt: "1h ago",
    durationMs: 12044,
    recordsProcessed: 0,
    retryCount: 5,
    triggerSource: "manual:admin@trumove.com",
    systems: ["HubSpot", "Hyper MCP", "CRM"],
    errors: [{ ts: "1h ago", message: "Invalid OAuth scope: contacts.write" }],
    retryAttempts: [
      { attempt: 1, ts: "1h ago", result: "401 invalid scope" },
      { attempt: 2, ts: "1h ago", result: "401 invalid scope" },
    ],
    payload: { batch: 200 },
    timeline: [
      { ts: "1h ago", label: "Job started", level: "info" },
      { ts: "1h ago", label: "401 Unauthorized", level: "error" },
      { ts: "1h ago", label: "Job failed", level: "error" },
    ],
  },
];

function statusBadge(status: SyncStatus) {
  const map: Record<SyncStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    running:   { label: "Running",   cls: "text-[#1D4ED8] bg-[#3B82F6]/10 border-[#3B82F6]/30", Icon: Loader2 },
    queued:    { label: "Queued",    cls: "text-[#0B1624] bg-[#0B1624]/5 border-[#0B1624]/15", Icon: Clock },
    completed: { label: "Completed", cls: "text-[#16A34A] bg-[#22C55E]/10 border-[#22C55E]/40", Icon: CheckCircle2 },
    failed:    { label: "Failed",    cls: "text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/40", Icon: XCircle },
    retrying:  { label: "Retrying",  cls: "text-[#D97706] bg-[#F59E0B]/10 border-[#F59E0B]/40", Icon: RotateCcw },
    paused:    { label: "Paused",    cls: "text-[#64748B] bg-[#64748B]/10 border-[#64748B]/30", Icon: PauseCircle },
  };
  const m = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap", m.cls)}>
      <m.Icon className={cn("w-3 h-3", status === "running" && "animate-spin")} /> {m.label}
    </span>
  );
}

function fmtDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function tlDot(level: TimelineEvent["level"]) {
  const cls =
    level === "success" ? "bg-[#22C55E]" :
    level === "error" ? "bg-[#DC2626]" :
    level === "warn" ? "bg-[#F59E0B]" :
    "bg-[#64748B]";
  return <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", cls)} />;
}

export default function AdminHyperMCPSyncJobs() {
  const [jobs, setJobs] = useState<SyncJob[]>(JOBS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [integrationFilter, setIntegrationFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [queuePaused, setQueuePaused] = useState(false);

  const integrations = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.integration))).sort(),
    [jobs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (integrationFilter !== "all" && j.integration !== integrationFilter) return false;
      if (!q) return true;
      return (
        j.id.toLowerCase().includes(q) ||
        j.integration.toLowerCase().includes(q) ||
        j.jobType.toLowerCase().includes(q) ||
        j.triggerSource.toLowerCase().includes(q)
      );
    });
  }, [jobs, search, statusFilter, integrationFilter]);

  const stats = useMemo(() => {
    const running = jobs.filter((j) => j.status === "running").length;
    const queued = jobs.filter((j) => j.status === "queued").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const completed = jobs.filter((j) => j.status === "completed").length;
    const retrying = jobs.filter((j) => j.status === "retrying").length;
    const durations = jobs.filter((j) => j.durationMs != null).map((j) => j.durationMs!);
    const avgMs = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
    const finished = completed + failed;
    const successRate = finished ? (completed / finished) * 100 : 0;
    return {
      running, queued, failed, completed, retrying,
      avgExec: fmtDuration(avgMs),
      successRate: successRate.toFixed(1),
      queueDepth: queued + retrying,
    };
  }, [jobs]);

  const openJob = openId ? jobs.find((j) => j.id === openId) ?? null : null;

  function runSync() {
    toast.success("Manual sync queued · running on next worker tick");
  }

  function retryFailed() {
    setJobs((prev) =>
      prev.map((j) =>
        j.status === "failed"
          ? { ...j, status: "retrying", retryCount: j.retryCount + 1 }
          : j
      )
    );
    toast.success("All failed jobs requeued for retry");
  }

  function togglePauseQueue() {
    setQueuePaused((v) => !v);
    toast.success(queuePaused ? "Queue resumed" : "Queue paused");
  }

  function retryJob(id: string) {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id ? { ...j, status: "retrying", retryCount: j.retryCount + 1 } : j
      )
    );
    toast.success(`${id} requeued`);
  }

  function cancelJob(id: string) {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id && (j.status === "running" || j.status === "queued" || j.status === "retrying")
          ? { ...j, status: "paused" }
          : j
      )
    );
    toast.success(`${id} cancelled`);
  }

  function requeueJob(id: string) {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: "queued", retryCount: 0 } : j))
    );
    toast.success(`${id} requeued`);
  }

  return (
    <HyperMCPShell>
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0B1624] text-white flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-[#0B1624]">
                    Sync Jobs
                  </h1>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[rgba(15,23,42,0.10)] text-[rgba(11,22,36,0.62)] bg-white">
                    Hyper MCP
                  </span>
                  {queuePaused && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#F59E0B]/40 text-[#D97706] bg-[#F59E0B]/10">
                      Queue Paused
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-[rgba(11,22,36,0.62)] mt-0.5">
                  Monitor scheduled, queued, and live synchronization jobs.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]">
                <Link to="/hypermcp"><ArrowLeft className="w-3.5 h-3.5" /> Back</Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]" onClick={togglePauseQueue}>
                {queuePaused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                {queuePaused ? "Resume Queue" : "Pause Queue"}
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]" onClick={retryFailed}>
                <RotateCcw className="w-3.5 h-3.5" /> Retry Failed
              </Button>
              <Button size="sm" className="h-8 gap-1.5 bg-[#0B1624] hover:bg-[#0B1624]/90 text-white" onClick={runSync}>
                <PlayCircle className="w-3.5 h-3.5" /> Run Sync
              </Button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Running Jobs", value: stats.running, hint: "in flight" },
              { label: "Queued Jobs", value: stats.queued, hint: "awaiting worker" },
              { label: "Failed Jobs", value: stats.failed, hint: "last 24h" },
              { label: "Avg Execution", value: stats.avgExec, hint: "across runs" },
              { label: "Success Rate", value: `${stats.successRate}%`, hint: "completed / finished" },
              { label: "Queue Depth", value: stats.queueDepth, hint: "queued + retrying" },
            ].map((m) => (
              <Card key={m.label} className="p-3 bg-white border-[rgba(15,23,42,0.08)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[rgba(11,22,36,0.55)]">{m.label}</div>
                <div className="text-2xl font-semibold text-[#0B1624] mt-1 tabular-nums">{m.value}</div>
                <div className="text-[11px] text-[rgba(11,22,36,0.50)] mt-0.5">{m.hint}</div>
              </Card>
            ))}
          </div>

          {/* Queue Visualization */}
          <Card className="p-4 bg-white border-[rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0B1624]" />
                <h2 className="text-sm font-semibold text-[#0B1624]">Queue Health</h2>
              </div>
              <span className="text-[11px] text-[rgba(11,22,36,0.55)]">live</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Queued", count: stats.queued, color: "bg-[#94A3B8]", barCls: "bg-[#94A3B8]" },
                { label: "Processing", count: stats.running + stats.retrying, color: "bg-[#3B82F6]", barCls: "bg-[#3B82F6]" },
                { label: "Failed", count: stats.failed, color: "bg-[#DC2626]", barCls: "bg-[#DC2626]" },
                { label: "Completed", count: stats.completed, color: "bg-[#22C55E]", barCls: "bg-[#22C55E]" },
              ].map((s) => {
                const total = jobs.length || 1;
                const pct = Math.round((s.count / total) * 100);
                return (
                  <div key={s.label} className="border border-[rgba(15,23,42,0.08)] rounded-md p-3 bg-[#FAFBFC]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full", s.color)} />
                        <span className="text-[11px] font-medium text-[#0B1624]">{s.label}</span>
                      </div>
                      <span className="text-[11px] tabular-nums text-[rgba(11,22,36,0.62)]">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-[#0B1624]/5 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", s.barCls)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgba(11,22,36,0.40)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search job ID, integration, type, trigger..."
                className="h-8 pl-8 text-[13px] bg-white border-[rgba(15,23,42,0.12)]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[150px] text-[13px] bg-white border-[rgba(15,23,42,0.12)]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="retrying">Retrying</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Select value={integrationFilter} onValueChange={setIntegrationFilter}>
              <SelectTrigger className="h-8 w-[180px] text-[13px] bg-white border-[rgba(15,23,42,0.12)]">
                <SelectValue placeholder="Integration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All integrations</SelectItem>
                {integrations.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[11px] text-[rgba(11,22,36,0.55)] ml-auto">
              {filtered.length} of {jobs.length} jobs
            </span>
          </div>

          {/* Table */}
          <Card className="bg-white border-[rgba(15,23,42,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-[#FAFBFC] border-b border-[rgba(15,23,42,0.08)]">
                  <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-[rgba(11,22,36,0.55)]">
                    <th className="px-3 py-2.5 font-medium">Job ID</th>
                    <th className="px-3 py-2.5 font-medium">Integration</th>
                    <th className="px-3 py-2.5 font-medium">Job Type</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Started</th>
                    <th className="px-3 py-2.5 font-medium">Completed</th>
                    <th className="px-3 py-2.5 font-medium text-right">Records</th>
                    <th className="px-3 py-2.5 font-medium">Duration</th>
                    <th className="px-3 py-2.5 font-medium text-right">Retries</th>
                    <th className="px-3 py-2.5 font-medium">Trigger</th>
                    <th className="px-3 py-2.5 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((j) => (
                    <tr
                      key={j.id}
                      onClick={() => setOpenId(j.id)}
                      className="border-b border-[rgba(15,23,42,0.06)] last:border-b-0 hover:bg-[#FAFBFC] cursor-pointer"
                    >
                      <td className="px-3 py-2.5 font-mono text-[12px] text-[#0B1624]">{j.id}</td>
                      <td className="px-3 py-2.5 text-[#0B1624]">{j.integration}</td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-[rgba(11,22,36,0.78)]">{j.jobType}</td>
                      <td className="px-3 py-2.5">{statusBadge(j.status)}</td>
                      <td className="px-3 py-2.5 text-[rgba(11,22,36,0.70)] whitespace-nowrap">{j.startedAt}</td>
                      <td className="px-3 py-2.5 text-[rgba(11,22,36,0.70)] whitespace-nowrap">{j.completedAt ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[#0B1624]">{j.recordsProcessed.toLocaleString()}</td>
                      <td className="px-3 py-2.5 tabular-nums text-[rgba(11,22,36,0.70)]">{fmtDuration(j.durationMs)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[rgba(11,22,36,0.70)]">{j.retryCount}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-[rgba(11,22,36,0.62)]">{j.triggerSource}</td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => setOpenId(j.id)}>View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => retryJob(j.id)}>Retry Job</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => requeueJob(j.id)}>Requeue Job</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => cancelJob(j.id)} className="text-[#DC2626]">Cancel Job</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-3 py-12 text-center text-[rgba(11,22,36,0.55)] text-[13px]">
                        No jobs match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Detail Drawer */}
        <Sheet open={!!openJob} onOpenChange={(v) => !v && setOpenId(null)}>
          <SheetContent side="right" className="w-full sm:max-w-[640px] overflow-y-auto bg-white">
            {openJob && (
              <>
                <SheetHeader className="pb-3 border-b border-[rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-between gap-2">
                    <SheetTitle className="text-base font-semibold text-[#0B1624] flex items-center gap-2">
                      <span className="font-mono text-[13px]">{openJob.id}</span>
                      {statusBadge(openJob.status)}
                    </SheetTitle>
                  </div>
                  <SheetDescription className="text-[12px] text-[rgba(11,22,36,0.62)]">
                    {openJob.integration} · <span className="font-mono">{openJob.jobType}</span>
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-5 mt-4">
                  {/* Action bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[12px]" onClick={() => retryJob(openJob.id)}>
                      <RotateCcw className="w-3 h-3" /> Retry
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[12px]" onClick={() => requeueJob(openJob.id)}>
                      <RefreshCw className="w-3 h-3" /> Requeue
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[12px] text-[#DC2626] border-[#DC2626]/30" onClick={() => cancelJob(openJob.id)}>
                      <XCircle className="w-3 h-3" /> Cancel
                    </Button>
                  </div>

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    {[
                      ["Trigger", openJob.triggerSource],
                      ["Started", openJob.startedAt],
                      ["Completed", openJob.completedAt ?? "—"],
                      ["Duration", fmtDuration(openJob.durationMs)],
                      ["Records", openJob.recordsProcessed.toLocaleString()],
                      ["Retries", String(openJob.retryCount)],
                    ].map(([k, v]) => (
                      <div key={k} className="border border-[rgba(15,23,42,0.08)] rounded p-2.5 bg-[#FAFBFC]">
                        <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.55)]">{k}</div>
                        <div className="text-[12px] font-medium text-[#0B1624] mt-0.5 break-all">{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Systems */}
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Systems Involved</h3>
                    <div className="flex items-center flex-wrap gap-1.5">
                      {openJob.systems.map((s, i) => (
                        <div key={`${s}-${i}`} className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0B1624] bg-[#F1F5F9] border border-[rgba(15,23,42,0.10)] rounded px-2 py-1">
                            <Database className="w-3 h-3" /> {s}
                          </span>
                          {i < openJob.systems.length - 1 && (
                            <span className="text-[rgba(11,22,36,0.40)]">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Execution Timeline</h3>
                    <div className="border border-[rgba(15,23,42,0.08)] rounded p-3 bg-[#FAFBFC] space-y-2">
                      {openJob.timeline.map((t, i) => (
                        <div key={i} className="flex items-start gap-2 text-[12px]">
                          {tlDot(t.level)}
                          <div className="flex-1">
                            <div className="text-[#0B1624]">{t.label}</div>
                            <div className="text-[10px] text-[rgba(11,22,36,0.55)]">{t.ts}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Errors */}
                  {openJob.errors.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-[#DC2626]" /> Errors
                      </h3>
                      <div className="border border-[#DC2626]/20 bg-[#DC2626]/5 rounded p-3 space-y-1.5">
                        {openJob.errors.map((e, i) => (
                          <div key={i} className="text-[12px]">
                            <div className="text-[#DC2626] font-mono break-all">{e.message}</div>
                            <div className="text-[10px] text-[rgba(11,22,36,0.55)]">{e.ts}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Retry attempts */}
                  {openJob.retryAttempts.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Retry Attempts</h3>
                      <div className="border border-[rgba(15,23,42,0.08)] rounded overflow-hidden">
                        <table className="w-full text-[12px]">
                          <thead className="bg-[#FAFBFC] text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.55)]">
                            <tr>
                              <th className="px-2.5 py-1.5 text-left font-medium">#</th>
                              <th className="px-2.5 py-1.5 text-left font-medium">When</th>
                              <th className="px-2.5 py-1.5 text-left font-medium">Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {openJob.retryAttempts.map((r) => (
                              <tr key={r.attempt} className="border-t border-[rgba(15,23,42,0.06)]">
                                <td className="px-2.5 py-1.5 tabular-nums text-[#0B1624]">{r.attempt}</td>
                                <td className="px-2.5 py-1.5 text-[rgba(11,22,36,0.70)]">{r.ts}</td>
                                <td className="px-2.5 py-1.5 text-[rgba(11,22,36,0.70)] font-mono">{r.result}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Payload */}
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Event Payload</h3>
                    <pre className="text-[11px] font-mono bg-[#0B1624] text-[#E2E8F0] p-3 rounded overflow-x-auto max-h-64">
{JSON.stringify(openJob.payload, null, 2)}
                    </pre>
                  </div>

                  {/* Queue diagnostics */}
                  <div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Queue Diagnostics</h3>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div className="border border-[rgba(15,23,42,0.08)] rounded p-2 bg-[#FAFBFC]">
                        <div className="text-[10px] uppercase text-[rgba(11,22,36,0.55)]">Worker</div>
                        <div className="text-[#0B1624] font-mono">w-{(openJob.id.charCodeAt(3) % 8) + 1}</div>
                      </div>
                      <div className="border border-[rgba(15,23,42,0.08)] rounded p-2 bg-[#FAFBFC]">
                        <div className="text-[10px] uppercase text-[rgba(11,22,36,0.55)]">Priority</div>
                        <div className="text-[#0B1624]">normal</div>
                      </div>
                      <div className="border border-[rgba(15,23,42,0.08)] rounded p-2 bg-[#FAFBFC]">
                        <div className="text-[10px] uppercase text-[rgba(11,22,36,0.55)]">Backoff</div>
                        <div className="text-[#0B1624] font-mono">exp · 2x</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </HyperMCPShell>
  );
}
