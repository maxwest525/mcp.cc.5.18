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
  ArrowLeft, ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle,
  Search, Download, MessageSquare, ArrowUpRight, FileText, ChevronRight,
  KeyRound, Plug, Workflow, Zap, ShieldAlert, Brain, ArrowRightLeft, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Risk = "low" | "medium" | "high" | "critical";
type Status = "pending" | "approved" | "rejected" | "changes_requested" | "escalated" | "overdue";
type ReqType =
  | "credential_rotation"
  | "integration_reconnect"
  | "workflow_deployment"
  | "automation_rule_change"
  | "vendor_risk_escalation"
  | "ai_action_recommendation"
  | "data_mapping_change"
  | "bulk_retry_request";

interface ApprovalRequest {
  id: string;
  type: ReqType;
  title: string;
  requestedBy: string;
  system: string;
  risk: Risk;
  createdAt: string;
  dueBy: string;
  status: Status;
  reason: string;
  systemsAffected: string[];
  before: string;
  after: string;
  riskExplanation: string;
  auditRefs: { id: string; label: string }[];
  related: { id: string; label: string };
  history: { ts: string; actor: string; action: string }[];
  comments: { ts: string; actor: string; text: string }[];
}

const TYPE_META: Record<ReqType, { label: string; Icon: typeof KeyRound }> = {
  credential_rotation:      { label: "Credential Rotation",     Icon: KeyRound },
  integration_reconnect:    { label: "Integration Reconnect",   Icon: Plug },
  workflow_deployment:      { label: "Workflow Deployment",     Icon: Workflow },
  automation_rule_change:   { label: "Automation Rule Change",  Icon: Zap },
  vendor_risk_escalation:   { label: "Vendor Risk Escalation",  Icon: ShieldAlert },
  ai_action_recommendation: { label: "AI Action Recommendation", Icon: Brain },
  data_mapping_change:      { label: "Data Mapping Change",     Icon: ArrowRightLeft },
  bulk_retry_request:       { label: "Bulk Retry Request",      Icon: RefreshCw },
};

const REQUESTS: ApprovalRequest[] = [
  {
    id: "REQ-10421",
    type: "credential_rotation",
    title: "Rotate Twilio production API key",
    requestedBy: "system.security",
    system: "Twilio",
    risk: "critical",
    createdAt: "12 min ago",
    dueBy: "in 48 min",
    status: "pending",
    reason: "Quarterly rotation policy. Existing key reaching 90-day age limit.",
    systemsAffected: ["Twilio", "Outbound SMS workflows", "Pulse alerting"],
    before: "TWILIO_AUTH_TOKEN=•••••••a31f (issued 2026-02-13)",
    after:  "TWILIO_AUTH_TOKEN=•••••••c8d2 (new, dual-active for 60 min)",
    riskExplanation: "Failure to dual-activate could halt all outbound SMS for ~5 minutes. Revocation is irreversible.",
    auditRefs: [{ id: "AUD-88231", label: "Credential vault read" }, { id: "AUD-88240", label: "Rotation policy hit" }],
    related: { id: "WF-SMS-OUT", label: "Outbound SMS pipeline" },
    history: [
      { ts: "12 min ago", actor: "system.security", action: "Created request" },
      { ts: "10 min ago", actor: "policy.engine",   action: "Marked critical risk" },
    ],
    comments: [
      { ts: "8 min ago", actor: "j.harris", text: "Coordinating with on-call before approval." },
    ],
  },
  {
    id: "REQ-10418",
    type: "workflow_deployment",
    title: "Deploy lead-router v3.4 to production",
    requestedBy: "m.alvarez",
    system: "HyperMCP Workflows",
    risk: "high",
    createdAt: "34 min ago",
    dueBy: "in 3 hr",
    status: "pending",
    reason: "New routing logic for vendor-tier leads with revised SLA windows.",
    systemsAffected: ["Lead Router", "Vendor Dispatch", "CRM Pipeline"],
    before: "v3.3 — flat routing with 12 min SLA",
    after:  "v3.4 — tiered routing, 6/12/30 min SLA",
    riskExplanation: "Misrouted leads degrade vendor compliance score and cost-per-acquisition.",
    auditRefs: [{ id: "AUD-88119", label: "Workflow diff generated" }],
    related: { id: "WF-LEAD-ROUTER", label: "Lead Router" },
    history: [
      { ts: "34 min ago", actor: "m.alvarez",  action: "Submitted for review" },
      { ts: "30 min ago", actor: "ci.pipeline", action: "Tests passed (218/218)" },
    ],
    comments: [],
  },
  {
    id: "REQ-10415",
    type: "vendor_risk_escalation",
    title: "Escalate Carrier #88412 — repeated insurance lapses",
    requestedBy: "compliance.bot",
    system: "Vendor Compliance",
    risk: "high",
    createdAt: "1 hr ago",
    dueBy: "in 5 hr",
    status: "escalated",
    reason: "Three insurance certificate lapses detected in 30 days.",
    systemsAffected: ["Vendor Registry", "Dispatch Eligibility"],
    before: "Status: Active",
    after:  "Status: Suspended pending review",
    riskExplanation: "Continuing to dispatch this carrier exposes brokerage to liability claims.",
    auditRefs: [{ id: "AUD-87990", label: "FMCSA scrape" }],
    related: { id: "VEN-88412", label: "Carrier 88412" },
    history: [
      { ts: "1 hr ago", actor: "compliance.bot", action: "Auto-escalated" },
    ],
    comments: [
      { ts: "45 min ago", actor: "k.patel", text: "Escalating to legal." },
    ],
  },
  {
    id: "REQ-10410",
    type: "integration_reconnect",
    title: "Reconnect Google Ads OAuth — token expired",
    requestedBy: "integrations.monitor",
    system: "Google Ads",
    risk: "medium",
    createdAt: "2 hr ago",
    dueBy: "today",
    status: "pending",
    reason: "OAuth refresh token rejected 4 consecutive times.",
    systemsAffected: ["Marketing Sync", "Attribution pipeline"],
    before: "Status: Disconnected (4 failures)",
    after:  "Status: Reconnect with new consent screen",
    riskExplanation: "Loss of attribution data for ongoing campaigns.",
    auditRefs: [],
    related: { id: "INT-GADS", label: "Google Ads" },
    history: [{ ts: "2 hr ago", actor: "integrations.monitor", action: "Detected token failure" }],
    comments: [],
  },
  {
    id: "REQ-10404",
    type: "automation_rule_change",
    title: "Pause auto-dial after 5 missed calls within 10 min",
    requestedBy: "policy.team",
    system: "Pulse Dialer",
    risk: "medium",
    createdAt: "3 hr ago",
    dueBy: "tomorrow",
    status: "pending",
    reason: "Compliance request to reduce harassment risk on cold lists.",
    systemsAffected: ["Dialer", "Pulse compliance"],
    before: "No throttle on missed calls",
    after:  "Auto-pause + manager review after 5 misses / 10 min",
    riskExplanation: "Could slow throughput for high-velocity campaigns.",
    auditRefs: [],
    related: { id: "RULE-DIALER-22", label: "Dialer rule 22" },
    history: [{ ts: "3 hr ago", actor: "policy.team", action: "Submitted draft" }],
    comments: [],
  },
  {
    id: "REQ-10399",
    type: "ai_action_recommendation",
    title: "Trudy AI — auto-mark 142 leads as duplicate",
    requestedBy: "trudy.ai",
    system: "AI Orchestration",
    risk: "medium",
    createdAt: "4 hr ago",
    dueBy: "in 18 hr",
    status: "pending",
    reason: "Confidence ≥ 0.94 across all 142 leads using fuzzy match + phone fingerprint.",
    systemsAffected: ["Lead inbox", "CRM contacts"],
    before: "142 leads in active queue",
    after:  "142 leads merged into 71 master records",
    riskExplanation: "Incorrect merges require manual unmerge from audit log.",
    auditRefs: [{ id: "AUD-87811", label: "AI dedupe run" }],
    related: { id: "AGT-LEAD-CLASS", label: "Lead Classifier" },
    history: [{ ts: "4 hr ago", actor: "trudy.ai", action: "Generated recommendation" }],
    comments: [],
  },
  {
    id: "REQ-10380",
    type: "data_mapping_change",
    title: "Add `customer.lifetime_value` field mapping (HubSpot → CRM)",
    requestedBy: "d.nguyen",
    system: "Data Mapping",
    risk: "low",
    createdAt: "1 d ago",
    dueBy: "in 2 d",
    status: "pending",
    reason: "Enable LTV scoring in pipeline and reporting.",
    systemsAffected: ["HubSpot sync", "CRM contact schema"],
    before: "Field unmapped",
    after:  "HubSpot.contact.ltv → crm.contact.lifetime_value (numeric)",
    riskExplanation: "Low — additive column, backward compatible.",
    auditRefs: [],
    related: { id: "MAP-HS-CRM", label: "HubSpot mapping" },
    history: [{ ts: "1 d ago", actor: "d.nguyen", action: "Submitted change" }],
    comments: [],
  },
  {
    id: "REQ-10371",
    type: "bulk_retry_request",
    title: "Bulk retry 4,218 stalled e-sign delivery jobs",
    requestedBy: "ops.console",
    system: "Task Queue",
    risk: "high",
    createdAt: "1 d ago",
    dueBy: "overdue 2 hr",
    status: "overdue",
    reason: "Provider outage cleared. Queue eligible for replay.",
    systemsAffected: ["E-Sign queue", "Email infra", "SMS infra"],
    before: "4,218 jobs in failed state",
    after:  "Queued for staggered retry (200/min)",
    riskExplanation: "Risk of duplicate delivery if idempotency keys are stale.",
    auditRefs: [{ id: "AUD-87503", label: "Provider outage report" }],
    related: { id: "Q-ESIGN", label: "E-Sign queue" },
    history: [
      { ts: "1 d ago", actor: "ops.console", action: "Submitted bulk retry" },
    ],
    comments: [
      { ts: "20 hr ago", actor: "r.santos", text: "Waiting on provider confirmation." },
    ],
  },
];

const RISK_META: Record<Risk, { label: string; cls: string; ring?: string }> = {
  low:      { label: "Low",      cls: "text-[#0B1624] bg-[#0B1624]/5 border-[#0B1624]/15" },
  medium:   { label: "Medium",   cls: "text-[#1D4ED8] bg-[#3B82F6]/10 border-[#3B82F6]/30" },
  high:     { label: "High",     cls: "text-[#D97706] bg-[#F59E0B]/10 border-[#F59E0B]/40" },
  critical: { label: "Critical", cls: "text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/40", ring: "ring-1 ring-[#DC2626]/30" },
};

const STATUS_META: Record<Status, { label: string; cls: string; Icon: typeof Clock }> = {
  pending:           { label: "Pending",           cls: "text-[#0B1624] bg-[#0B1624]/5 border-[#0B1624]/15", Icon: Clock },
  approved:          { label: "Approved",          cls: "text-[#16A34A] bg-[#22C55E]/10 border-[#22C55E]/40", Icon: CheckCircle2 },
  rejected:          { label: "Rejected",          cls: "text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/40", Icon: XCircle },
  changes_requested: { label: "Changes Requested", cls: "text-[#D97706] bg-[#F59E0B]/10 border-[#F59E0B]/40", Icon: MessageSquare },
  escalated:         { label: "Escalated",         cls: "text-[#7C3AED] bg-[#7C3AED]/10 border-[#7C3AED]/30", Icon: ArrowUpRight },
  overdue:           { label: "Overdue",           cls: "text-[#991B1B] bg-[#991B1B]/10 border-[#991B1B]/30", Icon: AlertTriangle },
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap", className)}>
      {children}
    </span>
  );
}

export default function AdminHyperMCPApprovals() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(REQUESTS);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const stats = useMemo(() => {
    const pending = requests.filter(r => r.status === "pending" || r.status === "overdue" || r.status === "escalated").length;
    const highRisk = requests.filter(r => (r.risk === "high" || r.risk === "critical") && r.status === "pending").length;
    const cred = requests.filter(r => r.type === "credential_rotation").length;
    const deploy = requests.filter(r => r.type === "workflow_deployment").length;
    const ai = requests.filter(r => r.type === "ai_action_recommendation").length;
    const overdue = requests.filter(r => r.status === "overdue").length;
    return { pending, highRisk, cred, deploy, ai, overdue };
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter(r => {
      if (riskFilter !== "all" && r.risk !== riskFilter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.id, r.title, r.requestedBy, r.system, TYPE_META[r.type].label].some(v => v.toLowerCase().includes(q));
    });
  }, [requests, search, riskFilter, typeFilter, statusFilter]);

  const open = openId ? requests.find(r => r.id === openId) ?? null : null;

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

  function applyAction(ids: string[], action: "approve" | "reject" | "changes" | "escalate") {
    if (!ids.length) {
      toast.error("Nothing selected");
      return;
    }
    setRequests(prev => prev.map(r => {
      if (!ids.includes(r.id)) return r;
      const status: Status =
        action === "approve" ? "approved" :
        action === "reject" ? "rejected" :
        action === "changes" ? "changes_requested" : "escalated";
      return {
        ...r,
        status,
        history: [{ ts: "just now", actor: "you", action: STATUS_META[status].label }, ...r.history],
      };
    }));
    setSelected(new Set());
    const labels = { approve: "approved", reject: "rejected", changes: "marked for changes", escalate: "escalated" };
    toast.success(`${ids.length} request${ids.length > 1 ? "s" : ""} ${labels[action]}`);
  }

  function postComment() {
    if (!open || !comment.trim()) return;
    setRequests(prev => prev.map(r =>
      r.id === open.id
        ? { ...r, comments: [...r.comments, { ts: "just now", actor: "you", text: comment.trim() }] }
        : r
    ));
    setComment("");
    toast.success("Comment posted");
  }

  return (
    <HyperMCPShell>
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0B1624] text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-[#0B1624]">Approval Center</h1>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[rgba(15,23,42,0.10)] text-[rgba(11,22,36,0.62)] bg-white">
                    Hyper MCP
                  </span>
                </div>
                <p className="text-[13px] text-[rgba(11,22,36,0.62)] mt-0.5">
                  Review, approve, reject, or escalate sensitive HyperMCP actions before execution.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]">
                <Link to="/hypermcp"><ArrowLeft className="w-3.5 h-3.5" /> Back</Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]"
                onClick={() => toast.success("Approval queue exported")}>
                <Download className="w-3.5 h-3.5" /> Export Queue
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[#DC2626]/30 bg-white text-[#DC2626] hover:bg-[#DC2626]/5"
                onClick={() => applyAction([...selected], "reject")}>
                <XCircle className="w-3.5 h-3.5" /> Reject Selected
              </Button>
              <Button size="sm" className="h-8 gap-1.5 bg-[#0B1624] hover:bg-[#0B1624]/90 text-white"
                onClick={() => applyAction([...selected], "approve")}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve Selected
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Pending Approvals",   value: stats.pending,  hint: "awaiting review" },
              { label: "High-Risk Requests",  value: stats.highRisk, hint: "high + critical" },
              { label: "Credential Requests", value: stats.cred,     hint: "rotations / keys" },
              { label: "Workflow Deployments",value: stats.deploy,   hint: "ready to ship" },
              { label: "AI Recommendations",  value: stats.ai,       hint: "automated suggestions" },
              { label: "Overdue Reviews",     value: stats.overdue,  hint: "past due", danger: stats.overdue > 0 },
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
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by ID, title, requester, or system…"
                  className="h-8 pl-8 text-[12.5px] bg-white border-[rgba(15,23,42,0.12)]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[150px] text-[12px] bg-white border-[rgba(15,23,42,0.12)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="h-8 w-[140px] text-[12px] bg-white border-[rgba(15,23,42,0.12)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risk levels</SelectItem>
                  {Object.entries(RISK_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-[200px] text-[12px] bg-white border-[rgba(15,23,42,0.12)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All request types</SelectItem>
                  {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-[11px] text-[rgba(11,22,36,0.55)] ml-auto">
                {filtered.length} of {requests.length} · {selected.size} selected
              </span>
            </div>
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
                    <th className="px-3 py-2">Request</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Requested By</th>
                    <th className="px-3 py-2">System</th>
                    <th className="px-3 py-2">Risk</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Due By</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const TM = TYPE_META[r.type];
                    const RM = RISK_META[r.risk];
                    const SM = STATUS_META[r.status];
                    const elevated = r.risk === "high" || r.risk === "critical";
                    return (
                      <tr
                        key={r.id}
                        className={cn(
                          "border-b border-[rgba(15,23,42,0.06)] hover:bg-[#F7F8FA] cursor-pointer transition-colors",
                          elevated && r.status === "pending" && "bg-[#DC2626]/[0.015]"
                        )}
                        onClick={() => setOpenId(r.id)}
                      >
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selected.has(r.id)}
                            onCheckedChange={() => toggleOne(r.id)}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {elevated && (
                              <span className={cn("w-1 h-8 rounded-sm", r.risk === "critical" ? "bg-[#DC2626]" : "bg-[#F59E0B]")} />
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-[#0B1624] truncate">{r.title}</div>
                              <div className="text-[10.5px] text-[rgba(11,22,36,0.55)] tabular-nums">{r.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[#0B1624]">
                            <TM.Icon className="w-3.5 h-3.5 text-[rgba(11,22,36,0.55)]" />
                            {TM.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[rgba(11,22,36,0.75)]">{r.requestedBy}</td>
                        <td className="px-3 py-2.5 text-[rgba(11,22,36,0.75)]">{r.system}</td>
                        <td className="px-3 py-2.5">
                          <Badge className={cn(RM.cls, RM.ring)}>
                            {r.risk === "critical" && <AlertTriangle className="w-3 h-3" />}
                            {RM.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-[rgba(11,22,36,0.62)] whitespace-nowrap">{r.createdAt}</td>
                        <td className={cn("px-3 py-2.5 whitespace-nowrap tabular-nums",
                          r.status === "overdue" ? "text-[#DC2626] font-medium" : "text-[rgba(11,22,36,0.62)]")}>{r.dueBy}</td>
                        <td className="px-3 py-2.5">
                          <Badge className={SM.cls}><SM.Icon className="w-3 h-3" /> {SM.label}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button size="sm" variant="outline"
                            className="h-7 px-2 gap-1 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624] text-[11.5px]">
                            Review <ChevronRight className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} className="px-3 py-8 text-center text-[12px] text-[rgba(11,22,36,0.55)]">
                      No requests match your filters.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Detail Drawer */}
        <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
          <SheetContent side="right" className="w-full sm:max-w-[640px] bg-white p-0 overflow-y-auto">
            {open && (() => {
              const TM = TYPE_META[open.type];
              const RM = RISK_META[open.risk];
              const SM = STATUS_META[open.status];
              const elevated = open.risk === "high" || open.risk === "critical";
              return (
                <>
                  <SheetHeader className={cn(
                    "px-5 py-4 border-b border-[rgba(15,23,42,0.08)]",
                    elevated && "bg-gradient-to-b from-[#DC2626]/[0.04] to-transparent"
                  )}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#0B1624] text-white flex items-center justify-center shrink-0">
                        <TM.Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <SheetTitle className="text-[15px] font-semibold text-[#0B1624]">{open.title}</SheetTitle>
                          <Badge className={cn(RM.cls, RM.ring)}>
                            {open.risk === "critical" && <AlertTriangle className="w-3 h-3" />}
                            {RM.label} risk
                          </Badge>
                          <Badge className={SM.cls}><SM.Icon className="w-3 h-3" /> {SM.label}</Badge>
                        </div>
                        <SheetDescription className="text-[11.5px] text-[rgba(11,22,36,0.62)] mt-0.5 tabular-nums">
                          {open.id} · {TM.label} · requested by {open.requestedBy} · {open.createdAt}
                        </SheetDescription>
                      </div>
                    </div>
                    {elevated && (
                      <div className="mt-3 flex items-start gap-2 text-[11.5px] text-[#991B1B] bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-md px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>
                          {open.risk === "critical" ? "Critical" : "High"}-risk action — elevated review required.
                          Approval will be logged with your identity and is reversible only via audit unwind.
                        </span>
                      </div>
                    )}
                  </SheetHeader>

                  <div className="p-5 space-y-5">
                    {/* Summary */}
                    <Section title="Reason for request">
                      <p className="text-[12.5px] text-[#0B1624] leading-relaxed">{open.reason}</p>
                    </Section>

                    {/* Systems affected */}
                    <Section title="Systems affected">
                      <div className="flex flex-wrap gap-1.5">
                        {open.systemsAffected.map(s => (
                          <span key={s} className="text-[11px] px-2 py-0.5 rounded-md border border-[rgba(15,23,42,0.10)] bg-[#F7F8FA] text-[#0B1624]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </Section>

                    {/* Before / after */}
                    <Section title="Change preview">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="border border-[rgba(15,23,42,0.10)] rounded-md p-2.5 bg-[#F7F8FA]">
                          <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-1">Before</div>
                          <div className="text-[12px] text-[#0B1624] font-mono leading-snug break-words">{open.before}</div>
                        </div>
                        <div className="border border-[#22C55E]/30 rounded-md p-2.5 bg-[#22C55E]/5">
                          <div className="text-[10px] uppercase tracking-wider text-[#16A34A] mb-1">After</div>
                          <div className="text-[12px] text-[#0B1624] font-mono leading-snug break-words">{open.after}</div>
                        </div>
                      </div>
                    </Section>

                    {/* Risk explanation */}
                    <Section title="Risk explanation">
                      <p className="text-[12.5px] text-[#0B1624] leading-relaxed">{open.riskExplanation}</p>
                    </Section>

                    {/* Related */}
                    <Section title="Related">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[12px] border border-[rgba(15,23,42,0.08)] rounded-md px-2.5 py-1.5">
                          <span className="text-[rgba(11,22,36,0.62)]">Workflow / Event</span>
                          <span className="text-[#0B1624] font-medium tabular-nums">{open.related.id} — {open.related.label}</span>
                        </div>
                        {open.auditRefs.map(a => (
                          <div key={a.id} className="flex items-center justify-between text-[12px] border border-[rgba(15,23,42,0.08)] rounded-md px-2.5 py-1.5">
                            <span className="text-[rgba(11,22,36,0.62)] flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Audit log</span>
                            <span className="text-[#0B1624] font-medium tabular-nums">{a.id} — {a.label}</span>
                          </div>
                        ))}
                      </div>
                    </Section>

                    {/* History */}
                    <Section title="Approval history">
                      <ul className="space-y-1.5">
                        {open.history.map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0B1624]/40 mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[#0B1624]"><span className="font-medium">{h.actor}</span> · {h.action}</div>
                              <div className="text-[10.5px] text-[rgba(11,22,36,0.55)]">{h.ts}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </Section>

                    {/* Comments */}
                    <Section title="Comments">
                      <div className="space-y-2">
                        {open.comments.length === 0 && (
                          <div className="text-[11.5px] text-[rgba(11,22,36,0.55)] italic">No comments yet.</div>
                        )}
                        {open.comments.map((c, i) => (
                          <div key={i} className="border border-[rgba(15,23,42,0.08)] rounded-md p-2.5 bg-[#F7F8FA]">
                            <div className="flex items-center justify-between text-[10.5px] text-[rgba(11,22,36,0.55)] mb-1">
                              <span className="font-medium text-[#0B1624]">{c.actor}</span>
                              <span>{c.ts}</span>
                            </div>
                            <div className="text-[12px] text-[#0B1624]">{c.text}</div>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Add a comment…"
                            className="text-[12px] min-h-[60px] bg-white border-[rgba(15,23,42,0.12)]"
                          />
                          <Button size="sm" variant="outline" className="h-8 self-end border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]" onClick={postComment}>
                            Post
                          </Button>
                        </div>
                      </div>
                    </Section>
                  </div>

                  {/* Sticky actions */}
                  <div className="sticky bottom-0 border-t border-[rgba(15,23,42,0.08)] bg-white p-3 flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]"
                      onClick={() => { applyAction([open.id], "changes"); setOpenId(null); }}>
                      <MessageSquare className="w-3.5 h-3.5" /> Request Changes
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[#7C3AED]/30 bg-white text-[#7C3AED] hover:bg-[#7C3AED]/5"
                      onClick={() => { applyAction([open.id], "escalate"); setOpenId(null); }}>
                      <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
                    </Button>
                    <div className="ml-auto flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[#DC2626]/30 bg-white text-[#DC2626] hover:bg-[#DC2626]/5"
                        onClick={() => { applyAction([open.id], "reject"); setOpenId(null); }}>
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                      <Button size="sm" className="h-8 gap-1.5 bg-[#0B1624] hover:bg-[#0B1624]/90 text-white"
                        onClick={() => { applyAction([open.id], "approve"); setOpenId(null); }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
          </SheetContent>
        </Sheet>
      </div>
    </HyperMCPShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-1.5">{title}</div>
      {children}
    </div>
  );
}
