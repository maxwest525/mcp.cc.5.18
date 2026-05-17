import { useMemo, useState } from "react";
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
  Rocket, Search, FileText, Undo2, ArrowUpRight, CheckCircle2, XCircle,
  Clock, AlertTriangle, GitBranch, Workflow, Plug, ArrowRightLeft, Brain,
  KeyRound, ListChecks, Bell, ShieldCheck, History, Layers, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Env = "development" | "staging" | "production";
type DeployStatus = "queued" | "running" | "validating" | "succeeded" | "failed" | "rolled_back";
type DeployType =
  | "workflow"
  | "integration"
  | "mapping"
  | "ai_routing"
  | "credential_rotation"
  | "queue_config"
  | "notification_rule";

interface ValidationCheck {
  id: string;
  label: string;
  status: "pass" | "fail" | "pending" | "skipped";
  detail?: string;
}

interface Deployment {
  id: string;
  component: string;
  type: DeployType;
  env: Env;
  version: string;
  prevVersion: string;
  status: DeployStatus;
  startedBy: string;
  startedAt: string;
  durationSec: number;
  affected: string[];
  before: string;
  after: string;
  approval: string;
  rollbackEligible: boolean;
  relatedWorkflows: string[];
  relatedIntegrations: string[];
  validations: ValidationCheck[];
  logs: { ts: string; level: "info" | "warn" | "error"; msg: string }[];
}

const TYPE_META: Record<DeployType, { label: string; Icon: typeof Plug }> = {
  workflow:             { label: "Workflow Deployment",         Icon: Workflow },
  integration:          { label: "Integration Deployment",      Icon: Plug },
  mapping:              { label: "Mapping Deployment",          Icon: ArrowRightLeft },
  ai_routing:           { label: "AI Routing Deployment",       Icon: Brain },
  credential_rotation:  { label: "Credential Rotation",         Icon: KeyRound },
  queue_config:         { label: "Queue Configuration",         Icon: ListChecks },
  notification_rule:   { label: "Notification Rule Deployment", Icon: Bell },
};

const ENV_META: Record<Env, { label: string; cls: string }> = {
  development: { label: "Development", cls: "text-[#0B1624] bg-[#0B1624]/5 border-[#0B1624]/15" },
  staging:     { label: "Staging",     cls: "text-[#B45309] bg-[#F59E0B]/10 border-[#F59E0B]/40" },
  production:  { label: "Production",  cls: "text-[#16A34A] bg-[#22C55E]/10 border-[#22C55E]/40" },
};

const STATUS_META: Record<DeployStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  queued:      { label: "Queued",      cls: "text-[#0B1624] bg-[#0B1624]/5 border-[#0B1624]/15",  Icon: Clock },
  running:     { label: "Running",     cls: "text-[#1D4ED8] bg-[#3B82F6]/10 border-[#3B82F6]/30", Icon: RefreshCw },
  validating:  { label: "Validating",  cls: "text-[#7C3AED] bg-[#7C3AED]/10 border-[#7C3AED]/30", Icon: ShieldCheck },
  succeeded:   { label: "Succeeded",   cls: "text-[#16A34A] bg-[#22C55E]/10 border-[#22C55E]/40", Icon: CheckCircle2 },
  failed:      { label: "Failed",      cls: "text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/40", Icon: XCircle },
  rolled_back: { label: "Rolled Back", cls: "text-[#991B1B] bg-[#991B1B]/10 border-[#991B1B]/30", Icon: Undo2 },
};

const DEPLOYMENTS: Deployment[] = [
  {
    id: "DPL-2041", component: "Salesforce → CRM Lead Sync", type: "integration", env: "production",
    version: "v4.12.0", prevVersion: "v4.11.3", status: "succeeded", startedBy: "Marcus Lee",
    startedAt: "2026-05-14 09:42", durationSec: 184,
    affected: ["sync-jobs/sf-leads", "mappings/sf-lead-v4", "queues/sf-inbound"],
    before: "OAuth refresh interval: 6h; mapping schema v3.9", after: "OAuth refresh interval: 1h; mapping schema v4.0",
    approval: "AP-1187 — Approved by D. Wright",
    rollbackEligible: true,
    relatedWorkflows: ["wf-lead-routing", "wf-dedupe"],
    relatedIntegrations: ["Salesforce", "TruMove CRM"],
    validations: [
      { id: "v1", label: "API Connectivity",        status: "pass" },
      { id: "v2", label: "Mapping Validation",      status: "pass" },
      { id: "v3", label: "Queue Validation",        status: "pass" },
      { id: "v4", label: "Credential Validation",   status: "pass" },
      { id: "v5", label: "Workflow Dependencies",   status: "pass" },
      { id: "v6", label: "Approval Completion",     status: "pass" },
    ],
    logs: [
      { ts: "09:42:01", level: "info",  msg: "Deployment DPL-2041 initiated by Marcus Lee" },
      { ts: "09:42:08", level: "info",  msg: "Pre-flight validations queued (6 checks)" },
      { ts: "09:43:22", level: "info",  msg: "Salesforce OAuth handshake successful" },
      { ts: "09:44:11", level: "info",  msg: "Mapping schema v4.0 promoted to production" },
      { ts: "09:45:05", level: "info",  msg: "Deployment succeeded — 184s elapsed" },
    ],
  },
  {
    id: "DPL-2040", component: "Quote Approval Workflow", type: "workflow", env: "staging",
    version: "v2.8.1", prevVersion: "v2.8.0", status: "validating", startedBy: "Priya Shah",
    startedAt: "2026-05-14 09:38", durationSec: 92,
    affected: ["workflows/quote-approval", "rules/threshold-5k"],
    before: "Auto-approve under $4,000", after: "Auto-approve under $5,000 (+ manager review tier)",
    approval: "AP-1186 — Pending second reviewer",
    rollbackEligible: true,
    relatedWorkflows: ["wf-quote-approval"],
    relatedIntegrations: ["TruMove CRM"],
    validations: [
      { id: "v1", label: "API Connectivity",        status: "pass" },
      { id: "v2", label: "Mapping Validation",      status: "pass" },
      { id: "v3", label: "Queue Validation",        status: "pending" },
      { id: "v4", label: "Credential Validation",   status: "pass" },
      { id: "v5", label: "Workflow Dependencies",   status: "pending" },
      { id: "v6", label: "Approval Completion",     status: "pending", detail: "Awaiting second reviewer" },
    ],
    logs: [
      { ts: "09:38:01", level: "info", msg: "Deployment DPL-2040 initiated by Priya Shah" },
      { ts: "09:38:15", level: "info", msg: "Workflow snapshot captured (rev 218)" },
      { ts: "09:39:02", level: "warn", msg: "Awaiting approval AP-1186 second reviewer" },
    ],
  },
  {
    id: "DPL-2039", component: "Twilio SMS Credentials", type: "credential_rotation", env: "production",
    version: "key-2026-05", prevVersion: "key-2026-02", status: "succeeded", startedBy: "System (cron)",
    startedAt: "2026-05-14 04:00", durationSec: 41,
    affected: ["secrets/TWILIO_AUTH_TOKEN", "integrations/twilio"],
    before: "Token issued 2026-02-14", after: "Token issued 2026-05-14 (90-day rotation)",
    approval: "Auto-approved (rotation policy)",
    rollbackEligible: false,
    relatedWorkflows: ["wf-sms-dispatch"],
    relatedIntegrations: ["Twilio", "ClickSend"],
    validations: [
      { id: "v1", label: "API Connectivity",        status: "pass" },
      { id: "v2", label: "Credential Validation",   status: "pass" },
      { id: "v3", label: "Workflow Dependencies",   status: "pass" },
      { id: "v4", label: "Approval Completion",     status: "skipped", detail: "Auto-approved by policy" },
    ],
    logs: [
      { ts: "04:00:01", level: "info", msg: "Scheduled rotation triggered" },
      { ts: "04:00:38", level: "info", msg: "Old credential revoked; new credential live" },
    ],
  },
  {
    id: "DPL-2038", component: "Lead Scoring AI Router", type: "ai_routing", env: "production",
    version: "v1.4.0", prevVersion: "v1.3.2", status: "failed", startedBy: "Devon Wright",
    startedAt: "2026-05-13 22:14", durationSec: 312,
    affected: ["ai/lead-scoring", "models/gpt-5-mini", "models/gemini-2.5-flash"],
    before: "Primary: gpt-5-mini, Fallback: gemini-2.5-flash", after: "Primary: gemini-2.5-pro, Fallback: gpt-5",
    approval: "AP-1183 — Approved by M. Lee",
    rollbackEligible: true,
    relatedWorkflows: ["wf-lead-scoring"],
    relatedIntegrations: ["Lovable AI Gateway"],
    validations: [
      { id: "v1", label: "API Connectivity",        status: "pass" },
      { id: "v2", label: "Mapping Validation",      status: "pass" },
      { id: "v3", label: "Queue Validation",        status: "pass" },
      { id: "v4", label: "Credential Validation",   status: "pass" },
      { id: "v5", label: "Workflow Dependencies",   status: "fail", detail: "wf-lead-scoring expects schema v1.3" },
      { id: "v6", label: "Approval Completion",     status: "pass" },
    ],
    logs: [
      { ts: "22:14:01", level: "info",  msg: "Deployment DPL-2038 initiated" },
      { ts: "22:18:42", level: "error", msg: "Workflow dependency check failed — schema mismatch" },
      { ts: "22:19:13", level: "error", msg: "Deployment aborted — no changes applied" },
    ],
  },
  {
    id: "DPL-2037", component: "FMCSA Inbound Webhook Queue", type: "queue_config", env: "staging",
    version: "v1.2.0", prevVersion: "v1.1.4", status: "succeeded", startedBy: "Marcus Lee",
    startedAt: "2026-05-13 18:02", durationSec: 67,
    affected: ["queues/fmcsa-inbound", "dlq/fmcsa-failed"],
    before: "Concurrency 4, retry 3x", after: "Concurrency 8, retry 5x with backoff",
    approval: "AP-1180 — Approved",
    rollbackEligible: true,
    relatedWorkflows: ["wf-carrier-vetting"],
    relatedIntegrations: ["FMCSA"],
    validations: [
      { id: "v1", label: "Queue Validation",        status: "pass" },
      { id: "v2", label: "Workflow Dependencies",   status: "pass" },
      { id: "v3", label: "Approval Completion",     status: "pass" },
    ],
    logs: [
      { ts: "18:02:01", level: "info", msg: "Queue config promotion started" },
      { ts: "18:03:08", level: "info", msg: "Configuration applied; consumers restarted" },
    ],
  },
  {
    id: "DPL-2036", component: "Mailchimp → Customer Sync", type: "mapping", env: "production",
    version: "v2.1.0", prevVersion: "v2.0.7", status: "rolled_back", startedBy: "Priya Shah",
    startedAt: "2026-05-13 14:21", durationSec: 240,
    affected: ["mappings/mc-customer-v2", "sync-jobs/mc-sync"],
    before: "Field map v2.0.7", after: "Field map v2.1.0 (rolled back to v2.0.7)",
    approval: "AP-1178 — Approved",
    rollbackEligible: false,
    relatedWorkflows: ["wf-customer-sync"],
    relatedIntegrations: ["Mailchimp"],
    validations: [
      { id: "v1", label: "Mapping Validation",      status: "fail", detail: "Field 'lifecycle_stage' missing in target" },
      { id: "v2", label: "Workflow Dependencies",   status: "pass" },
    ],
    logs: [
      { ts: "14:21:01", level: "info",  msg: "Deployment DPL-2036 initiated" },
      { ts: "14:24:33", level: "error", msg: "Mapping validation failed post-deploy" },
      { ts: "14:25:01", level: "warn",  msg: "Auto-rollback triggered to v2.0.7" },
      { ts: "14:25:21", level: "info",  msg: "Rollback complete" },
    ],
  },
  {
    id: "DPL-2035", component: "Critical Alert Notification Rule", type: "notification_rule", env: "development",
    version: "v0.9.1", prevVersion: "v0.9.0", status: "running", startedBy: "Devon Wright",
    startedAt: "2026-05-14 09:55", durationSec: 22,
    affected: ["rules/critical-integration-alert"],
    before: "Trigger: webhook_failed > 5/min", after: "Trigger: webhook_failed > 3/min + Slack escalation",
    approval: "Not required (development)",
    rollbackEligible: true,
    relatedWorkflows: ["wf-alert-dispatch"],
    relatedIntegrations: ["Slack", "Resend"],
    validations: [
      { id: "v1", label: "Approval Completion",     status: "skipped", detail: "Dev environment" },
      { id: "v2", label: "Workflow Dependencies",   status: "pending" },
    ],
    logs: [
      { ts: "09:55:01", level: "info", msg: "Dev deployment in progress" },
    ],
  },
];

const TIMELINE = [
  { ts: "09:55", kind: "Deployment",            label: "DPL-2035 started — Critical Alert Rule (dev)" },
  { ts: "09:42", kind: "Deployment",            label: "DPL-2041 succeeded — Salesforce Lead Sync (prod)" },
  { ts: "09:38", kind: "Promotion",             label: "DPL-2040 promoted to staging — Quote Approval" },
  { ts: "04:00", kind: "Rotation",              label: "DPL-2039 succeeded — Twilio credential rotated" },
  { ts: "Yest 22:19", kind: "Failed Validation", label: "DPL-2038 failed — workflow dependency mismatch" },
  { ts: "Yest 14:25", kind: "Rollback",         label: "DPL-2036 rolled back — Mailchimp mapping v2.1" },
  { ts: "Yest 18:03", kind: "Promotion",        label: "DPL-2037 promoted — FMCSA queue config (stg)" },
];

function fmtDuration(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); const r = s % 60;
  return `${m}m ${r}s`;
}

export default function AdminHyperMCPDeploymentCenter() {
  const [search, setSearch] = useState("");
  const [envFilter, setEnvFilter] = useState<"all" | Env>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | DeployStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | DeployType>("all");
  const [active, setActive] = useState<Deployment | null>(null);

  const filtered = useMemo(() => {
    return DEPLOYMENTS.filter((d) => {
      if (envFilter !== "all" && d.env !== envFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (search && !`${d.id} ${d.component} ${d.startedBy}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, envFilter, statusFilter, typeFilter]);

  const kpis = useMemo(() => {
    const active = DEPLOYMENTS.filter((d) => ["running", "validating", "queued"].includes(d.status)).length;
    const prod = DEPLOYMENTS.filter((d) => d.env === "production" && d.status === "succeeded").length;
    const failed = DEPLOYMENTS.filter((d) => d.status === "failed").length;
    const rolled = DEPLOYMENTS.filter((d) => d.status === "rolled_back").length;
    const pending = DEPLOYMENTS.filter((d) => d.validations.some((v) => v.status === "pending" && v.label === "Approval Completion")).length;
    const succeeded = DEPLOYMENTS.filter((d) => d.status === "succeeded");
    const avg = succeeded.length
      ? Math.round(succeeded.reduce((s, d) => s + d.durationSec, 0) / succeeded.length)
      : 0;
    return { active, prod, failed, rolled, pending, avg };
  }, []);

  return (
    <HyperMCPShell breadcrumb="Deployment Center">
      <div className="px-6 py-5 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Rocket className="w-5 h-5 text-[#16A34A]" />
              Deployment Center
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Deploy, monitor, validate, and roll back integrations, workflows, and orchestration changes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.info("Viewing deployment logs")}>
              <FileText className="w-3.5 h-3.5 mr-1.5" /> View Deployment Logs
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.warning("Rollback flow opened")}>
              <Undo2 className="w-3.5 h-3.5 mr-1.5" /> Rollback Release
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Promotion to production initiated")}>
              <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" /> Promote to Production
            </Button>
            <Button size="sm" onClick={() => toast.success("New deployment wizard launched")}>
              <Rocket className="w-3.5 h-3.5 mr-1.5" /> New Deployment
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: "Active Deployments",   value: kpis.active,  Icon: RefreshCw,   tone: "text-[#1D4ED8]" },
            { label: "Production Releases",  value: kpis.prod,    Icon: CheckCircle2, tone: "text-[#16A34A]" },
            { label: "Failed Deployments",   value: kpis.failed,  Icon: XCircle,     tone: "text-[#DC2626]" },
            { label: "Rollbacks",            value: kpis.rolled,  Icon: Undo2,       tone: "text-[#991B1B]" },
            { label: "Pending Approvals",    value: kpis.pending, Icon: ShieldCheck, tone: "text-[#7C3AED]" },
            { label: "Avg Deployment Time",  value: fmtDuration(kpis.avg), Icon: Clock, tone: "text-[#0B1624]" },
          ].map((k) => (
            <Card key={k.label} className="p-3 border-border/80 shadow-[0_1px_0_rgba(11,22,36,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{k.label}</span>
                <k.Icon className={cn("w-3.5 h-3.5", k.tone)} />
              </div>
              <div className="text-[20px] font-semibold mt-1 tabular-nums">{k.value}</div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-3 border-border/80">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search deployments by ID, component, or owner…"
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={envFilter} onValueChange={(v) => setEnvFilter(v as any)}>
              <SelectTrigger className="h-9 w-[150px] text-sm"><SelectValue placeholder="Environment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="h-9 w-[200px] text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TYPE_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Deployment Table */}
        <Card className="border-border/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/40 border-b border-border/80 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Deployment ID</th>
                  <th className="text-left font-medium px-3 py-2">Component</th>
                  <th className="text-left font-medium px-3 py-2">Type</th>
                  <th className="text-left font-medium px-3 py-2">Env</th>
                  <th className="text-left font-medium px-3 py-2">Version</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                  <th className="text-left font-medium px-3 py-2">Started By</th>
                  <th className="text-left font-medium px-3 py-2">Started At</th>
                  <th className="text-left font-medium px-3 py-2">Duration</th>
                  <th className="text-right font-medium px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const T = TYPE_META[d.type]; const S = STATUS_META[d.status]; const E = ENV_META[d.env];
                  return (
                    <tr key={d.id} className="border-b border-border/60 hover:bg-muted/30 cursor-pointer" onClick={() => setActive(d)}>
                      <td className="px-3 py-2 font-mono text-[12px] text-foreground">{d.id}</td>
                      <td className="px-3 py-2 font-medium text-foreground">{d.component}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground/80">
                          <T.Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          {T.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("inline-flex px-1.5 py-0.5 rounded border text-[11px] font-medium", E.cls)}>{E.label}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[12px] text-foreground/80">
                        {d.prevVersion} <span className="text-muted-foreground">→</span> {d.version}
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium", S.cls)}>
                          <S.Icon className={cn("w-3 h-3", d.status === "running" && "animate-spin")} />
                          {S.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-foreground/80">{d.startedBy}</td>
                      <td className="px-3 py-2 text-muted-foreground tabular-nums">{d.startedAt}</td>
                      <td className="px-3 py-2 tabular-nums text-foreground/80">{fmtDuration(d.durationSec)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-[12px]" onClick={(e) => { e.stopPropagation(); setActive(d); }}>
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-3 py-10 text-center text-muted-foreground text-sm">No deployments match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Lower grid: Rollback Center + Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-4 border-border/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#16A34A]" />
                <h2 className="text-[14px] font-semibold text-foreground">Rollback Center</h2>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {DEPLOYMENTS.filter((d) => d.rollbackEligible).length} rollback-eligible releases
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/80">
                  <tr>
                    <th className="text-left font-medium py-1.5 pr-2">Release</th>
                    <th className="text-left font-medium py-1.5 pr-2">Component</th>
                    <th className="text-left font-medium py-1.5 pr-2">Env</th>
                    <th className="text-left font-medium py-1.5 pr-2">Versions</th>
                    <th className="text-right font-medium py-1.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {DEPLOYMENTS.filter((d) => d.rollbackEligible).map((d) => {
                    const E = ENV_META[d.env];
                    return (
                      <tr key={d.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-2 font-mono text-[12px]">{d.id}</td>
                        <td className="py-2 pr-2 text-foreground/80">{d.component}</td>
                        <td className="py-2 pr-2">
                          <span className={cn("inline-flex px-1.5 py-0.5 rounded border text-[11px] font-medium", E.cls)}>{E.label}</span>
                        </td>
                        <td className="py-2 pr-2 font-mono text-[12px] text-foreground/70">
                          {d.prevVersion} ↔ {d.version}
                        </td>
                        <td className="py-2 text-right space-x-1">
                          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => toast.info(`Comparing ${d.prevVersion} ↔ ${d.version}`)}>
                            <Layers className="w-3 h-3 mr-1" /> Compare
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => toast.success(`Restored ${d.prevVersion}`)}>
                            <GitBranch className="w-3 h-3 mr-1" /> Restore
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => toast.warning(`Rolling back ${d.id}`)}>
                            <Undo2 className="w-3 h-3 mr-1" /> Roll Back
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 border-border/80">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[#16A34A]" />
              <h2 className="text-[14px] font-semibold text-foreground">Deployment Timeline</h2>
            </div>
            <ol className="relative border-l border-border/80 ml-1 space-y-3">
              {TIMELINE.map((t, i) => (
                <li key={i} className="pl-3 -ml-px">
                  <div className="absolute -left-[5px] mt-1 w-2 h-2 rounded-full bg-[#16A34A]" />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{t.kind}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{t.ts}</span>
                  </div>
                  <p className="text-[12.5px] text-foreground/85 leading-snug">{t.label}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto">
          {active && (() => {
            const T = TYPE_META[active.type]; const S = STATUS_META[active.status]; const E = ENV_META[active.env];
            return (
              <>
                <SheetHeader className="border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                    {active.id}
                    <span className={cn("inline-flex px-1.5 py-0.5 rounded border text-[11px] font-medium", E.cls)}>{E.label}</span>
                    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium", S.cls)}>
                      <S.Icon className="w-3 h-3" /> {S.label}
                    </span>
                  </div>
                  <SheetTitle className="text-[16px] flex items-center gap-2">
                    <T.Icon className="w-4 h-4 text-[#16A34A]" /> {active.component}
                  </SheetTitle>
                  <SheetDescription className="text-[12px]">
                    {T.label} · started by {active.startedBy} · {active.startedAt} · {fmtDuration(active.durationSec)}
                  </SheetDescription>
                </SheetHeader>

                <div className="py-4 space-y-5">
                  {/* Summary */}
                  <section>
                    <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Summary</h3>
                    <div className="grid grid-cols-2 gap-2 text-[12.5px]">
                      <div className="border border-border/70 rounded p-2">
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Previous Version</div>
                        <div className="font-mono">{active.prevVersion}</div>
                      </div>
                      <div className="border border-border/70 rounded p-2">
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wider">New Version</div>
                        <div className="font-mono">{active.version}</div>
                      </div>
                      <div className="border border-border/70 rounded p-2 col-span-2">
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Approval</div>
                        <div>{active.approval}</div>
                      </div>
                    </div>
                  </section>

                  {/* Affected systems */}
                  <section>
                    <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Affected Systems</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {active.affected.map((a) => (
                        <span key={a} className="font-mono text-[11px] px-1.5 py-0.5 rounded border border-border/80 bg-muted/40">{a}</span>
                      ))}
                    </div>
                  </section>

                  {/* Before / After */}
                  <section>
                    <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Configuration Diff</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="border border-[#DC2626]/30 bg-[#DC2626]/5 rounded p-2 text-[12px]">
                        <div className="text-[10px] uppercase tracking-wider text-[#DC2626] font-semibold mb-1">Before</div>
                        {active.before}
                      </div>
                      <div className="border border-[#22C55E]/40 bg-[#22C55E]/5 rounded p-2 text-[12px]">
                        <div className="text-[10px] uppercase tracking-wider text-[#16A34A] font-semibold mb-1">After</div>
                        {active.after}
                      </div>
                    </div>
                  </section>

                  {/* Validation Checks */}
                  <section>
                    <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Validation Checks</h3>
                    <div className="border border-border/80 rounded divide-y divide-border/60">
                      {active.validations.map((v) => {
                        const Icon = v.status === "pass" ? CheckCircle2 : v.status === "fail" ? XCircle : v.status === "pending" ? Clock : AlertTriangle;
                        const tone =
                          v.status === "pass" ? "text-[#16A34A]" :
                          v.status === "fail" ? "text-[#DC2626]" :
                          v.status === "pending" ? "text-[#1D4ED8]" : "text-muted-foreground";
                        return (
                          <div key={v.id} className="flex items-start justify-between gap-2 px-2.5 py-1.5">
                            <div className="flex items-start gap-2">
                              <Icon className={cn("w-3.5 h-3.5 mt-0.5", tone)} />
                              <div>
                                <div className="text-[12.5px] text-foreground">{v.label}</div>
                                {v.detail && <div className="text-[11px] text-muted-foreground">{v.detail}</div>}
                              </div>
                            </div>
                            <span className={cn("text-[10px] uppercase tracking-wider font-semibold", tone)}>{v.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Related */}
                  <section className="grid grid-cols-2 gap-3">
                    <div>
                      <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Related Workflows</h3>
                      <ul className="space-y-1 text-[12.5px]">
                        {active.relatedWorkflows.map((w) => (
                          <li key={w} className="font-mono text-foreground/85">{w}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Related Integrations</h3>
                      <ul className="space-y-1 text-[12.5px]">
                        {active.relatedIntegrations.map((w) => (
                          <li key={w} className="text-foreground/85">{w}</li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  {/* Logs */}
                  <section>
                    <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Deployment Logs</h3>
                    <div className="border border-border/80 rounded bg-[#0B1624] text-[#E2E8F0] font-mono text-[11.5px] p-2 max-h-56 overflow-y-auto">
                      {active.logs.map((l, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-[#64748B]">{l.ts}</span>
                          <span className={cn(
                            "uppercase font-semibold",
                            l.level === "info" && "text-[#22C55E]",
                            l.level === "warn" && "text-[#F59E0B]",
                            l.level === "error" && "text-[#F87171]",
                          )}>{l.level}</span>
                          <span className="text-[#E2E8F0]">{l.msg}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Rollback */}
                  <section className="flex items-center justify-between border-t border-border/80 pt-3">
                    <div className="text-[12px] text-muted-foreground">
                      {active.rollbackEligible
                        ? <>Rollback eligible — restore <span className="font-mono">{active.prevVersion}</span></>
                        : <>Rollback not available for this deployment type</>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => toast.info("Comparing versions")}>
                        <Layers className="w-3.5 h-3.5 mr-1.5" /> Compare
                      </Button>
                      <Button size="sm" variant="outline" disabled={!active.rollbackEligible} onClick={() => toast.warning(`Rolling back ${active.id}`)}>
                        <Undo2 className="w-3.5 h-3.5 mr-1.5" /> Roll Back
                      </Button>
                    </div>
                  </section>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}
