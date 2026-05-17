import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Layers, Search, Download, Plus, Copy, ArrowUpRight, AlertTriangle,
  CheckCircle2, XCircle, Clock, ShieldAlert, Plug, Workflow as WorkflowIcon,
  KeyRound, ListChecks, Brain, Webhook, FileText, ChevronRight, Undo2,
  PowerOff, GitCompare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─────────── Types ─────────── */

type EnvType = "development" | "staging" | "sandbox" | "production" | "recovery";
type EnvStatus = "healthy" | "degraded" | "validating" | "blocked" | "disabled";

interface EnvHistory { ts: string; type: "deploy" | "validate" | "promote" | "rollback"; text: string; status: "ok" | "fail" | "info"; }

interface Environment {
  id: string;
  name: string;
  type: EnvType;
  status: EnvStatus;
  integrations: number;
  workflows: number;
  lastDeployment: string;
  lastValidation: string;
  drift: number;
  credentials: string[];
  queueConfig: { name: string; concurrency: number; backlog: number }[];
  aiRouting: { model: string; role: string }[];
  webhooks: { name: string; status: "ok" | "warn" | "fail" }[];
  envVars: { key: string; masked: boolean }[];
  history: EnvHistory[];
  blockers: string[];
}

const TYPE_LABEL: Record<EnvType, string> = {
  development: "Development",
  staging: "Staging",
  sandbox: "Sandbox",
  production: "Production",
  recovery: "Recovery / Test",
};

const ENVIRONMENTS: Environment[] = [
  {
    id: "env_prod", name: "Production", type: "production", status: "healthy",
    integrations: 14, workflows: 23, lastDeployment: "2 hr ago", lastValidation: "8 min ago", drift: 0,
    credentials: ["prod-authnet", "prod-resend", "prod-twilio", "prod-supabase"],
    queueConfig: [
      { name: "intake.queue", concurrency: 8, backlog: 3 },
      { name: "dispatch.queue", concurrency: 4, backlog: 0 },
    ],
    aiRouting: [
      { model: "gemini-2.5-pro", role: "Orchestrator" },
      { model: "gpt-5-mini", role: "Classifier" },
    ],
    webhooks: [
      { name: "Authorize.net", status: "ok" },
      { name: "FMCSA", status: "ok" },
      { name: "Resend", status: "ok" },
    ],
    envVars: [
      { key: "AUTHNET_API_LOGIN", masked: true },
      { key: "RESEND_API_KEY", masked: true },
      { key: "PUBLIC_BASE_URL", masked: false },
    ],
    history: [
      { ts: "10:30", type: "validate", text: "Validation pass (47 checks)", status: "ok" },
      { ts: "08:18", type: "deploy", text: "Deployment v2.4.1 promoted from Staging", status: "ok" },
    ],
    blockers: [],
  },
  {
    id: "env_staging", name: "Staging", type: "staging", status: "validating",
    integrations: 14, workflows: 23, lastDeployment: "32 min ago", lastValidation: "Running", drift: 2,
    credentials: ["staging-authnet", "staging-resend", "staging-twilio"],
    queueConfig: [{ name: "intake.queue", concurrency: 4, backlog: 1 }],
    aiRouting: [{ model: "gemini-2.5-flash", role: "Orchestrator" }],
    webhooks: [
      { name: "Authorize.net Sandbox", status: "ok" },
      { name: "Resend Test", status: "warn" },
    ],
    envVars: [
      { key: "AUTHNET_API_LOGIN", masked: true },
      { key: "PUBLIC_BASE_URL", masked: false },
    ],
    history: [
      { ts: "10:42", type: "validate", text: "Validation in progress", status: "info" },
      { ts: "10:10", type: "deploy", text: "Deployment v2.4.2 from Dev", status: "ok" },
    ],
    blockers: [],
  },
  {
    id: "env_dev", name: "Development", type: "development", status: "healthy",
    integrations: 12, workflows: 19, lastDeployment: "12 min ago", lastValidation: "6 min ago", drift: 5,
    credentials: ["dev-authnet", "dev-resend"],
    queueConfig: [{ name: "intake.queue", concurrency: 2, backlog: 0 }],
    aiRouting: [{ model: "gemini-2.5-flash-lite", role: "Orchestrator" }],
    webhooks: [{ name: "Authorize.net Sandbox", status: "ok" }],
    envVars: [{ key: "PUBLIC_BASE_URL", masked: false }],
    history: [
      { ts: "10:32", type: "validate", text: "Validation pass (42/47)", status: "ok" },
      { ts: "10:30", type: "deploy", text: "Local deployment", status: "ok" },
    ],
    blockers: [],
  },
  {
    id: "env_sandbox", name: "Partner Sandbox", type: "sandbox", status: "degraded",
    integrations: 6, workflows: 9, lastDeployment: "1 d ago", lastValidation: "1 hr ago", drift: 8,
    credentials: ["sandbox-resend"],
    queueConfig: [{ name: "intake.queue", concurrency: 1, backlog: 0 }],
    aiRouting: [{ model: "gemini-2.5-flash-lite", role: "Orchestrator" }],
    webhooks: [{ name: "Resend Test", status: "warn" }, { name: "Twilio Test", status: "fail" }],
    envVars: [{ key: "PUBLIC_BASE_URL", masked: false }],
    history: [
      { ts: "09:14", type: "validate", text: "Twilio sandbox webhook failing", status: "fail" },
    ],
    blockers: ["Twilio sandbox webhook unreachable"],
  },
  {
    id: "env_recovery", name: "Recovery / Test", type: "recovery", status: "disabled",
    integrations: 14, workflows: 23, lastDeployment: "—", lastValidation: "—", drift: 0,
    credentials: ["snapshot-authnet"],
    queueConfig: [],
    aiRouting: [],
    webhooks: [],
    envVars: [],
    history: [{ ts: "Mon", type: "rollback", text: "Snapshot captured", status: "info" }],
    blockers: [],
  },
  {
    id: "env_blocked", name: "Staging-EU", type: "staging", status: "blocked",
    integrations: 11, workflows: 18, lastDeployment: "Pending", lastValidation: "Failed", drift: 4,
    credentials: ["staging-eu-authnet"],
    queueConfig: [{ name: "intake.queue", concurrency: 2, backlog: 0 }],
    aiRouting: [{ model: "gemini-2.5-flash", role: "Orchestrator" }],
    webhooks: [{ name: "Authorize.net Sandbox", status: "fail" }],
    envVars: [{ key: "AUTHNET_API_LOGIN", masked: true }],
    history: [
      { ts: "09:48", type: "validate", text: "Missing credential: EU_DKIM_KEY", status: "fail" },
    ],
    blockers: ["Missing credential: EU_DKIM_KEY", "Webhook handshake failed"],
  },
];

/* ─────────── Helpers ─────────── */

const statusBadge = (s: EnvStatus) => {
  const map: Record<EnvStatus, string> = {
    healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    degraded: "bg-amber-50 text-amber-700 border-amber-200",
    validating: "bg-blue-50 text-blue-700 border-blue-200",
    blocked: "bg-red-50 text-red-700 border-red-200",
    disabled: "bg-slate-50 text-slate-500 border-slate-200",
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border capitalize", map[s])}>{s}</span>;
};

const typeBadge = (t: EnvType) => {
  const map: Record<EnvType, string> = {
    production: "bg-slate-900 text-white border-slate-900",
    staging: "bg-blue-50 text-blue-700 border-blue-200",
    development: "bg-slate-100 text-slate-700 border-slate-200",
    sandbox: "bg-violet-50 text-violet-700 border-violet-200",
    recovery: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border", map[t])}>{TYPE_LABEL[t]}</span>;
};

const dot = (s: "ok" | "warn" | "fail") => {
  const map = { ok: "bg-emerald-500", warn: "bg-amber-500", fail: "bg-red-500" };
  return <span className={cn("inline-block w-1.5 h-1.5 rounded-full", map[s])} />;
};

/* ─────────── Page ─────────── */

export default function AdminHyperMCPEnvironmentManager() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<EnvType | "all">("all");
  const [selected, setSelected] = useState<Environment | null>(null);
  const [compareA, setCompareA] = useState<string>("env_dev");
  const [compareB, setCompareB] = useState<string>("env_prod");

  const filtered = useMemo(() =>
    ENVIRONMENTS.filter(e => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (query && !e.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    }), [query, typeFilter]);

  const kpis = {
    active: ENVIRONMENTS.filter(e => e.status !== "disabled").length,
    production: ENVIRONMENTS.filter(e => e.type === "production").length,
    sandbox: ENVIRONMENTS.filter(e => e.type === "sandbox").length,
    failed: ENVIRONMENTS.filter(e => e.status === "blocked" || e.status === "degraded").length,
    pending: ENVIRONMENTS.filter(e => e.status === "validating").length,
    drift: ENVIRONMENTS.reduce((acc, e) => acc + (e.drift > 0 ? 1 : 0), 0),
  };

  const envA = ENVIRONMENTS.find(e => e.id === compareA);
  const envB = ENVIRONMENTS.find(e => e.id === compareB);

  const validation = {
    missingCreds: ENVIRONMENTS.filter(e => e.blockers.some(b => b.toLowerCase().includes("credential"))),
    failedWebhooks: ENVIRONMENTS.filter(e => e.webhooks.some(w => w.status === "fail")),
    queueIssues: ENVIRONMENTS.filter(e => e.queueConfig.some(q => q.backlog > 5)),
    mappingConflicts: ENVIRONMENTS.filter(e => e.drift > 4),
    validationFailures: ENVIRONMENTS.filter(e => e.history.some(h => h.status === "fail")),
    blockers: ENVIRONMENTS.filter(e => e.blockers.length > 0),
  };

  return (
    <HyperMCPShell>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-slate-700" />
              Environment Manager
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Configure and monitor development, staging, testing, and production orchestration environments.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("Config exported")}>
              <Download className="w-4 h-4 mr-1.5" /> Export Config
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("Promotion flow opened")}>
              <ArrowUpRight className="w-4 h-4 mr-1.5" /> Promote
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("Clone dialog opened")}>
              <Copy className="w-4 h-4 mr-1.5" /> Clone
            </Button>
            <Button size="sm" onClick={() => toast.success("New environment dialog")}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Environment
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Active Environments", value: kpis.active, icon: CheckCircle2, tone: "text-emerald-600" },
            { label: "Production Systems", value: kpis.production, icon: Layers, tone: "text-slate-700" },
            { label: "Sandbox Systems", value: kpis.sandbox, icon: Layers, tone: "text-violet-600" },
            { label: "Failed Checks", value: kpis.failed, icon: XCircle, tone: "text-red-600" },
            { label: "Pending Promotions", value: kpis.pending, icon: Clock, tone: "text-amber-600" },
            { label: "Drift Alerts", value: kpis.drift, icon: ShieldAlert, tone: "text-amber-600" },
          ].map((k, i) => (
            <Card key={i} className="p-3 border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">{k.label}</p>
                <k.icon className={cn("w-4 h-4", k.tone)} />
              </div>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{k.value}</p>
            </Card>
          ))}
        </div>

        {/* Promotion Flow */}
        <Card className="p-4 border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-900 mb-3">Promotion Flow</p>
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { name: "Development", checks: "42/47 checks", approval: "Auto", rollback: "Available" },
              { name: "Staging", checks: "Validating…", approval: "QA Lead", rollback: "Available" },
              { name: "Production", checks: "47/47 checks", approval: "VP Engineering", rollback: "Snapshot ready" },
            ].map((s, i, arr) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <div className="border border-slate-200 rounded-lg px-3 py-2 bg-white min-w-[180px]">
                  <p className="text-xs font-semibold text-slate-900">{s.name}</p>
                  <p className="text-[11px] text-slate-600 mt-1">✓ {s.checks}</p>
                  <p className="text-[11px] text-slate-600">Approval: {s.approval}</p>
                  <p className="text-[11px] text-slate-500">Rollback: {s.rollback}</p>
                </div>
                {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>
            ))}
          </div>
        </Card>

        {/* Filters + Table */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-3 border-b border-slate-200 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search environments..." className="pl-8 h-9 text-sm" />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as EnvType | "all")}
              className="h-9 px-2 text-sm border border-slate-200 rounded bg-white text-slate-700">
              <option value="all">All types</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <span className="text-xs text-slate-500 ml-auto">{filtered.length} of {ENVIRONMENTS.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Environment</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Integrations</th>
                  <th className="px-3 py-2 font-medium">Workflows</th>
                  <th className="px-3 py-2 font-medium">Last Deployment</th>
                  <th className="px-3 py-2 font-medium">Last Validation</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(e)}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{e.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{e.id}</p>
                    </td>
                    <td className="px-3 py-2">{typeBadge(e.type)}</td>
                    <td className="px-3 py-2">{statusBadge(e.status)}</td>
                    <td className="px-3 py-2 text-slate-700">{e.integrations}</td>
                    <td className="px-3 py-2 text-slate-700">{e.workflows}</td>
                    <td className="px-3 py-2 text-slate-600">{e.lastDeployment}</td>
                    <td className="px-3 py-2 text-slate-600">{e.lastValidation}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={ev => { ev.stopPropagation(); setSelected(e); }}>
                        View <ArrowUpRight className="w-3 h-3 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Comparison + Validation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-slate-700" /> Environment Comparison
              </p>
              <div className="flex gap-2">
                <select value={compareA} onChange={e => setCompareA(e.target.value)}
                  className="h-8 px-2 text-xs border border-slate-200 rounded bg-white text-slate-700">
                  {ENVIRONMENTS.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <span className="text-xs text-slate-400 self-center">vs</span>
                <select value={compareB} onChange={e => setCompareB(e.target.value)}
                  className="h-8 px-2 text-xs border border-slate-200 rounded bg-white text-slate-700">
                  {ENVIRONMENTS.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>
            {envA && envB && (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">Attribute</th>
                    <th className="px-3 py-2 font-medium">{envA.name}</th>
                    <th className="px-3 py-2 font-medium">{envB.name}</th>
                    <th className="px-3 py-2 font-medium">Drift</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Integrations", a: envA.integrations, b: envB.integrations },
                    { label: "Workflows", a: envA.workflows, b: envB.workflows },
                    { label: "Credentials", a: envA.credentials.length, b: envB.credentials.length },
                    { label: "Webhooks", a: envA.webhooks.length, b: envB.webhooks.length },
                    { label: "AI Models", a: envA.aiRouting.length, b: envB.aiRouting.length },
                    { label: "Queues", a: envA.queueConfig.length, b: envB.queueConfig.length },
                    { label: "Env Variables", a: envA.envVars.length, b: envB.envVars.length },
                  ].map((r, i) => {
                    const drift = r.a !== r.b;
                    return (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{r.label}</td>
                        <td className="px-3 py-2 text-slate-800 font-mono text-xs">{r.a}</td>
                        <td className="px-3 py-2 text-slate-800 font-mono text-xs">{r.b}</td>
                        <td className="px-3 py-2">
                          {drift
                            ? <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Δ {Math.abs(r.a - r.b)}</span>
                            : <span className="text-[11px] text-slate-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Validation & Health
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                { title: "Missing Credentials", items: validation.missingCreds, icon: KeyRound },
                { title: "Failed Webhooks", items: validation.failedWebhooks, icon: Webhook },
                { title: "Queue Issues", items: validation.queueIssues, icon: ListChecks },
                { title: "Mapping Conflicts", items: validation.mappingConflicts, icon: AlertTriangle },
                { title: "Validation Failures", items: validation.validationFailures, icon: XCircle },
                { title: "Deployment Blockers", items: validation.blockers, icon: ShieldAlert },
              ].map((g, i) => (
                <div key={i} className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-1.5">
                      <g.icon className="w-3 h-3 text-slate-500" /> {g.title}
                    </p>
                    <span className="text-[11px] text-slate-500">{g.items.length}</span>
                  </div>
                  {g.items.length === 0
                    ? <p className="text-xs text-slate-400">None</p>
                    : (
                      <ul className="space-y-0.5">
                        {g.items.slice(0, 3).map(e => (
                          <li key={e.id}>
                            <button onClick={() => setSelected(e)}
                              className="text-xs text-slate-700 hover:text-slate-900 hover:underline">
                              {e.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-slate-700" />
                  {selected.name}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  {typeBadge(selected.type)} {statusBadge(selected.status)} <span className="font-mono">{selected.id}</span>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-slate-200 rounded p-2">
                    <p className="text-[10px] uppercase text-slate-500">Integrations</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{selected.integrations}</p>
                  </div>
                  <div className="border border-slate-200 rounded p-2">
                    <p className="text-[10px] uppercase text-slate-500">Workflows</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{selected.workflows}</p>
                  </div>
                  <div className="border border-slate-200 rounded p-2">
                    <p className="text-[10px] uppercase text-slate-500">Last Deployment</p>
                    <p className="mt-1 text-slate-800">{selected.lastDeployment}</p>
                  </div>
                  <div className="border border-slate-200 rounded p-2">
                    <p className="text-[10px] uppercase text-slate-500">Drift Items</p>
                    <p className="mt-1 text-slate-800">{selected.drift}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> Credential Set
                  </p>
                  <div className="border border-slate-200 rounded p-2 flex flex-wrap gap-1">
                    {selected.credentials.length === 0
                      ? <p className="text-xs text-slate-400">None</p>
                      : selected.credentials.map((c, i) => (
                          <span key={i} className="text-[11px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{c}</span>
                        ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                    <ListChecks className="w-3 h-3" /> Queue Configuration
                  </p>
                  <div className="border border-slate-200 rounded divide-y divide-slate-100">
                    {selected.queueConfig.length === 0
                      ? <p className="text-xs text-slate-400 p-2">None</p>
                      : selected.queueConfig.map((q, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                            <span className="font-mono text-slate-800">{q.name}</span>
                            <span className="text-slate-600">conc {q.concurrency} · backlog {q.backlog}</span>
                          </div>
                        ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> AI Routing
                  </p>
                  <div className="border border-slate-200 rounded divide-y divide-slate-100">
                    {selected.aiRouting.length === 0
                      ? <p className="text-xs text-slate-400 p-2">None</p>
                      : selected.aiRouting.map((a, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                            <span className="font-mono text-slate-800">{a.model}</span>
                            <span className="text-slate-600">{a.role}</span>
                          </div>
                        ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                    <Webhook className="w-3 h-3" /> Webhook Configuration
                  </p>
                  <div className="border border-slate-200 rounded divide-y divide-slate-100">
                    {selected.webhooks.length === 0
                      ? <p className="text-xs text-slate-400 p-2">None</p>
                      : selected.webhooks.map((w, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                            <span className="text-slate-800">{w.name}</span>
                            <span className="flex items-center gap-1.5">{dot(w.status)}<span className="capitalize text-slate-600">{w.status}</span></span>
                          </div>
                        ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">Environment Variables</p>
                  <div className="border border-slate-200 rounded divide-y divide-slate-100">
                    {selected.envVars.length === 0
                      ? <p className="text-xs text-slate-400 p-2">None</p>
                      : selected.envVars.map((v, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                            <span className="font-mono text-slate-800">{v.key}</span>
                            <span className="text-slate-500">{v.masked ? "••••••••" : "public"}</span>
                          </div>
                        ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">Validation & Deployment History</p>
                  <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {selected.history.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-1.5 text-xs">
                        <span className="text-slate-400 font-mono w-12 shrink-0">{h.ts}</span>
                        <span className="uppercase text-[10px] font-medium text-slate-500 w-16 shrink-0">{h.type}</span>
                        <span className={cn(
                          "flex-1",
                          h.status === "fail" && "text-red-700",
                          h.status === "ok" && "text-slate-700",
                          h.status === "info" && "text-slate-600",
                        )}>{h.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selected.blockers.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-red-600" /> Deployment Blockers
                    </p>
                    <ul className="space-y-1">
                      {selected.blockers.map((b, i) => (
                        <li key={i} className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                  <Button size="sm" variant="outline" onClick={() => toast.info("Validation triggered")}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Validate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Clone created")}>
                    <Copy className="w-3 h-3 mr-1" /> Clone
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Promotion initiated")}>
                    <ArrowUpRight className="w-3 h-3 mr-1" /> Promote
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Rollback queued")}>
                    <Undo2 className="w-3 h-3 mr-1" /> Rollback
                  </Button>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => toast.info("Environment disabled")}>
                    <PowerOff className="w-3 h-3 mr-1" /> Disable
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
