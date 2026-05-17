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
  ArrowLeft, Brain, PlayCircle, Rocket, FlaskConical, FileText,
  CheckCircle2, XCircle, Clock, Loader2, AlertTriangle, Search,
  Settings2, Activity, ShieldCheck, Cpu, GitBranch, ChevronRight,
  ArrowRight, ArrowUpRight, Zap, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ModelStatus = "online" | "degraded" | "offline";
type AgentStatus = "running" | "idle" | "failing" | "paused";
type ExecStatus = "success" | "failed" | "retrying" | "timeout";

interface AIModel {
  key: string;
  name: string;
  provider: string;
  status: ModelStatus;
  latencyMs: number;
  requestsToday: number;
  errorRate: number;
  workloadPct: number;
  notes: string;
}

interface AIAgent {
  id: string;
  name: string;
  role: string;
  workflow: string;
  task: string;
  status: AgentStatus;
  lastExec: string;
  avgRuntimeMs: number;
  successRate: number;
  model: string;
  prompts: string[];
  recent: { ts: string; label: string; level: "info" | "success" | "warn" | "error" }[];
  failures: { ts: string; reason: string }[];
  routing: string[];
  systems: string[];
}

interface PromptLog {
  id: string;
  promptName: string;
  model: string;
  execMs: number;
  tokens: number;
  status: ExecStatus;
  retries: number;
  workflow: string;
  ts: string;
}

interface RouteFlow {
  id: string;
  name: string;
  steps: { label: string; sub?: string }[];
}

const MODELS: AIModel[] = [
  { key: "openai",   name: "GPT-5",         provider: "OpenAI",            status: "online",   latencyMs: 612,  requestsToday: 4821, errorRate: 0.4, workloadPct: 62, notes: "Primary reasoning model" },
  { key: "claude",   name: "Claude Sonnet", provider: "Anthropic",         status: "online",   latencyMs: 540,  requestsToday: 3122, errorRate: 0.2, workloadPct: 48, notes: "Compliance & long context" },
  { key: "grok",     name: "Grok 2",        provider: "xAI",               status: "degraded", latencyMs: 1240, requestsToday: 612,  errorRate: 3.1, workloadPct: 14, notes: "Experimental routing" },
  { key: "hyperfx",  name: "HyperFX",       provider: "Internal",          status: "online",   latencyMs: 188,  requestsToday: 9842, errorRate: 0.1, workloadPct: 71, notes: "Fast classification" },
  { key: "pulse",    name: "Pulse AI",      provider: "Internal · Pulse",  status: "online",   latencyMs: 320,  requestsToday: 2418, errorRate: 0.6, workloadPct: 33, notes: "Call coaching & compliance" },
  { key: "workers",  name: "AI Workers",    provider: "Internal · Edge",   status: "online",   latencyMs: 92,   requestsToday: 14210, errorRate: 0.0, workloadPct: 84, notes: "Background queue executors" },
];

const AGENTS: AIAgent[] = [
  {
    id: "AG-001", name: "Lead Classifier", role: "Triage",
    workflow: "WF-LEAD-INTAKE", task: "Scoring inbound Meta lead L-44521",
    status: "running", lastExec: "12s ago", avgRuntimeMs: 480, successRate: 99.1, model: "HyperFX",
    prompts: ["lead.classify.v4", "lead.dedupe.v2"],
    recent: [
      { ts: "12s ago", label: "Classified L-44521 · long-distance", level: "success" },
      { ts: "1m ago",  label: "Classified L-44519 · local-junk", level: "info" },
    ],
    failures: [],
    routing: ["Source = Meta → HyperFX", "Confidence < 0.7 → Claude fallback"],
    systems: ["CRM", "Meta Ads", "Hyper MCP"],
  },
  {
    id: "AG-002", name: "Compliance Reviewer", role: "QA",
    workflow: "WF-CALL-REVIEW", task: "Scoring call CL-9921 transcript",
    status: "running", lastExec: "30s ago", avgRuntimeMs: 2340, successRate: 97.8, model: "Claude Sonnet",
    prompts: ["compliance.review.v6", "tcpa.flagging.v2"],
    recent: [
      { ts: "30s ago", label: "TCPA risk score 0.12", level: "success" },
      { ts: "4m ago",  label: "Flagged CL-9914 · prohibited script", level: "warn" },
    ],
    failures: [{ ts: "1h ago", reason: "Claude rate limit · failed over to GPT-5" }],
    routing: ["Default → Claude Sonnet", "Length > 8000 tokens → GPT-5"],
    systems: ["Pulse", "CRM", "Hyper MCP"],
  },
  {
    id: "AG-003", name: "Transcript Summarizer", role: "Enrichment",
    workflow: "WF-CALL-SUMMARY", task: "Summarizing 8 calls",
    status: "running", lastExec: "1m ago", avgRuntimeMs: 1840, successRate: 99.4, model: "GPT-5",
    prompts: ["call.summary.v3"],
    recent: [{ ts: "1m ago", label: "Summarized 8/8", level: "success" }],
    failures: [],
    routing: ["Default → GPT-5", "Cost mode → GPT-5-mini"],
    systems: ["Pulse", "CRM"],
  },
  {
    id: "AG-004", name: "Vendor Risk Analyzer", role: "Risk",
    workflow: "WF-VENDOR-VETTING", task: "Scoring carrier USDOT 2245118",
    status: "idle", lastExec: "14m ago", avgRuntimeMs: 3120, successRate: 96.2, model: "Claude Sonnet",
    prompts: ["vendor.risk.v5"],
    recent: [{ ts: "14m ago", label: "Risk score 0.31 · approved", level: "success" }],
    failures: [],
    routing: ["FMCSA data → Claude Sonnet", "No data → Manual review"],
    systems: ["FMCSA", "CRM"],
  },
  {
    id: "AG-005", name: "CRM Automation Decider", role: "Routing",
    workflow: "WF-CRM-AUTOMATION", task: "Deciding next-best-action for 41 deals",
    status: "running", lastExec: "5s ago", avgRuntimeMs: 220, successRate: 99.9, model: "HyperFX",
    prompts: ["nba.decide.v8"],
    recent: [{ ts: "5s ago", label: "Decided NBA for 41 deals", level: "success" }],
    failures: [],
    routing: ["Always → HyperFX"],
    systems: ["CRM"],
  },
  {
    id: "AG-006", name: "Marketing Recommender", role: "Growth",
    workflow: "WF-MARKETING-INSIGHTS", task: "Generating PMax insights",
    status: "failing", lastExec: "2m ago", avgRuntimeMs: 4620, successRate: 88.4, model: "Grok 2",
    prompts: ["marketing.recommend.v2"],
    recent: [
      { ts: "2m ago", label: "Grok timeout after 30s", level: "error" },
      { ts: "5m ago", label: "Recommendations generated", level: "success" },
    ],
    failures: [
      { ts: "2m ago", reason: "Grok upstream timeout" },
      { ts: "9m ago", reason: "Validation failed: empty recommendations" },
    ],
    routing: ["Default → Grok 2", "Failure → Claude Sonnet"],
    systems: ["Google Ads", "Meta Ads", "CRM"],
  },
  {
    id: "AG-007", name: "Esign Integrity Checker", role: "Validation",
    workflow: "WF-ESIGN-VALIDATE", task: "—",
    status: "paused", lastExec: "1h ago", avgRuntimeMs: 740, successRate: 99.0, model: "GPT-5-mini",
    prompts: ["esign.validate.v1"],
    recent: [{ ts: "paused", label: "Paused for prompt revision", level: "warn" }],
    failures: [],
    routing: ["Default → GPT-5-mini"],
    systems: ["E-Sign", "CRM"],
  },
];

const PROMPT_LOGS: PromptLog[] = [
  { id: "PE-77821", promptName: "lead.classify.v4",      model: "HyperFX",       execMs: 412,  tokens: 1240,  status: "success",  retries: 0, workflow: "WF-LEAD-INTAKE",        ts: "8s ago" },
  { id: "PE-77820", promptName: "compliance.review.v6",  model: "Claude Sonnet", execMs: 2410, tokens: 18420, status: "success",  retries: 0, workflow: "WF-CALL-REVIEW",        ts: "32s ago" },
  { id: "PE-77819", promptName: "marketing.recommend.v2",model: "Grok 2",        execMs: 30000,tokens: 0,     status: "timeout",  retries: 2, workflow: "WF-MARKETING-INSIGHTS", ts: "2m ago" },
  { id: "PE-77818", promptName: "call.summary.v3",       model: "GPT-5",         execMs: 1820, tokens: 9211,  status: "success",  retries: 0, workflow: "WF-CALL-SUMMARY",       ts: "3m ago" },
  { id: "PE-77817", promptName: "vendor.risk.v5",        model: "Claude Sonnet", execMs: 3104, tokens: 12410, status: "success",  retries: 1, workflow: "WF-VENDOR-VETTING",     ts: "14m ago" },
  { id: "PE-77816", promptName: "nba.decide.v8",         model: "HyperFX",       execMs: 218,  tokens: 940,   status: "success",  retries: 0, workflow: "WF-CRM-AUTOMATION",     ts: "16m ago" },
  { id: "PE-77815", promptName: "tcpa.flagging.v2",      model: "Claude Sonnet", execMs: 1820, tokens: 8420,  status: "failed",   retries: 3, workflow: "WF-CALL-REVIEW",        ts: "21m ago" },
  { id: "PE-77814", promptName: "esign.validate.v1",     model: "GPT-5-mini",    execMs: 740,  tokens: 2210,  status: "retrying", retries: 1, workflow: "WF-ESIGN-VALIDATE",     ts: "28m ago" },
];

const FLOWS: RouteFlow[] = [
  { id: "FL-1", name: "Compliance Review",        steps: [{ label: "Prompt", sub: "compliance.review.v6" }, { label: "AI Router", sub: "policy = compliance" }, { label: "Claude Sonnet", sub: "primary" }, { label: "Validation", sub: "TCPA + PII" }, { label: "CRM", sub: "flag.deal" }] },
  { id: "FL-2", name: "Lead Classification",      steps: [{ label: "Prompt", sub: "lead.classify.v4" },     { label: "AI Router", sub: "channel = meta" },     { label: "HyperFX",       sub: "primary" }, { label: "Validation", sub: "schema check" }, { label: "CRM", sub: "lead.assign" }] },
  { id: "FL-3", name: "Transcript Analysis",      steps: [{ label: "Prompt", sub: "call.summary.v3" },      { label: "AI Router", sub: "length-based" },        { label: "GPT-5",         sub: "primary" }, { label: "Validation", sub: "redact PII" }, { label: "Pulse", sub: "store.summary" }] },
  { id: "FL-4", name: "Vendor Risk Analysis",     steps: [{ label: "Prompt", sub: "vendor.risk.v5" },       { label: "AI Router", sub: "fmcsa.required" },      { label: "Claude Sonnet", sub: "primary" }, { label: "Validation", sub: "score range" }, { label: "CRM", sub: "vendor.update" }] },
  { id: "FL-5", name: "CRM Automation Decisions", steps: [{ label: "Prompt", sub: "nba.decide.v8" },        { label: "AI Router", sub: "always = hyperfx" },    { label: "HyperFX",       sub: "primary" }, { label: "Validation", sub: "action allowlist" }, { label: "CRM", sub: "execute.action" }] },
  { id: "FL-6", name: "Marketing Recommendations",steps: [{ label: "Prompt", sub: "marketing.recommend.v2" },{ label: "AI Router", sub: "experiment" },         { label: "Grok 2",        sub: "primary" }, { label: "Validation", sub: "non-empty" }, { label: "Marketing MCP", sub: "publish" }] },
];

function modelStatusBadge(s: ModelStatus) {
  const map: Record<ModelStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    online:   { label: "Online",   cls: "text-[#16A34A] bg-[#22C55E]/10 border-[#22C55E]/40", Icon: CheckCircle2 },
    degraded: { label: "Degraded", cls: "text-[#D97706] bg-[#F59E0B]/10 border-[#F59E0B]/40", Icon: AlertTriangle },
    offline:  { label: "Offline",  cls: "text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/40", Icon: XCircle },
  };
  const m = map[s];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap", m.cls)}>
      <m.Icon className="w-3 h-3" /> {m.label}
    </span>
  );
}

function agentStatusBadge(s: AgentStatus) {
  const map: Record<AgentStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    running: { label: "Running", cls: "text-[#1D4ED8] bg-[#3B82F6]/10 border-[#3B82F6]/30", Icon: Loader2 },
    idle:    { label: "Idle",    cls: "text-[#0B1624] bg-[#0B1624]/5 border-[#0B1624]/15", Icon: Clock },
    failing: { label: "Failing", cls: "text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/40", Icon: AlertTriangle },
    paused:  { label: "Paused",  cls: "text-[#64748B] bg-[#64748B]/10 border-[#64748B]/30", Icon: Clock },
  };
  const m = map[s];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap", m.cls)}>
      <m.Icon className={cn("w-3 h-3", s === "running" && "animate-spin")} /> {m.label}
    </span>
  );
}

function execBadge(s: ExecStatus) {
  const map: Record<ExecStatus, string> = {
    success:  "text-[#16A34A] bg-[#22C55E]/10 border-[#22C55E]/40",
    failed:   "text-[#DC2626] bg-[#DC2626]/10 border-[#DC2626]/40",
    retrying: "text-[#D97706] bg-[#F59E0B]/10 border-[#F59E0B]/40",
    timeout:  "text-[#991B1B] bg-[#991B1B]/10 border-[#991B1B]/30",
  };
  return (
    <span className={cn("inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border uppercase tracking-wider", map[s])}>
      {s}
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

export default function AdminHyperMCPAIOrchestration() {
  const [agents, setAgents] = useState<AIAgent[]>(AGENTS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openAgentId, setOpenAgentId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const activeAgents = agents.filter(a => a.status === "running").length;
    const runningWorkflows = new Set(agents.filter(a => a.status === "running").map(a => a.workflow)).size;
    const promptToday = MODELS.reduce((s, m) => s + m.requestsToday, 0);
    const failed = PROMPT_LOGS.filter(p => p.status === "failed" || p.status === "timeout").length;
    const avgMs = Math.round(MODELS.reduce((s, m) => s + m.latencyMs, 0) / MODELS.length);
    const accuracy = 98.4;
    const activeModels = MODELS.filter(m => m.status !== "offline").length;
    return { activeAgents, runningWorkflows, promptToday, failed, avgMs, accuracy, activeModels };
  }, [agents]);

  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter(a => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return [a.name, a.role, a.workflow, a.model, a.task].some(v => v.toLowerCase().includes(q));
    });
  }, [agents, search, statusFilter]);

  const openAgent = openAgentId ? agents.find(a => a.id === openAgentId) ?? null : null;

  function actAgent(id: string, action: "pause" | "resume" | "restart" | "fallback") {
    setAgents(prev => prev.map(a => {
      if (a.id !== id) return a;
      switch (action) {
        case "pause":    return { ...a, status: "paused" };
        case "resume":   return { ...a, status: "running" };
        case "restart":  return { ...a, status: "running", lastExec: "now" };
        case "fallback": return { ...a, status: "running", model: a.model === "Grok 2" ? "Claude Sonnet" : a.model };
      }
    }));
    const labels = { pause: "paused", resume: "resumed", restart: "restarted", fallback: "switched to fallback model" };
    toast.success(`${id} ${labels[action]}`);
  }

  // Routing accuracy + execution sparkline
  const execTrend = [220, 280, 310, 290, 340, 360, 410, 380, 440, 420, 470, 510];
  const failTrend = [2, 1, 3, 2, 4, 3, 6, 4, 5, 4, 7, 6];
  const maxE = Math.max(...execTrend);
  const maxF = Math.max(...failTrend, 1);

  const guardrails = [
    { label: "Prompt validation",        value: "Enabled",    state: "ok" as const },
    { label: "Human approval required",  value: "On sensitive actions", state: "ok" as const },
    { label: "Fallback models",          value: "Active · Claude → GPT-5", state: "ok" as const },
    { label: "Max execution retries",    value: "3",          state: "ok" as const },
    { label: "Sensitive action protection", value: "Strict",  state: "ok" as const },
    { label: "PII redaction pipeline",   value: "Enabled",    state: "ok" as const },
  ];

  return (
    <HyperMCPShell>
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0B1624] text-white flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-[#0B1624]">AI Orchestration</h1>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[rgba(15,23,42,0.10)] text-[rgba(11,22,36,0.62)] bg-white">
                    Hyper MCP
                  </span>
                </div>
                <p className="text-[13px] text-[rgba(11,22,36,0.62)] mt-0.5">
                  Monitor and coordinate AI models, prompts, automations, and intelligent workflows.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]">
                <Link to="/hypermcp"><ArrowLeft className="w-3.5 h-3.5" /> Back</Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]" onClick={() => toast.success("Opening AI logs")}>
                <FileText className="w-3.5 h-3.5" /> View AI Logs
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]" onClick={() => toast.success("Workflow test queued")}>
                <FlaskConical className="w-3.5 h-3.5" /> Test Workflow
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-[rgba(15,23,42,0.12)] bg-white text-[#0B1624]" onClick={() => toast.success("Prompt run started")}>
                <PlayCircle className="w-3.5 h-3.5" /> Run Prompt
              </Button>
              <Button size="sm" className="h-8 gap-1.5 bg-[#0B1624] hover:bg-[#0B1624]/90 text-white" onClick={() => toast.success("Agent deployment queued")}>
                <Rocket className="w-3.5 h-3.5" /> Deploy Agent
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: "Active Agents",       value: stats.activeAgents,    hint: "running" },
              { label: "Workflows Running",   value: stats.runningWorkflows, hint: "live" },
              { label: "Executions Today",    value: stats.promptToday.toLocaleString(), hint: "across models" },
              { label: "Failed Executions",   value: stats.failed,          hint: "last 24h" },
              { label: "Avg Response Time",   value: `${stats.avgMs}ms`,    hint: "rolling 1h" },
              { label: "Routing Accuracy",    value: `${stats.accuracy}%`,  hint: "router decisions" },
              { label: "Active Models",       value: stats.activeModels,    hint: "online + degraded" },
            ].map(m => (
              <Card key={m.label} className="p-3 bg-white border-[rgba(15,23,42,0.08)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[rgba(11,22,36,0.55)]">{m.label}</div>
                <div className="text-2xl font-semibold text-[#0B1624] mt-1 tabular-nums">{m.value}</div>
                <div className="text-[11px] text-[rgba(11,22,36,0.50)] mt-0.5">{m.hint}</div>
              </Card>
            ))}
          </div>

          {/* AI Models Grid */}
          <Card className="p-4 bg-white border-[rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#0B1624]" />
                <h2 className="text-sm font-semibold text-[#0B1624]">AI Models & Providers</h2>
              </div>
              <span className="text-[11px] text-[rgba(11,22,36,0.55)]">{MODELS.length} connected</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {MODELS.map(m => (
                <div key={m.key} className="border border-[rgba(15,23,42,0.08)] rounded-lg p-3 bg-white hover:bg-[#F7F8FA] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[#0B1624] truncate">{m.name}</div>
                      <div className="text-[11px] text-[rgba(11,22,36,0.55)] truncate">{m.provider}</div>
                    </div>
                    {modelStatusBadge(m.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[11.5px]">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.55)]">Latency</div>
                      <div className="text-[#0B1624] font-medium tabular-nums">{m.latencyMs}ms</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.55)]">Requests</div>
                      <div className="text-[#0B1624] font-medium tabular-nums">{m.requestsToday.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.55)]">Error Rate</div>
                      <div className={cn("font-medium tabular-nums", m.errorRate > 2 ? "text-[#DC2626]" : "text-[#0B1624]")}>{m.errorRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.55)]">Workload</div>
                      <div className="text-[#0B1624] font-medium tabular-nums">{m.workloadPct}%</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-[#F1F3F6] rounded-full overflow-hidden">
                    <div className={cn("h-full", m.workloadPct > 80 ? "bg-[#DC2626]" : m.workloadPct > 60 ? "bg-[#D97706]" : "bg-[#0B1624]")} style={{ width: `${m.workloadPct}%` }} />
                  </div>
                  <div className="text-[10.5px] text-[rgba(11,22,36,0.55)] mt-2 truncate">{m.notes}</div>
                  <div className="flex items-center gap-1 mt-3">
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] border-[rgba(15,23,42,0.12)] flex-1" onClick={() => toast.success(`Configuring ${m.name}`)}>
                      <Settings2 className="w-3 h-3 mr-1" /> Configure
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] border-[rgba(15,23,42,0.12)] flex-1" onClick={() => toast.success(`Opening ${m.name} logs`)}>
                      <FileText className="w-3 h-3 mr-1" /> Logs
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] border-[rgba(15,23,42,0.12)] flex-1" onClick={() => toast.success(`Testing ${m.name}`)}>
                      <FlaskConical className="w-3 h-3 mr-1" /> Test
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Filters */}
          <Card className="p-3 bg-white border-[rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgba(11,22,36,0.45)]" />
                <Input
                  placeholder="Search agent, role, workflow, model…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-[13px] border-[rgba(15,23,42,0.12)]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[160px] text-[13px] border-[rgba(15,23,42,0.12)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                  <SelectItem value="failing">Failing</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[11px] text-[rgba(11,22,36,0.55)] ml-auto">{filteredAgents.length} of {agents.length} agents</span>
            </div>
          </Card>

          {/* Agent Orchestration Table */}
          <Card className="bg-white border-[rgba(15,23,42,0.08)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(15,23,42,0.08)] flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#0B1624]" />
              <h2 className="text-sm font-semibold text-[#0B1624]">Agent Orchestration</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-[#F1F3F6] text-[rgba(11,22,36,0.62)] text-left">
                    <th className="px-3 py-2 font-medium">Agent</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Workflow</th>
                    <th className="px-3 py-2 font-medium">Current Task</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Last Exec</th>
                    <th className="px-3 py-2 font-medium text-right">Avg Runtime</th>
                    <th className="px-3 py-2 font-medium text-right">Success</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map(a => (
                    <tr key={a.id} className="border-t border-[rgba(15,23,42,0.06)] hover:bg-[#F7F8FA] cursor-pointer" onClick={() => setOpenAgentId(a.id)}>
                      <td className="px-3 py-2">
                        <div className="text-[#0B1624] font-medium">{a.name}</div>
                        <div className="text-[10.5px] text-[rgba(11,22,36,0.55)] font-mono">{a.id} · {a.model}</div>
                      </td>
                      <td className="px-3 py-2 text-[rgba(11,22,36,0.75)]">{a.role}</td>
                      <td className="px-3 py-2 font-mono text-[11.5px] text-[rgba(11,22,36,0.75)]">{a.workflow}</td>
                      <td className="px-3 py-2 text-[rgba(11,22,36,0.75)] truncate max-w-[260px]">{a.task}</td>
                      <td className="px-3 py-2">{agentStatusBadge(a.status)}</td>
                      <td className="px-3 py-2 text-[rgba(11,22,36,0.62)]">{a.lastExec}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[rgba(11,22,36,0.75)]">{(a.avgRuntimeMs / 1000).toFixed(2)}s</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className={cn(a.successRate >= 99 ? "text-[#16A34A]" : a.successRate >= 95 ? "text-[#0B1624]" : "text-[#D97706]")}>
                          {a.successRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[rgba(11,22,36,0.62)] hover:text-[#0B1624]">
                              Manage <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => actAgent(a.id, "restart")}><Loader2 className="w-3.5 h-3.5 mr-2" /> Restart</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => actAgent(a.id, "pause")}><Clock className="w-3.5 h-3.5 mr-2" /> Pause</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => actAgent(a.id, "resume")}><PlayCircle className="w-3.5 h-3.5 mr-2" /> Resume</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => actAgent(a.id, "fallback")}><GitBranch className="w-3.5 h-3.5 mr-2" /> Switch fallback</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {filteredAgents.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-[rgba(11,22,36,0.55)]">No agents match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Workflow Routing Visualization */}
          <Card className="p-4 bg-white border-[rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#0B1624]" />
                <h2 className="text-sm font-semibold text-[#0B1624]">Workflow Routing</h2>
              </div>
              <span className="text-[11px] text-[rgba(11,22,36,0.55)]">Prompt → Router → Model → Validation → Action</span>
            </div>
            <div className="space-y-2">
              {FLOWS.map(f => (
                <div key={f.id} className="border border-[rgba(15,23,42,0.08)] rounded-lg p-3">
                  <div className="text-[12px] font-semibold text-[#0B1624] mb-2">{f.name}</div>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {f.steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-1 shrink-0">
                        <div className="border border-[rgba(15,23,42,0.10)] bg-[#F7F8FA] rounded px-2 py-1.5 min-w-[120px]">
                          <div className="text-[10.5px] uppercase tracking-wider text-[rgba(11,22,36,0.55)]">{s.label}</div>
                          <div className="text-[11.5px] text-[#0B1624] font-mono truncate">{s.sub}</div>
                        </div>
                        {i < f.steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-[rgba(11,22,36,0.40)] shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Throughput / failures + Guardrails */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card className="p-4 bg-white border-[rgba(15,23,42,0.08)] lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0B1624]" />
                  <h2 className="text-sm font-semibold text-[#0B1624]">Executions & Failures</h2>
                </div>
                <span className="text-[11px] text-[rgba(11,22,36,0.55)]">last 12 minutes</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Executions</div>
                  <div className="flex items-end gap-1 h-20">
                    {execTrend.map((v, i) => (
                      <div key={i} className="flex-1 bg-[#0B1624] rounded-sm" style={{ height: `${(v / maxE) * 100}%` }} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Failures</div>
                  <div className="flex items-end gap-1 h-20">
                    {failTrend.map((v, i) => (
                      <div key={i} className="flex-1 bg-[#DC2626]/70 rounded-sm" style={{ height: `${(v / maxF) * 100}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-white border-[rgba(15,23,42,0.08)]">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                <h2 className="text-sm font-semibold text-[#0B1624]">AI Guardrails</h2>
              </div>
              <div className="space-y-1.5">
                {guardrails.map(g => (
                  <div key={g.label} className="flex items-center justify-between text-[12px] border-b border-[rgba(15,23,42,0.06)] pb-1.5 last:border-0">
                    <span className="text-[rgba(11,22,36,0.75)]">{g.label}</span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-[#16A34A]">
                      <CheckCircle2 className="w-3 h-3" /> {g.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Prompt Execution Logs */}
          <Card className="bg-white border-[rgba(15,23,42,0.08)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(15,23,42,0.08)] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#0B1624]" />
              <h2 className="text-sm font-semibold text-[#0B1624]">Prompt Execution Logs</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-[#F1F3F6] text-[rgba(11,22,36,0.62)] text-left">
                    <th className="px-3 py-2 font-medium">Execution</th>
                    <th className="px-3 py-2 font-medium">Prompt</th>
                    <th className="px-3 py-2 font-medium">Model</th>
                    <th className="px-3 py-2 font-medium text-right">Exec</th>
                    <th className="px-3 py-2 font-medium text-right">Tokens</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Retries</th>
                    <th className="px-3 py-2 font-medium">Workflow</th>
                    <th className="px-3 py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {PROMPT_LOGS.map(p => (
                    <tr key={p.id} className="border-t border-[rgba(15,23,42,0.06)] hover:bg-[#F7F8FA]">
                      <td className="px-3 py-2 font-mono text-[#0B1624]">{p.id}</td>
                      <td className="px-3 py-2 font-mono text-[11.5px]">{p.promptName}</td>
                      <td className="px-3 py-2 text-[rgba(11,22,36,0.75)]">{p.model}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[rgba(11,22,36,0.75)]">{p.execMs}ms</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[rgba(11,22,36,0.75)]">{p.tokens.toLocaleString()}</td>
                      <td className="px-3 py-2">{execBadge(p.status)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.retries}</td>
                      <td className="px-3 py-2 font-mono text-[11.5px] text-[rgba(11,22,36,0.62)]">{p.workflow}</td>
                      <td className="px-3 py-2 text-[rgba(11,22,36,0.62)]">{p.ts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* AI Failure Monitoring */}
          <Card className="bg-white border-[rgba(15,23,42,0.08)]">
            <div className="px-4 py-3 border-b border-[rgba(15,23,42,0.08)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#991B1B]" />
              <h2 className="text-sm font-semibold text-[#0B1624]">AI Failure Monitoring</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4">
              {[
                { label: "Failed Prompts",       value: 6,  hint: "last 24h" },
                { label: "Timeout Events",       value: 3,  hint: "last 24h" },
                { label: "Hallucination Review", value: 2,  hint: "queued" },
                { label: "Validation Failures",  value: 4,  hint: "last 24h" },
                { label: "Escalated Outputs",    value: 1,  hint: "needs human" },
                { label: "Fallback Routings",    value: 12, hint: "last 24h" },
              ].map(m => (
                <div key={m.label} className="border border-[rgba(15,23,42,0.08)] rounded-md p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-[rgba(11,22,36,0.55)]">{m.label}</div>
                  <div className="text-xl font-semibold text-[#0B1624] tabular-nums mt-0.5">{m.value}</div>
                  <div className="text-[10.5px] text-[rgba(11,22,36,0.50)]">{m.hint}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Agent Detail Drawer */}
      <Sheet open={!!openAgent} onOpenChange={(v) => !v && setOpenAgentId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-white">
          {openAgent && (
            <>
              <SheetHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-[#0B1624] text-base">{openAgent.name}</SheetTitle>
                  {agentStatusBadge(openAgent.status)}
                </div>
                <SheetDescription className="text-[12.5px]">
                  {openAgent.id} · {openAgent.role} · model {openAgent.model}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                {/* Quick stats */}
                <section className="grid grid-cols-3 gap-2 text-[12px]">
                  {[
                    ["Workflow", openAgent.workflow],
                    ["Avg Runtime", `${(openAgent.avgRuntimeMs / 1000).toFixed(2)}s`],
                    ["Success", `${openAgent.successRate.toFixed(1)}%`],
                  ].map(([k, v]) => (
                    <div key={k} className="border border-[rgba(15,23,42,0.08)] rounded px-2 py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.55)]">{k}</div>
                      <div className="text-[12px] text-[#0B1624] font-mono truncate">{v}</div>
                    </div>
                  ))}
                </section>

                {/* Recovery Actions */}
                <section>
                  <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Recovery Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] border-[rgba(15,23,42,0.12)]" onClick={() => actAgent(openAgent.id, "restart")}><Loader2 className="w-3.5 h-3.5 mr-1" /> Restart</Button>
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] border-[rgba(15,23,42,0.12)]" onClick={() => actAgent(openAgent.id, "pause")}><Clock className="w-3.5 h-3.5 mr-1" /> Pause</Button>
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] border-[rgba(15,23,42,0.12)]" onClick={() => actAgent(openAgent.id, "resume")}><PlayCircle className="w-3.5 h-3.5 mr-1" /> Resume</Button>
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] border-[rgba(15,23,42,0.12)]" onClick={() => actAgent(openAgent.id, "fallback")}><GitBranch className="w-3.5 h-3.5 mr-1" /> Fallback model</Button>
                  </div>
                </section>

                {/* Assigned Prompts */}
                <section>
                  <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Assigned Prompts</h3>
                  <div className="space-y-1">
                    {openAgent.prompts.map(p => (
                      <div key={p} className="border border-[rgba(15,23,42,0.08)] rounded px-2 py-1.5 flex items-center justify-between text-[12px]">
                        <span className="font-mono text-[#0B1624]">{p}</span>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-[#1D4ED8]"><ArrowUpRight className="w-3 h-3" /></Button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Recent Executions */}
                <section>
                  <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Recent Executions</h3>
                  <div className="space-y-1.5">
                    {openAgent.recent.map((h, i) => (
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

                {/* Failure History */}
                {openAgent.failures.length > 0 && (
                  <section>
                    <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Failure History</h3>
                    <div className="space-y-1.5">
                      {openAgent.failures.map((e, i) => (
                        <div key={i} className="border border-[#DC2626]/30 bg-[#DC2626]/5 rounded px-2 py-1.5">
                          <div className="text-[11.5px] text-[#991B1B]">{e.reason}</div>
                          <div className="text-[10.5px] text-[rgba(11,22,36,0.55)] mt-0.5">{e.ts}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Routing Rules */}
                <section>
                  <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Routing Rules</h3>
                  <div className="space-y-1">
                    {openAgent.routing.map((r, i) => (
                      <div key={i} className="border border-[rgba(15,23,42,0.08)] rounded px-2 py-1.5 text-[12px] font-mono text-[#0B1624]">{r}</div>
                    ))}
                  </div>
                </section>

                {/* Validation Pipeline */}
                <section>
                  <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Validation Pipeline</h3>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {["Schema check", "PII redact", "Policy filter", "Confidence ≥ 0.7", "Approved"].map((s, i, arr) => (
                      <div key={s} className="flex items-center gap-1 shrink-0">
                        <div className="border border-[rgba(15,23,42,0.10)] bg-[#F7F8FA] rounded px-2 py-1 text-[11px] text-[#0B1624]">{s}</div>
                        {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-[rgba(11,22,36,0.40)]" />}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Connected Systems */}
                <section>
                  <h3 className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.55)] mb-2">Connected Systems</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {openAgent.systems.map(s => (
                      <span key={s} className="text-[10.5px] px-2 py-0.5 rounded-full border border-[rgba(15,23,42,0.10)] bg-white text-[rgba(11,22,36,0.75)]">{s}</span>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}
