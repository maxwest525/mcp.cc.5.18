import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Bell, BellRing, Search, Download, Settings2, CheckCheck,
  Plug, KeyRound, Webhook, RefreshCw, ShieldCheck, ArrowRightLeft, ListChecks,
  Brain, ShieldAlert, AlertTriangle, CheckCircle2, Clock, ArrowUpRight, FileSearch,
  UserPlus, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Severity = "info" | "warning" | "high" | "critical";
type NotifStatus = "unread" | "acknowledged" | "assigned" | "resolved" | "escalated";
type AlertType =
  | "integration_disconnected"
  | "credential_expiring"
  | "webhook_failed"
  | "sync_job_failed"
  | "approval_required"
  | "mapping_conflict"
  | "queue_backlog"
  | "ai_execution_failed"
  | "vendor_compliance_warning";

interface Notif {
  id: string;
  ts: string;
  type: AlertType;
  source: string;
  severity: Severity;
  message: string;
  status: NotifStatus;
  owner: string | null;
  details: string;
  related: { id: string; label: string };
  recommendation: string;
  history: { ts: string; actor: string; action: string }[];
  notes: { ts: string; actor: string; text: string }[];
}

const TYPE_META: Record<AlertType, { label: string; Icon: typeof Plug }> = {
  integration_disconnected:   { label: "Integration Disconnected", Icon: Plug },
  credential_expiring:        { label: "Credential Expiring",      Icon: KeyRound },
  webhook_failed:             { label: "Webhook Failed",           Icon: Webhook },
  sync_job_failed:            { label: "Sync Job Failed",          Icon: RefreshCw },
  approval_required:          { label: "Approval Required",        Icon: ShieldCheck },
  mapping_conflict:           { label: "Mapping Conflict",         Icon: ArrowRightLeft },
  queue_backlog:              { label: "Queue Backlog",            Icon: ListChecks },
  ai_execution_failed:        { label: "AI Execution Failed",      Icon: Brain },
  vendor_compliance_warning:  { label: "Vendor Compliance Warning",Icon: ShieldAlert },
};

const SEV_META: Record<Severity, { label: string; cls: string }> = {
  info:     { label: "Info",     cls: "text-[#0B1624] bg-[#0B1624]/5 border-[#0B1624]/15" },
  warning:  { label: "Warning",  cls: "text-[#D97706] bg-[#F59E0B]/10 border-[#F59E0B]/40" },
  high:     { label: "High",     cls: "text-[#B45309] bg-[#F59E0B]/15 border-[#F59E0B]/50" },
  critical: { label: "Critical", cls: "text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/40" },
};

const STATUS_META: Record<NotifStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  unread:       { label: "Unread",       cls: "text-[#1D4ED8] bg-[#3B82F6]/10 border-[#3B82F6]/30", Icon: BellRing },
  acknowledged: { label: "Acknowledged", cls: "text-[#0B1624] bg-[#0B1624]/5 border-[#0B1624]/15", Icon: CheckCircle2 },
  assigned:     { label: "Assigned",     cls: "text-[#7C3AED] bg-[#7C3AED]/10 border-[#7C3AED]/30", Icon: UserPlus },
  resolved:     { label: "Resolved",     cls: "text-[#16A34A] bg-[#22C55E]/10 border-[#22C55E]/40", Icon: CheckCheck },
  escalated:    { label: "Escalated",    cls: "text-[#991B1B] bg-[#991B1B]/10 border-[#991B1B]/30", Icon: ArrowUpRight },
};

const NOTIFS: Notif[] = [
  {
    id: "ALT-44219",
    ts: "2 min ago",
    type: "credential_expiring",
    source: "Twilio",
    severity: "critical",
    status: "unread",
    owner: null,
    message: "Twilio production auth token expires in 47 minutes",
    details: "Quarterly rotation policy expires the active TWILIO_AUTH_TOKEN at 17:42 UTC. No replacement key has been promoted.",
    related: { id: "INT-TWILIO", label: "Twilio integration" },
    recommendation: "Promote standby key now and dual-activate for 60 minutes before revocation.",
    history: [{ ts: "2 min ago", actor: "policy.engine", action: "Raised critical alert" }],
    notes: [],
  },
  {
    id: "ALT-44215",
    ts: "8 min ago",
    type: "integration_disconnected",
    source: "Google Ads",
    severity: "high",
    status: "unread",
    owner: null,
    message: "Google Ads OAuth token rejected — 4 consecutive failures",
    details: "Refresh token rejected with invalid_grant. Marketing sync paused. Attribution pipeline degraded.",
    related: { id: "INT-GADS", label: "Google Ads" },
    recommendation: "Reconnect Google Ads OAuth and verify scope grants.",
    history: [{ ts: "8 min ago", actor: "integrations.monitor", action: "Detected disconnect" }],
    notes: [],
  },
  {
    id: "ALT-44210",
    ts: "21 min ago",
    type: "webhook_failed",
    source: "HubSpot",
    severity: "warning",
    status: "acknowledged",
    owner: "r.santos",
    message: "HubSpot contact.update webhook returned 500 (12/12 in 10m)",
    details: "Outbound webhook to HubSpot consistently failing with 500. Last 12 deliveries failed within 10 minutes.",
    related: { id: "WHK-HS-CONTACT", label: "HubSpot contact webhook" },
    recommendation: "Check HubSpot status page and pause webhook if outage is confirmed.",
    history: [
      { ts: "21 min ago", actor: "webhook.monitor", action: "Threshold breached" },
      { ts: "18 min ago", actor: "r.santos", action: "Acknowledged" },
    ],
    notes: [{ ts: "17 min ago", actor: "r.santos", text: "Watching HubSpot status page." }],
  },
  {
    id: "ALT-44204",
    ts: "34 min ago",
    type: "sync_job_failed",
    source: "FMCSA",
    severity: "warning",
    status: "assigned",
    owner: "k.patel",
    message: "Carrier safety sync failed — 218 records not updated",
    details: "Scheduled FMCSA carrier safety sync failed at step 4/6 (rate limit). 218 carrier records are stale.",
    related: { id: "JOB-FMCSA-SAFETY", label: "FMCSA safety sync" },
    recommendation: "Retry with reduced batch size (200 → 50) and 2x backoff.",
    history: [
      { ts: "34 min ago", actor: "scheduler", action: "Job failed" },
      { ts: "30 min ago", actor: "k.patel",  action: "Assigned to self" },
    ],
    notes: [],
  },
  {
    id: "ALT-44195",
    ts: "1 hr ago",
    type: "approval_required",
    source: "Approval Center",
    severity: "high",
    status: "unread",
    owner: null,
    message: "Bulk retry request for 4,218 stalled e-sign jobs is overdue",
    details: "Approval REQ-10371 has exceeded its SLA window by 2 hours. Provider outage has cleared.",
    related: { id: "REQ-10371", label: "Approval REQ-10371" },
    recommendation: "Approve or reject before queue exceeds 5,000 backlog threshold.",
    history: [{ ts: "1 hr ago", actor: "approval.center", action: "SLA breached" }],
    notes: [],
  },
  {
    id: "ALT-44188",
    ts: "1 hr ago",
    type: "mapping_conflict",
    source: "HubSpot ↔ CRM",
    severity: "warning",
    status: "unread",
    owner: null,
    message: "Field mapping conflict — `lifecyclestage` mapped twice",
    details: "Two active mappings for HubSpot.contact.lifecyclestage detected. The most recent one will silently override.",
    related: { id: "MAP-HS-CRM", label: "HubSpot mapping" },
    recommendation: "Open Data Mapping and remove the duplicate destination.",
    history: [{ ts: "1 hr ago", actor: "mapping.validator", action: "Conflict detected" }],
    notes: [],
  },
  {
    id: "ALT-44179",
    ts: "2 hr ago",
    type: "queue_backlog",
    source: "Email Queue",
    severity: "high",
    status: "assigned",
    owner: "ops.console",
    message: "Email send queue depth 12,481 — above 10,000 threshold",
    details: "Worker concurrency reduced after Resend rate-limit response. Backlog growing at ~600/min.",
    related: { id: "Q-EMAIL", label: "Email queue" },
    recommendation: "Spin up 2 additional workers and verify Resend quota.",
    history: [
      { ts: "2 hr ago", actor: "queue.monitor", action: "Threshold breached" },
      { ts: "1 hr ago", actor: "ops.console",   action: "Assigned to self" },
    ],
    notes: [{ ts: "1 hr ago", actor: "ops.console", text: "Scaling workers now." }],
  },
  {
    id: "ALT-44170",
    ts: "3 hr ago",
    type: "ai_execution_failed",
    source: "AI Orchestration",
    severity: "warning",
    status: "resolved",
    owner: "trudy.ai",
    message: "Lead Classifier agent — 18 executions failed (timeout)",
    details: "Gemini 2.5 Flash returned timeout on 18/240 runs in the last hour. Fallback to GPT-5-mini succeeded.",
    related: { id: "AGT-LEAD-CLASS", label: "Lead Classifier" },
    recommendation: "No action needed — fallback handled successfully. Monitor.",
    history: [
      { ts: "3 hr ago", actor: "ai.monitor", action: "Failures detected" },
      { ts: "2 hr ago", actor: "trudy.ai",   action: "Auto-resolved via fallback" },
    ],
    notes: [],
  },
  {
    id: "ALT-44156",
    ts: "5 hr ago",
    type: "vendor_compliance_warning",
    source: "Vendor Compliance",
    severity: "high",
    status: "escalated",
    owner: "compliance.bot",
    message: "Carrier #88412 — insurance certificate lapsed (3rd time / 30d)",
    details: "Repeated insurance lapses by Carrier 88412. Currently still eligible for dispatch.",
    related: { id: "VEN-88412", label: "Carrier 88412" },
    recommendation: "Suspend carrier pending review; escalate to legal.",
    history: [
      { ts: "5 hr ago", actor: "compliance.bot", action: "Escalated to Approval Center" },
    ],
    notes: [],
  },
  {
    id: "ALT-44141",
    ts: "8 hr ago",
    type: "credential_expiring",
    source: "Resend",
    severity: "info",
    status: "acknowledged",
    owner: "j.harris",
    message: "Resend API key expires in 14 days",
    details: "Standard 90-day rotation cadence. No action required this week.",
    related: { id: "INT-RESEND", label: "Resend integration" },
    recommendation: "Schedule rotation in next maintenance window.",
    history: [
      { ts: "8 hr ago", actor: "policy.engine", action: "Notice raised" },
      { ts: "7 hr ago", actor: "j.harris",      action: "Acknowledged" },
    ],
    notes: [],
  },
];

const RULES = [
  { id: "RULE-01", label: "Integration disconnect alert", desc: "Trigger when an integration reports disconnected for >5 min", icon: Plug, sev: "high" as Severity, on: true },
  { id: "RULE-02", label: "Credential expiration alert",  desc: "Notify 14d / 7d / 1d / 1h before any credential expiry",   icon: KeyRound, sev: "warning" as Severity, on: true },
  { id: "RULE-03", label: "Workflow failure alert",       desc: "Trigger when a workflow fails ≥3 consecutive runs",       icon: RefreshCw, sev: "high" as Severity, on: true },
  { id: "RULE-04", label: "Queue backlog alert",          desc: "Trigger when any queue depth exceeds 10,000 messages",     icon: ListChecks, sev: "high" as Severity, on: true },
  { id: "RULE-05", label: "Approval overdue alert",       desc: "Trigger when an approval exceeds its SLA window",         icon: ShieldCheck, sev: "warning" as Severity, on: true },
];

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap", className)}>
      {children}
    </span>
  );
}

export default function AdminHyperMCPNotifications() {
  const [items, setItems] = useState<Notif[]>(NOTIFS);
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const stats = useMemo(() => {
    const unread = items.filter(i => i.status === "unread").length;
    const critical = items.filter(i => i.severity === "critical").length;
    const integration = items.filter(i => i.type === "integration_disconnected").length;
    const failedWf = items.filter(i => i.type === "sync_job_failed" || i.type === "ai_execution_failed" || i.type === "webhook_failed").length;
    const cred = items.filter(i => i.type === "credential_expiring").length;
    const approvals = items.filter(i => i.type === "approval_required").length;
    return { unread, critical, integration, failedWf, cred, approvals };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(n => {
      if (sevFilter !== "all" && n.severity !== sevFilter) return false;
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (!q) return true;
      return [n.id, n.message, n.source, TYPE_META[n.type].label].some(v => v.toLowerCase().includes(q));
    });
  }, [items, search, sevFilter, typeFilter, statusFilter]);

  const open = openId ? items.find(i => i.id === openId) ?? null : null;

  function toggleOne(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r.id)));
  }

  function applyAction(ids: string[], action: "ack" | "resolve" | "escalate" | "assign") {
    if (!ids.length) { toast.error("Nothing selected"); return; }
    setItems(prev => prev.map(n => {
      if (!ids.includes(n.id)) return n;
      const status: NotifStatus =
        action === "ack" ? "acknowledged" :
        action === "resolve" ? "resolved" :
        action === "escalate" ? "escalated" : "assigned";
      const owner = action === "assign" ? "you" : n.owner;
      return {
        ...n,
        status,
        owner,
        history: [{ ts: "just now", actor: "you", action: STATUS_META[status].label }, ...n.history],
      };
    }));
    setSelected(new Set());
    const labels = { ack: "acknowledged", resolve: "resolved", escalate: "escalated", assign: "assigned to you" };
    toast.success(`${ids.length} alert${ids.length > 1 ? "s" : ""} ${labels[action]}`);
  }

  function markAllRead() {
    setItems(prev => prev.map(n => n.status === "unread" ? { ...n, status: "acknowledged" } : n));
    toast.success("All alerts marked as read");
  }

  function postNote() {
    if (!open || !note.trim()) return;
    setItems(prev => prev.map(n =>
      n.id === open.id ? { ...n, notes: [...n.notes, { ts: "just now", actor: "you", text: note.trim() }] } : n
    ));
    setNote("");
    toast.success("Note added");
  }

  return (
    <HyperMCPShell>
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0B1624] text-white flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-[#0B1624]">Notification Center</h1>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[rgba(15,23,42,0.10)] text-[rgba(11,22,36,0.62)] bg-white">
                    Hyper MCP
                  </span>
                </div>
                <p className="text-[13px] text-[rgba(11,22,36,0.62)] mt-0.5">
                  Monitor and manage operational alerts, warnings, and system notifications.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]">
                <Link to="/hypermcp"><ArrowLeft className="w-3.5 h-3.5" /> Back</Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]"
                onClick={() => toast.success("Alerts exported to CSV")}>
                <Download className="w-3.5 h-3.5" /> Export Alerts
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]"
                onClick={() => toast.info("Rule editor — coming soon")}>
                <Settings2 className="w-3.5 h-3.5" /> Configure Rules
              </Button>
              <Button size="sm" className="h-8 gap-1.5 bg-[#0B1624] hover:bg-[#0B1624]/90 text-white" onClick={markAllRead}>
                <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Unread Alerts",         value: stats.unread,      hint: "needs attention" },
              { label: "Critical Alerts",       value: stats.critical,    hint: "highest severity", danger: stats.critical > 0 },
              { label: "Integration Warnings",  value: stats.integration, hint: "disconnects & auth" },
              { label: "Failed Workflows",      value: stats.failedWf,    hint: "syncs / webhooks / AI" },
              { label: "Credential Alerts",     value: stats.cred,        hint: "expiring keys" },
              { label: "Approval Notices",      value: stats.approvals,   hint: "awaiting decision" },
            ].map(m => (
              <Card key={m.label} className="p-3 bg-white border-[rgba(15,23,42,0.08)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[rgba(11,22,36,0.55)]">{m.label}</div>
                <div className={cn("text-2xl font-semibold mt-1 tabular-nums", m.danger ? "text-[#DC2626]" : "text-[#0B1624]")}>{m.value}</div>
                <div className="text-[11px] text-[rgba(11,22,36,0.50)] mt-0.5">{m.hint}</div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="p-3 bg-white border-[rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(11,22,36,0.45)]" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by ID, message, source, or alert type…"
                  className="h-8 pl-8 text-[12.5px] bg-white border-[rgba(15,23,42,0.12)]" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[150px] text-[12px] bg-white border-[rgba(15,23,42,0.12)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sevFilter} onValueChange={setSevFilter}>
                <SelectTrigger className="h-8 w-[140px] text-[12px] bg-white border-[rgba(15,23,42,0.12)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  {Object.entries(SEV_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-[210px] text-[12px] bg-white border-[rgba(15,23,42,0.12)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All alert types</SelectItem>
                  {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-[11px] text-[rgba(11,22,36,0.55)] ml-auto">
                {filtered.length} of {items.length} · {selected.size} selected
              </span>
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgba(15,23,42,0.06)]">
                <Button size="sm" variant="outline" className="h-7 text-[11.5px] border-[rgba(15,23,42,0.12)]"
                  onClick={() => applyAction([...selected], "ack")}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Acknowledge
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11.5px] border-[rgba(15,23,42,0.12)]"
                  onClick={() => applyAction([...selected], "assign")}>
                  <UserPlus className="w-3 h-3 mr-1" /> Assign to me
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11.5px] border-[#16A34A]/30 text-[#16A34A] hover:bg-[#22C55E]/5"
                  onClick={() => applyAction([...selected], "resolve")}>
                  <CheckCheck className="w-3 h-3 mr-1" /> Resolve
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11.5px] border-[#991B1B]/30 text-[#991B1B] hover:bg-[#991B1B]/5"
                  onClick={() => applyAction([...selected], "escalate")}>
                  <ArrowUpRight className="w-3 h-3 mr-1" /> Escalate
                </Button>
              </div>
            )}
          </Card>

          {/* Table */}
          <Card className="bg-white border-[rgba(15,23,42,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="bg-[#F7F8FA] border-b border-[rgba(15,23,42,0.08)]">
                  <tr className="text-left text-[10.5px] uppercase tracking-wider text-[rgba(11,22,36,0.55)]">
                    <th className="px-3 py-2 w-8">
                      <Checkbox
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Alert Type</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Message</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Owner</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(n => {
                    const TM = TYPE_META[n.type];
                    const SM = STATUS_META[n.status];
                    const Sev = SEV_META[n.severity];
                    const elevated = n.severity === "high" || n.severity === "critical";
                    return (
                      <tr key={n.id}
                        className={cn(
                          "border-b border-[rgba(15,23,42,0.06)] hover:bg-[#F7F8FA] cursor-pointer transition-colors",
                          elevated && n.status === "unread" && "bg-[#DC2626]/[0.015]",
                          n.status === "unread" && "font-medium"
                        )}
                        onClick={() => {
                          setOpenId(n.id);
                          if (n.status === "unread") {
                            setItems(prev => prev.map(x => x.id === n.id ? { ...x, status: "acknowledged" } : x));
                          }
                        }}>
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          <Checkbox checked={selected.has(n.id)} onCheckedChange={() => toggleOne(n.id)} />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-[rgba(11,22,36,0.65)] tabular-nums">{n.ts}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <TM.Icon className="w-3.5 h-3.5 text-[rgba(11,22,36,0.55)]" />
                            <span className="text-[12px] text-[#0B1624]">{TM.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-[#0B1624]">{n.source}</td>
                        <td className="px-3 py-2.5"><Badge className={Sev.cls}>{Sev.label}</Badge></td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {elevated && (
                              <span className={cn("w-1 h-7 rounded-sm", n.severity === "critical" ? "bg-[#DC2626]" : "bg-[#F59E0B]")} />
                            )}
                            <div className="min-w-0">
                              <div className="text-[#0B1624] truncate max-w-[420px]">{n.message}</div>
                              <div className="text-[10.5px] text-[rgba(11,22,36,0.55)] tabular-nums">{n.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge className={SM.cls}><SM.Icon className="w-3 h-3" />{SM.label}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-[rgba(11,22,36,0.70)]">{n.owner ?? "—"}</td>
                        <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-7 text-[11.5px]" onClick={() => setOpenId(n.id)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-10 text-center text-[12px] text-[rgba(11,22,36,0.55)]">No alerts match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Active rules */}
          <Card className="bg-white border-[rgba(15,23,42,0.08)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[13px] font-semibold text-[#0B1624]">Active Notification Rules</div>
                <div className="text-[11.5px] text-[rgba(11,22,36,0.55)]">Conditions that automatically generate alerts in this center.</div>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-[11.5px] border-[rgba(15,23,42,0.12)]" onClick={() => toast.info("Rule editor — coming soon")}>
                <Settings2 className="w-3 h-3 mr-1" /> Manage Rules
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {RULES.map(r => (
                <div key={r.id} className="border border-[rgba(15,23,42,0.08)] rounded-md p-2.5 bg-[#F7F8FA]/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <r.icon className="w-3.5 h-3.5 text-[rgba(11,22,36,0.65)]" />
                      <div className="text-[12px] font-medium text-[#0B1624]">{r.label}</div>
                    </div>
                    <Badge className={SEV_META[r.sev].cls}>{SEV_META[r.sev].label}</Badge>
                  </div>
                  <div className="text-[11px] text-[rgba(11,22,36,0.60)] mt-1.5 leading-snug">{r.desc}</div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(15,23,42,0.06)]">
                    <span className="text-[10.5px] text-[rgba(11,22,36,0.55)] tabular-nums">{r.id}</span>
                    <span className={cn("text-[10.5px] font-medium", r.on ? "text-[#16A34A]" : "text-[rgba(11,22,36,0.55)]")}>
                      {r.on ? "● Active" : "○ Off"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-[560px] bg-white p-0 overflow-y-auto">
          {open && (() => {
            const TM = TYPE_META[open.type];
            const SM = STATUS_META[open.status];
            const Sev = SEV_META[open.severity];
            return (
              <>
                <SheetHeader className="p-5 border-b border-[rgba(15,23,42,0.08)]">
                  <div className="flex items-center gap-2 mb-1">
                    <TM.Icon className="w-4 h-4 text-[rgba(11,22,36,0.65)]" />
                    <span className="text-[11.5px] uppercase tracking-wider text-[rgba(11,22,36,0.55)]">{TM.label}</span>
                    <Badge className={cn(Sev.cls, "ml-auto")}>{Sev.label}</Badge>
                    <Badge className={SM.cls}><SM.Icon className="w-3 h-3" />{SM.label}</Badge>
                  </div>
                  <SheetTitle className="text-[15px] font-semibold text-[#0B1624] leading-snug">{open.message}</SheetTitle>
                  <SheetDescription className="text-[11.5px] text-[rgba(11,22,36,0.55)] tabular-nums">
                    {open.id} · {open.source} · {open.ts}
                  </SheetDescription>
                </SheetHeader>

                <div className="p-5 space-y-5">
                  <Section title="Details">
                    <p className="text-[12.5px] leading-relaxed text-[rgba(11,22,36,0.78)]">{open.details}</p>
                  </Section>

                  <Section title="Recommended Action">
                    <div className="rounded-md border border-[#3B82F6]/25 bg-[#3B82F6]/[0.04] p-2.5 text-[12px] text-[#0B1624]">
                      {open.recommendation}
                    </div>
                  </Section>

                  <Section title="Related">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[rgba(11,22,36,0.65)]">{open.related.label}</span>
                      <span className="tabular-nums text-[rgba(11,22,36,0.55)]">{open.related.id}</span>
                    </div>
                  </Section>

                  <Section title="Status History">
                    <ul className="space-y-1.5">
                      {open.history.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[rgba(11,22,36,0.35)] mt-1.5" />
                          <div className="flex-1">
                            <span className="text-[#0B1624]">{h.action}</span>
                            <span className="text-[rgba(11,22,36,0.55)]"> — {h.actor} · {h.ts}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Section>

                  <Section title="Assignment Notes">
                    {open.notes.length === 0 && (
                      <p className="text-[11.5px] text-[rgba(11,22,36,0.55)]">No notes yet.</p>
                    )}
                    {open.notes.map((n, i) => (
                      <div key={i} className="text-[12px] border-l-2 border-[rgba(15,23,42,0.10)] pl-2 mb-1.5">
                        <div className="text-[#0B1624]">{n.text}</div>
                        <div className="text-[10.5px] text-[rgba(11,22,36,0.55)] mt-0.5">{n.actor} · {n.ts}</div>
                      </div>
                    ))}
                    <div className="flex items-start gap-2 mt-2">
                      <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…"
                        className="min-h-[60px] text-[12px] bg-white border-[rgba(15,23,42,0.12)]" />
                      <Button size="sm" className="h-8 bg-[#0B1624] hover:bg-[#0B1624]/90 text-white" onClick={postNote}>
                        <MessageSquare className="w-3.5 h-3.5 mr-1" /> Post
                      </Button>
                    </div>
                  </Section>

                  <div className="flex items-center gap-2 pt-2 border-t border-[rgba(15,23,42,0.08)]">
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] border-[rgba(15,23,42,0.12)]"
                      onClick={() => applyAction([open.id], "ack")}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Acknowledge
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] border-[rgba(15,23,42,0.12)]"
                      onClick={() => applyAction([open.id], "assign")}>
                      <UserPlus className="w-3.5 h-3.5 mr-1" /> Assign to me
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] border-[#991B1B]/30 text-[#991B1B] hover:bg-[#991B1B]/5"
                      onClick={() => applyAction([open.id], "escalate")}>
                      <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Escalate
                    </Button>
                    <Button size="sm" className="h-8 text-[11.5px] bg-[#16A34A] hover:bg-[#16A34A]/90 text-white ml-auto"
                      onClick={() => applyAction([open.id], "resolve")}>
                      <CheckCheck className="w-3.5 h-3.5 mr-1" /> Resolve
                    </Button>
                  </div>

                  <Button asChild variant="ghost" size="sm" className="h-8 text-[11.5px] text-[rgba(11,22,36,0.65)] w-full justify-center">
                    <Link to="/hypermcp/audit-logs"><FileSearch className="w-3.5 h-3.5 mr-1" /> View Related Logs</Link>
                  </Button>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-medium uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-1.5">{title}</div>
      {children}
    </div>
  );
}
