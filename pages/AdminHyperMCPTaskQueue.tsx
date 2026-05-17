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
  ArrowLeft, Layers, PlayCircle, PauseCircle, RotateCcw, Search,
  CheckCircle2, XCircle, Clock, Loader2, AlertTriangle, Download,
  ShieldAlert, Inbox, Activity, ArrowUpRight, FileText, Webhook,
  Workflow, Bug, Zap, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type QStatus =
  | "pending" | "running" | "completed" | "failed"
  | "retrying" | "paused" | "waiting_approval" | "dlq";
type QPriority = "low" | "normal" | "high" | "critical";

interface QueueTask {
  id: string;
  queue: string;
  taskType: string;
  source: string;
  destination: string;
  status: QStatus;
  priority: QPriority;
  retries: number;
  queuedAt: string;
  processor: string;
  trigger: string;
  history: { ts: string; label: string; level: "info" | "success" | "warn" | "error" }[];
  retryHistory: { attempt: number; ts: string; result: string }[];
  errors: { ts: string; message: string }[];
  payload: Record<string, unknown>;
  relatedWorkflow?: string;
  relatedWebhook?: string;
  auditRefs: string[];
  failureReason?: string;
  affectedSystems?: string[];
}

const TASKS: QueueTask[] = [
  {
    id: "TQ-88421", queue: "leads.intake", taskType: "lead.normalize", source: "Meta Ads", destination: "CRM",
    status: "running", priority: "high", retries: 0, queuedAt: "8s ago", processor: "worker-03",
    trigger: "webhook:meta.leadgen", relatedWorkflow: "WF-LEAD-INTAKE", relatedWebhook: "WH-7821",
    auditRefs: ["AL-22910"], history: [
      { ts: "8s ago", label: "Dequeued by worker-03", level: "info" },
      { ts: "5s ago", label: "Validation passed", level: "success" },
    ], retryHistory: [], errors: [], payload: { lead_id: "L-44521", form: "Quote-A" },
  },
  {
    id: "TQ-88420", queue: "dispatch.outbound", taskType: "carrier.dispatch", source: "CRM", destination: "Granot",
    status: "failed", priority: "critical", retries: 3, queuedAt: "4m ago", processor: "worker-07",
    trigger: "event:deal.ready_for_dispatch", relatedWorkflow: "WF-DISPATCH",
    auditRefs: ["AL-22884", "AL-22886"], failureReason: "Granot 502 Bad Gateway after 3 retries",
    affectedSystems: ["Granot", "CRM"],
    history: [
      { ts: "4m ago", label: "Queued · priority critical", level: "info" },
      { ts: "4m ago", label: "POST /v1/dispatch", level: "info" },
      { ts: "3m ago", label: "Upstream 502 · retrying", level: "warn" },
      { ts: "3m ago", label: "Final attempt failed", level: "error" },
    ],
    retryHistory: [
      { attempt: 1, ts: "4m ago", result: "502 Bad Gateway" },
      { attempt: 2, ts: "3m ago", result: "502 Bad Gateway" },
      { attempt: 3, ts: "3m ago", result: "502 Bad Gateway" },
    ],
    errors: [{ ts: "3m ago", message: "Granot API responded 502 Bad Gateway" }],
    payload: { deal_id: "D-8842", origin_zip: "33101", destination_zip: "30303", cubic_feet: 720 },
  },
  {
    id: "TQ-88419", queue: "sms.outbound", taskType: "sms.send", source: "CRM", destination: "Twilio",
    status: "retrying", priority: "normal", retries: 2, queuedAt: "2m ago", processor: "worker-02",
    trigger: "event:lead.created", auditRefs: ["AL-22871"],
    history: [
      { ts: "2m ago", label: "Dequeued", level: "info" },
      { ts: "2m ago", label: "Twilio 429 · backing off", level: "warn" },
      { ts: "1m ago", label: "Retry attempt 2/5", level: "info" },
    ],
    retryHistory: [
      { attempt: 1, ts: "2m ago", result: "429 throttled" },
      { attempt: 2, ts: "1m ago", result: "in flight" },
    ],
    errors: [{ ts: "2m ago", message: "Twilio 429 Too Many Requests" }],
    payload: { template: "welcome_v3", count: 50 },
  },
  {
    id: "TQ-88418", queue: "carrier.vetting", taskType: "fmcsa.lookup", source: "CRM", destination: "FMCSA",
    status: "pending", priority: "normal", retries: 0, queuedAt: "—", processor: "—",
    trigger: "scheduler:hourly", auditRefs: [],
    history: [{ ts: "queued", label: "Awaiting worker capacity", level: "info" }],
    retryHistory: [], errors: [], payload: { batch_size: 250 },
  },
  {
    id: "TQ-88417", queue: "esign.delivery", taskType: "esign.send", source: "CRM", destination: "Resend",
    status: "waiting_approval", priority: "high", retries: 0, queuedAt: "9m ago", processor: "—",
    trigger: "manual:agent.42", relatedWorkflow: "WF-ESIGN", auditRefs: ["AL-22850"],
    history: [
      { ts: "9m ago", label: "Submitted for manager approval", level: "warn" },
    ],
    retryHistory: [], errors: [],
    payload: { customer: "C-9921", template: "moving_contract_v4" },
  },
  {
    id: "TQ-88416", queue: "payments.recon", taskType: "stripe.reconcile", source: "Stripe", destination: "CRM",
    status: "completed", priority: "normal", retries: 0, queuedAt: "12m ago", processor: "worker-01",
    trigger: "scheduler:every-15m", auditRefs: ["AL-22810"],
    history: [
      { ts: "12m ago", label: "Dequeued", level: "info" },
      { ts: "11m ago", label: "612 charges reconciled", level: "success" },
    ],
    retryHistory: [], errors: [], payload: { window: "15m" },
  },
  {
    id: "TQ-88415", queue: "contacts.sync", taskType: "hubspot.upsert", source: "HubSpot", destination: "CRM",
    status: "dlq", priority: "high", retries: 5, queuedAt: "1h ago", processor: "worker-05",
    trigger: "manual:admin@trumove.com",
    failureReason: "Invalid OAuth scope: contacts.write — exhausted retries",
    affectedSystems: ["HubSpot"], auditRefs: ["AL-22640"],
    history: [
      { ts: "1h ago", label: "Dequeued", level: "info" },
      { ts: "1h ago", label: "401 Unauthorized", level: "error" },
      { ts: "1h ago", label: "Moved to dead-letter queue", level: "error" },
    ],
    retryHistory: [
      { attempt: 1, ts: "1h ago", result: "401 invalid scope" },
      { attempt: 2, ts: "1h ago", result: "401 invalid scope" },
      { attempt: 5, ts: "1h ago", result: "401 invalid scope" },
    ],
    errors: [{ ts: "1h ago", message: "Invalid OAuth scope: contacts.write" }],
    payload: { batch: 200 },
  },
  {
    id: "TQ-88414", queue: "sms.inbound", taskType: "slicktext.poll", source: "SlickText", destination: "CRM",
    status: "paused", priority: "low", retries: 0, queuedAt: "—", processor: "—",
    trigger: "scheduler:every-2m", auditRefs: [],
    history: [{ ts: "paused", label: "Paused by admin", level: "warn" }],
    retryHistory: [], errors: [], payload: { number: "+18336931695" },
  },
  {
    id: "TQ-88413", queue: "gsc.metrics", taskType: "gsc.pull", source: "GSC", destination: "CRM",
    status: "running", priority: "low", retries: 0, queuedAt: "30s ago", processor: "worker-04",
    trigger: "scheduler:hourly", auditRefs: ["AL-22799"],
    history: [
      { ts: "30s ago", label: "Token refreshed", level: "info" },
      { ts: "10s ago", label: "Streaming page 4/12", level: "info" },
    ],
    retryHistory: [], errors: [], payload: { property: "sc-domain:trumoveinc.com", days: 1 },
  },
  {
    id: "TQ-88412", queue: "calls.sync", taskType: "ringcentral.pull", source: "RingCentral", destination: "CRM",
    status: "pending", priority: "normal", retries: 0, queuedAt: "—", processor: "—",
    trigger: "scheduler:every-5m", auditRefs: [],
    history: [{ ts: "queued", label: "Awaiting worker capacity", level: "info" }],
    retryHistory: [], errors: [], payload: { since: "2026-05-14T12:00:00Z" },
  },
  {
    id: "TQ-88411", queue: "dispatch.outbound", taskType: "carrier.dispatch", source: "CRM", destination: "Arpin",
    status: "dlq", priority: "critical", retries: 5, queuedAt: "2h ago", processor: "worker-07",
    trigger: "event:deal.ready_for_dispatch",
    failureReason: "Carrier endpoint timeout exceeded SLA",
    affectedSystems: ["Arpin", "CRM"], auditRefs: ["AL-22501"],
    history: [
      { ts: "2h ago", label: "Dequeued", level: "info" },
      { ts: "2h ago", label: "Timeout after 30s", level: "error" },
      { ts: "2h ago", label: "Moved to DLQ", level: "error" },
    ],
    retryHistory: [
      { attempt: 1, ts: "2h ago", result: "timeout" },
      { attempt: 5, ts: "2h ago", result: "timeout" },
    ],
    errors: [{ ts: "2h ago", message: "Upstream timeout" }],
    payload: { deal_id: "D-8801" },
  },
  {
    id: "TQ-88410", queue: "leads.intake", taskType: "lead.dedupe", source: "Google Ads", destination: "CRM",
    status: "completed", priority: "normal", retries: 0, queuedAt: "20m ago", processor: "worker-03",
    trigger: "webhook:google.leadform", auditRefs: ["AL-22701"],
    history: [
      { ts: "20m ago", label: "Dequeued", level: "info" },
      { ts: "20m ago", label: "No duplicate · inserted", level: "success" },
    ],
    retryHistory: [], errors: [], payload: { lead_id: "L-44510" },
  },
];

function statusBadge(status: QStatus) {
  const map: Record<QStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    pending:          { label: "Pending",          cls: "text-[#0B1624] bg-[#0B1624]/5 border-[#0B1624]/15", Icon: Clock },
    running:          { label: "Running",          cls: "text-[#1D4ED8] bg-[#3B82F6]/10 border-[#3B82F6]/30", Icon: Loader2 },
    completed:        { label: "Completed",        cls: "text-[#16A34A] bg-[#22C55E]/10 border-[#22C55E]/40", Icon: CheckCircle2 },
    failed:           { label: "Failed",           cls: "text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/40", Icon: XCircle },
    retrying:         { label: "Retrying",         cls: "text-[#D97706] bg-[#F59E0B]/10 border-[#F59E0B]/40", Icon: RotateCcw },
    paused:           { label: "Paused",           cls: "text-[#64748B] bg-[#64748B]/10 border-[#64748B]/30", Icon: PauseCircle },
    waiting_approval: { label: "Waiting Approval", cls: "text-[#7C3AED] bg-[#7C3AED]/10 border-[#7C3AED]/30", Icon: ShieldAlert },
    dlq:              { label: "Dead Letter",      cls: "text-[#991B1B] bg-[#991B1B]/10 border-[#991B1B]/30", Icon: AlertTriangle },
  };
  const m = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap", m.cls)}>
      <m.Icon className={cn("w-3 h-3", status === "running" && "animate-spin")} /> {m.label}
    </span>
  );
}

function priorityBadge(p: QPriority) {
  const map: Record<QPriority, string> = {
    low:      "text-[#64748B] bg-[#64748B]/10 border-[#64748B]/25",
    normal:   "text-[#0B1624] bg-[#0B1624]/5 border-[#0B1624]/15",
    high:     "text-[#D97706] bg-[#F59E0B]/10 border-[#F59E0B]/30",
    critical: "text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/40",
  };
  return (
    <span className={cn("inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border uppercase tracking-wider", map[p])}>
      {p}
    </span>
  );
}

function tlDot(level: "info" | "success" | "warn" | "error") {
  const cls =
    level === "success" ? "bg-[#22C55E]" :
    level === "error" ? "bg-[#DC2626]" :
    level === "warn" ? "bg-[#F59E0B]" :
    "bg-[#64748B]";
  return <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", cls)} />;
}

export default function AdminHyperMCPTaskQueue() {
  const [tasks, setTasks] = useState<QueueTask[]>(TASKS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [queueFilter, setQueueFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  const queues = useMemo(() => Array.from(new Set(tasks.map(t => t.queue))).sort(), [tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (queueFilter !== "all" && t.queue !== queueFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (!q) return true;
      return [t.id, t.queue, t.taskType, t.source, t.destination, t.trigger]
        .some(v => v.toLowerCase().includes(q));
    });
  }, [tasks, search, statusFilter, queueFilter, priorityFilter]);

  const stats = useMemo(() => ({
    pending:  tasks.filter(t => t.status === "pending").length,
    running:  tasks.filter(t => t.status === "running").length,
    failed:   tasks.filter(t => t.status === "failed").length,
    retrying: tasks.filter(t => t.status === "retrying").length,
    review:   tasks.filter(t => t.status === "waiting_approval").length,
    dlq:      tasks.filter(t => t.status === "dlq").length,
  }), [tasks]);

  const open = openId ? tasks.find(t => t.id === openId) ?? null : null;

  function retryAllFailed() {
    setTasks(prev => prev.map(t =>
      t.status === "failed" || t.status === "dlq"
        ? { ...t, status: "retrying", retries: t.retries + 1 }
        : t));
    toast.success("All failed tasks requeued");
  }
  function togglePause() {
    setPaused(v => !v);
    toast.success(paused ? "Queue resumed" : "Queue paused");
  }
  function exportData() {
    const csv = ["id,queue,task_type,source,destination,status,priority,retries"]
      .concat(tasks.map(t => [t.id, t.queue, t.taskType, t.source, t.destination, t.status, t.priority, t.retries].join(",")))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "task-queue.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Queue data exported");
  }
  function act(id: string, action: "retry" | "requeue" | "review" | "pause" | "complete" | "escalate") {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      switch (action) {
        case "retry":    return { ...t, status: "retrying", retries: t.retries + 1 };
        case "requeue":  return { ...t, status: "pending", retries: 0 };
        case "review":   return { ...t, status: "waiting_approval" };
        case "pause":    return { ...t, status: "paused" };
        case "complete": return { ...t, status: "completed" };
        case "escalate": return { ...t, status: "dlq", priority: "critical" };
      }
    }));
    const labels = {
      retry: "requeued for retry", requeue: "requeued", review: "moved to manual review",
      pause: "paused", complete: "force-completed", escalate: "escalated to DLQ",
    };
    toast.success(`${id} ${labels[action]}`);
  }

  // Queue health aggregates
  const byQueue = useMemo(() => {
    const m = new Map<string, { total: number; failed: number; retry: number; oldest: string }>();
    for (const t of tasks) {
      const cur = m.get(t.queue) ?? { total: 0, failed: 0, retry: 0, oldest: "—" };
      cur.total += 1;
      if (t.status === "failed" || t.status === "dlq") cur.failed += 1;
      if (t.status === "retrying") cur.retry += 1;
      if (t.status === "pending" && t.queuedAt !== "—") cur.oldest = t.queuedAt;
      m.set(t.queue, cur);
    }
    return Array.from(m.entries()).map(([q, v]) => ({ queue: q, ...v }))
      .sort((a, b) => b.failed - a.failed || b.retry - a.retry);
  }, [tasks]);

  const dlqTasks = tasks.filter(t => t.status === "dlq");

  // throughput sparkline (mock)
  const throughput = [12, 18, 22, 19, 24, 28, 31, 27, 33, 29, 35, 38];
  const failureTrend = [1, 0, 2, 1, 3, 2, 4, 2, 5, 3, 4, 3];
  const maxT = Math.max(...throughput);
  const maxF = Math.max(...failureTrend, 1);

  return (
    <HyperMCPShell>
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0B1624] text-white flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-[#0B1624]">Task Queue Center</h1>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[rgba(15,23,42,0.10)] text-[rgba(11,22,36,0.62)] bg-white">
                    Hyper MCP
                  </span>
                  {paused && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#F59E0B]/40 text-[#D97706] bg-[#F59E0B]/10">
                      Queue Paused
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-[rgba(11,22,36,0.62)] mt-0.5">
                  Monitor, prioritize, retry, and recover orchestration tasks and queued operations.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]">
                <Link to="/hypermcp"><ArrowLeft className="w-3.5 h-3.5" /> Back</Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]" onClick={exportData}>
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]" onClick={togglePause}>
                {paused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                {paused ? "Resume Queue" : "Pause Queue"}
              </Button>
              <Button size="sm" className="h-8 gap-1.5 bg-[#0B1624] hover:bg-[#0B1624]/90 text-white" onClick={retryAllFailed}>
                <RotateCcw className="w-3.5 h-3.5" /> Retry Failed
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: "Pending",        value: stats.pending,  hint: "awaiting worker" },
              { label: "Running",        value: stats.running,  hint: "in flight" },
              { label: "Failed",         value: stats.failed,   hint: "last 24h" },
              { label: "Retrying",       value: stats.retrying, hint: "backing off" },
              { label: "Manual Review",  value: stats.review,   hint: "approval needed" },
              { label: "Avg Queue Time", value: "1.4s",         hint: "rolling 1h" },
              { label: "Throughput",     value: "38 / min",     hint: "last 60s" },
            ].map(m => (
              <Card key={m.label} className="p-3 bg-white border-[rgba(15,23,42,0.08)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[rgba(11,22,36,0.55)]">{m.label}</div>
                <div className="text-2xl font-semibold text-[#0B1624] mt-1 tabular-nums">{m.value}</div>
                <div className="text-[11px] text-[rgba(11,22,36,0.50)] mt-0.5">{m.hint}</div>
              </Card>
            ))}
          </div>

          {/* Queue Health Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card className="p-4 bg-white border-[rgba(15,23,42,0.08)] lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0B1624]" />
                  <h2 className="text-sm font-semibold text-[#0B1624]">Queue Throughput & Failures</h2>
                </div>
                <span className="text-[11px] text-[rgba(11,22,36,0.55)]">last 12 minutes</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Throughput</div>
                  <div className="flex items-end gap-1 h-20">
                    {throughput.map((v, i) => (
                      <div key={i} className="flex-1 bg-[#0B1624] rounded-sm" style={{ height: `${(v / maxT) * 100}%` }} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Failures</div>
                  <div className="flex items-end gap-1 h-20">
                    {failureTrend.map((v, i) => (
                      <div key={i} className="flex-1 bg-[#DC2626]/70 rounded-sm" style={{ height: `${(v / maxF) * 100}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-white border-[rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                <h2 className="text-sm font-semibold text-[#0B1624]">Bottleneck Queues</h2>
              </div>
              <div className="space-y-2">
                {byQueue.slice(0, 5).map(b => (
                  <div key={b.queue} className="flex items-center justify-between text-[12px] border-b border-[rgba(15,23,42,0.06)] pb-1.5 last:border-0">
                    <span className="font-medium text-[#0B1624] truncate mr-2">{b.queue}</span>
                    <div className="flex items-center gap-3 text-[11px] tabular-nums">
                      <span className="text-[#DC2626]">{b.failed} fail</span>
                      <span className="text-[#D97706]">{b.retry} retry</span>
                      <span className="text-[rgba(11,22,36,0.55)]">{b.total} total</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-3 bg-white border-[rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgba(11,22,36,0.45)]" />
                <Input
                  placeholder="Search task ID, queue, type, trigger…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-[13px] border-[rgba(15,23,42,0.12)]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[160px] text-[13px] border-[rgba(15,23,42,0.12)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="retrying">Retrying</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="waiting_approval">Waiting Approval</SelectItem>
                  <SelectItem value="dlq">Dead Letter</SelectItem>
                </SelectContent>
              </Select>
              <Select value={queueFilter} onValueChange={setQueueFilter}>
                <SelectTrigger className="h-8 w-[180px] text-[13px] border-[rgba(15,23,42,0.12)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All queues</SelectItem>
                  {queues.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 w-[140px] text-[13px] border-[rgba(15,23,42,0.12)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[11px] text-[rgba(11,22,36,0.55)] ml-auto">{filtered.length} of {tasks.length}</span>
            </div>
          </Card>

          {/* Queue Table */}
          <Card className="bg-white border-[rgba(15,23,42,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-[#F1F3F6] text-[rgba(11,22,36,0.62)] text-left">
                    <th className="px-3 py-2 font-medium">Task ID</th>
                    <th className="px-3 py-2 font-medium">Queue</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Destination</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Priority</th>
                    <th className="px-3 py-2 font-medium text-right">Retries</th>
                    <th className="px-3 py-2 font-medium">Queued</th>
                    <th className="px-3 py-2 font-medium">Processor</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr
                      key={t.id}
                      className="border-t border-[rgba(15,23,42,0.06)] hover:bg-[#F7F8FA] cursor-pointer"
                      onClick={() => setOpenId(t.id)}
                    >
                      <td className="px-3 py-2 font-mono text-[#0B1624]">{t.id}</td>
                      <td className="px-3 py-2 text-[#0B1624]">{t.queue}</td>
                      <td className="px-3 py-2 text-[rgba(11,22,36,0.75)]">{t.taskType}</td>
                      <td className="px-3 py-2 text-[rgba(11,22,36,0.75)]">{t.source}</td>
                      <td className="px-3 py-2 text-[rgba(11,22,36,0.75)]">{t.destination}</td>
                      <td className="px-3 py-2">{statusBadge(t.status)}</td>
                      <td className="px-3 py-2">{priorityBadge(t.priority)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[rgba(11,22,36,0.75)]">{t.retries}</td>
                      <td className="px-3 py-2 text-[rgba(11,22,36,0.62)]">{t.queuedAt}</td>
                      <td className="px-3 py-2 text-[rgba(11,22,36,0.62)] font-mono text-[11.5px]">{t.processor}</td>
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[rgba(11,22,36,0.62)] hover:text-[#0B1624]">
                              Manage <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => act(t.id, "retry")}><RotateCcw className="w-3.5 h-3.5 mr-2" /> Retry</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => act(t.id, "requeue")}><Inbox className="w-3.5 h-3.5 mr-2" /> Requeue</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => act(t.id, "review")}><ShieldAlert className="w-3.5 h-3.5 mr-2" /> Manual review</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => act(t.id, "pause")}><PauseCircle className="w-3.5 h-3.5 mr-2" /> Pause</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => act(t.id, "complete")}><CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Force complete</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => act(t.id, "escalate")} className="text-[#DC2626]"><AlertTriangle className="w-3.5 h-3.5 mr-2" /> Escalate to DLQ</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={11} className="px-3 py-8 text-center text-[rgba(11,22,36,0.55)]">No tasks match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Dead Letter Queue */}
          <Card className="bg-white border-[rgba(15,23,42,0.08)]">
            <div className="px-4 py-3 border-b border-[rgba(15,23,42,0.08)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#991B1B]" />
                <h2 className="text-sm font-semibold text-[#0B1624]">Dead Letter Queue</h2>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-[#991B1B]/30 bg-[#991B1B]/10 text-[#991B1B]">
                  {dlqTasks.length} requiring intervention
                </span>
              </div>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]" onClick={retryAllFailed}>
                <RotateCcw className="w-3.5 h-3.5" /> Retry all
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-[#F1F3F6] text-[rgba(11,22,36,0.62)] text-left">
                    <th className="px-3 py-2 font-medium">Task ID</th>
                    <th className="px-3 py-2 font-medium">Queue</th>
                    <th className="px-3 py-2 font-medium">Failure Reason</th>
                    <th className="px-3 py-2 font-medium">Affected Systems</th>
                    <th className="px-3 py-2 font-medium">Retries</th>
                    <th className="px-3 py-2 font-medium">Eligibility</th>
                    <th className="px-3 py-2 font-medium">Escalation</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dlqTasks.map(t => (
                    <tr key={t.id} className="border-t border-[rgba(15,23,42,0.06)] hover:bg-[#F7F8FA]">
                      <td className="px-3 py-2 font-mono">{t.id}</td>
                      <td className="px-3 py-2">{t.queue}</td>
                      <td className="px-3 py-2 text-[rgba(11,22,36,0.75)]">{t.failureReason ?? "—"}</td>
                      <td className="px-3 py-2 text-[rgba(11,22,36,0.75)]">{(t.affectedSystems ?? []).join(", ") || "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{t.retries}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded border",
                          t.retries < 5
                            ? "text-[#16A34A] bg-[#22C55E]/10 border-[#22C55E]/30"
                            : "text-[#64748B] bg-[#64748B]/10 border-[#64748B]/25"
                        )}>
                          {t.retries < 5 ? "Eligible" : "Exhausted"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#D97706]/30 bg-[#F59E0B]/10 text-[#D97706]">
                          {t.priority === "critical" ? "On-call paged" : "Pending review"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] border-[rgba(15,23,42,0.12)]" onClick={() => act(t.id, "retry")}>
                            <RotateCcw className="w-3 h-3 mr-1" /> Retry
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] border-[rgba(15,23,42,0.12)]" onClick={() => act(t.id, "review")}>
                            Review
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {dlqTasks.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-[rgba(11,22,36,0.55)]">Dead letter queue is empty.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-white">
          {open && (
            <>
              <SheetHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-[#0B1624] font-mono text-base">{open.id}</SheetTitle>
                  {statusBadge(open.status)}
                  {priorityBadge(open.priority)}
                </div>
                <SheetDescription className="text-[12.5px]">
                  {open.queue} · {open.taskType} · {open.source} → {open.destination}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                {/* Metadata */}
                <section>
                  <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Metadata</h3>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    {[
                      ["Trigger", open.trigger],
                      ["Processor", open.processor],
                      ["Queued", open.queuedAt],
                      ["Retries", String(open.retries)],
                      ["Workflow", open.relatedWorkflow ?? "—"],
                      ["Webhook", open.relatedWebhook ?? "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="border border-[rgba(15,23,42,0.08)] rounded px-2 py-1.5">
                        <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.55)]">{k}</div>
                        <div className="text-[12px] text-[#0B1624] font-mono truncate">{v}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Recovery Tools */}
                <section>
                  <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Recovery Tools</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] border-[rgba(15,23,42,0.12)]" onClick={() => act(open.id, "retry")}><RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry</Button>
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] border-[rgba(15,23,42,0.12)]" onClick={() => act(open.id, "requeue")}><Inbox className="w-3.5 h-3.5 mr-1" /> Requeue</Button>
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] border-[rgba(15,23,42,0.12)]" onClick={() => act(open.id, "review")}><ShieldAlert className="w-3.5 h-3.5 mr-1" /> Review</Button>
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] border-[rgba(15,23,42,0.12)]" onClick={() => act(open.id, "pause")}><PauseCircle className="w-3.5 h-3.5 mr-1" /> Pause</Button>
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] border-[rgba(15,23,42,0.12)]" onClick={() => act(open.id, "complete")}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete</Button>
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] border-[rgba(15,23,42,0.12)] text-[#DC2626]" onClick={() => act(open.id, "escalate")}><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Escalate</Button>
                  </div>
                </section>

                {/* Queue History */}
                <section>
                  <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Queue History</h3>
                  <div className="space-y-1.5">
                    {open.history.map((h, i) => (
                      <div key={i} className="flex gap-2 text-[12px]">
                        {tlDot(h.level)}
                        <div className="flex-1">
                          <div className="text-[#0B1624]">{h.label}</div>
                          <div className="text-[10.5px] text-[rgba(11,22,36,0.55)]">{h.ts}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Retry History */}
                {open.retryHistory.length > 0 && (
                  <section>
                    <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Retry History</h3>
                    <div className="border border-[rgba(15,23,42,0.08)] rounded overflow-hidden">
                      <table className="w-full text-[11.5px]">
                        <thead className="bg-[#F1F3F6] text-[rgba(11,22,36,0.62)]">
                          <tr><th className="px-2 py-1 text-left">#</th><th className="px-2 py-1 text-left">Time</th><th className="px-2 py-1 text-left">Result</th></tr>
                        </thead>
                        <tbody>
                          {open.retryHistory.map(r => (
                            <tr key={r.attempt} className="border-t border-[rgba(15,23,42,0.06)]">
                              <td className="px-2 py-1 tabular-nums">{r.attempt}</td>
                              <td className="px-2 py-1 text-[rgba(11,22,36,0.62)]">{r.ts}</td>
                              <td className="px-2 py-1">{r.result}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Errors */}
                {open.errors.length > 0 && (
                  <section>
                    <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2 flex items-center gap-1.5"><Bug className="w-3.5 h-3.5" /> Error Traces</h3>
                    <div className="space-y-1.5">
                      {open.errors.map((e, i) => (
                        <div key={i} className="border border-[#DC2626]/30 bg-[#DC2626]/5 rounded px-2 py-1.5">
                          <div className="text-[11.5px] text-[#991B1B] font-mono">{e.message}</div>
                          <div className="text-[10.5px] text-[rgba(11,22,36,0.55)] mt-0.5">{e.ts}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Related */}
                <section>
                  <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Related</h3>
                  <div className="space-y-1 text-[12px]">
                    {open.relatedWorkflow && (
                      <div className="flex items-center justify-between border border-[rgba(15,23,42,0.08)] rounded px-2 py-1.5">
                        <span className="flex items-center gap-1.5"><Workflow className="w-3.5 h-3.5 text-[rgba(11,22,36,0.55)]" /> Workflow</span>
                        <Link to="/hypermcp/workflow-rules" className="font-mono text-[#1D4ED8] hover:underline flex items-center gap-1">{open.relatedWorkflow} <ArrowUpRight className="w-3 h-3" /></Link>
                      </div>
                    )}
                    {open.relatedWebhook && (
                      <div className="flex items-center justify-between border border-[rgba(15,23,42,0.08)] rounded px-2 py-1.5">
                        <span className="flex items-center gap-1.5"><Webhook className="w-3.5 h-3.5 text-[rgba(11,22,36,0.55)]" /> Webhook</span>
                        <Link to="/hypermcp/webhook-logs" className="font-mono text-[#1D4ED8] hover:underline flex items-center gap-1">{open.relatedWebhook} <ArrowUpRight className="w-3 h-3" /></Link>
                      </div>
                    )}
                    {open.auditRefs.length > 0 && (
                      <div className="flex items-center justify-between border border-[rgba(15,23,42,0.08)] rounded px-2 py-1.5">
                        <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[rgba(11,22,36,0.55)]" /> Audit Logs</span>
                        <Link to="/hypermcp/audit-logs" className="font-mono text-[#1D4ED8] hover:underline flex items-center gap-1">{open.auditRefs.join(", ")} <ArrowUpRight className="w-3 h-3" /></Link>
                      </div>
                    )}
                  </div>
                </section>

                {/* Payload */}
                <section>
                  <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Payload Preview</h3>
                  <pre className="text-[11.5px] bg-[#0B1624] text-[#E2E8F0] rounded p-3 overflow-x-auto font-mono">
{JSON.stringify(open.payload, null, 2)}
                  </pre>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}
