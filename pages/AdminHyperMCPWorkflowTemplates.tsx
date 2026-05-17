import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  LayoutTemplate, Search, Plus, Copy, PlayCircle, Pencil, CheckCircle2,
  AlertTriangle, ChevronRight, Workflow, Brain, ShieldCheck, ListChecks,
  Zap, Activity, GitPullRequest, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TemplateCategory = "lead_intake" | "crm_sync" | "transcript" | "vendor_risk"
  | "webhook_recovery" | "ai_approval" | "queue_recovery";

interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  steps: string[];
  dependencies: string[];
  validation: { ok: boolean; checks: { label: string; ok: boolean }[] };
  deploys: number;
  version: string;
  lastUpdated: string;
}

const CAT_LABEL: Record<TemplateCategory, string> = {
  lead_intake: "Lead Intake",
  crm_sync: "CRM Sync",
  transcript: "Call Transcript",
  vendor_risk: "Vendor Risk",
  webhook_recovery: "Webhook Recovery",
  ai_approval: "AI Approval",
  queue_recovery: "Queue Recovery",
};

const CAT_ICON: Record<TemplateCategory, React.ElementType> = {
  lead_intake: Zap,
  crm_sync: Workflow,
  transcript: Activity,
  vendor_risk: AlertTriangle,
  webhook_recovery: GitPullRequest,
  ai_approval: Brain,
  queue_recovery: ListChecks,
};

const TEMPLATES: Template[] = [
  {
    id: "t_lead_intake", name: "Lead Intake Flow", category: "lead_intake", version: "2.1.0",
    description: "Receives webhook leads, normalizes phone, scores quality, routes to agent.",
    steps: [
      "Receive webhook payload",
      "Validate against lead.inbound.v3 schema",
      "Normalize phone to E.164",
      "Lead enrichment lookup",
      "Score lead quality",
      "Route to available agent",
      "Trigger SMS/email confirmation",
    ],
    dependencies: ["MoverLeads Pro integration", "Twilio", "CRM Leads table"],
    validation: { ok: true, checks: [
      { label: "All required integrations connected", ok: true },
      { label: "Schema lead.inbound.v3 active", ok: true },
      { label: "Lead routing rules defined", ok: true },
    ]},
    deploys: 14, lastUpdated: "2 d ago",
  },
  {
    id: "t_crm_sync", name: "CRM Sync Flow", category: "crm_sync", version: "1.4.2",
    description: "Bidirectional sync between HyperMCP records and external CRM.",
    steps: [
      "Pull deltas from CRM since last_sync",
      "Reconcile field mappings",
      "Push internal changes outbound",
      "Conflict resolution (last-write-wins)",
      "Audit log all changes",
    ],
    dependencies: ["Salesforce or HubSpot", "Field mapping schema"],
    validation: { ok: true, checks: [
      { label: "CRM credentials valid", ok: true },
      { label: "Field mapping complete", ok: true },
    ]},
    deploys: 6, lastUpdated: "5 d ago",
  },
  {
    id: "t_transcript", name: "Call Transcript Flow", category: "transcript", version: "3.0.0",
    description: "Process call recordings into transcripts with sentiment + compliance scoring.",
    steps: [
      "Receive recording webhook",
      "Send to transcription service",
      "Run sentiment analysis",
      "Run Pulse compliance keywords",
      "Persist transcript to deal record",
      "Notify manager on critical flags",
    ],
    dependencies: ["Pulse", "AI Gateway", "Storage bucket"],
    validation: { ok: false, checks: [
      { label: "Transcription service connected", ok: true },
      { label: "Pulse compliance script loaded", ok: false },
      { label: "Storage bucket writable", ok: true },
    ]},
    deploys: 9, lastUpdated: "1 d ago",
  },
  {
    id: "t_vendor_risk", name: "Vendor Risk Escalation", category: "vendor_risk", version: "1.2.0",
    description: "Detects compliance anomalies and escalates risky vendors automatically.",
    steps: [
      "Monitor vendor compliance signals",
      "Apply guardrail thresholds",
      "Open incident if breach detected",
      "Notify compliance + sales manager",
      "Auto-pause source if critical",
    ],
    dependencies: ["Vendor Guardrails config", "Pulse data"],
    validation: { ok: true, checks: [
      { label: "Guardrail thresholds set", ok: true },
      { label: "Incident system connected", ok: true },
    ]},
    deploys: 3, lastUpdated: "1 wk ago",
  },
  {
    id: "t_webhook_recovery", name: "Failed Webhook Recovery", category: "webhook_recovery", version: "1.0.4",
    description: "Re-runs failed webhooks from DLQ with exponential backoff.",
    steps: [
      "Read DLQ batch",
      "Re-validate payload schema",
      "Retry with exponential backoff",
      "Move to permanent failure if exceeds retries",
      "Notify on stuck queues",
    ],
    dependencies: ["DLQ access", "Retry worker"],
    validation: { ok: true, checks: [
      { label: "DLQ accessible", ok: true },
      { label: "Retry worker running", ok: true },
    ]},
    deploys: 11, lastUpdated: "3 d ago",
  },
  {
    id: "t_ai_approval", name: "AI Approval Flow", category: "ai_approval", version: "1.1.0",
    description: "Sensitive AI actions require human approval before execution.",
    steps: [
      "Capture AI action request",
      "Classify sensitivity level",
      "Route to approval queue",
      "Wait for approver decision",
      "Execute or reject with audit trail",
    ],
    dependencies: ["Approval Center", "AI Orchestration"],
    validation: { ok: true, checks: [
      { label: "Approval Center configured", ok: true },
      { label: "Approver roles assigned", ok: true },
    ]},
    deploys: 5, lastUpdated: "4 d ago",
  },
  {
    id: "t_queue_recovery", name: "Queue Recovery Flow", category: "queue_recovery", version: "2.0.1",
    description: "Restarts and replays stalled queues with snapshot recovery.",
    steps: [
      "Detect stalled queue",
      "Take recovery snapshot",
      "Drain in-flight messages",
      "Restart queue processor",
      "Replay snapshot if needed",
    ],
    dependencies: ["Queue Engine", "Backup snapshots"],
    validation: { ok: true, checks: [
      { label: "Queue engine reachable", ok: true },
      { label: "Snapshot store available", ok: true },
    ]},
    deploys: 8, lastUpdated: "Today",
  },
];

export default function AdminHyperMCPWorkflowTemplates() {
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<TemplateCategory | "all">("all");
  const [selected, setSelected] = useState<Template | null>(null);

  const filtered = useMemo(() => TEMPLATES.filter(t => {
    if (catFilter !== "all" && t.category !== catFilter) return false;
    if (query && !t.name.toLowerCase().includes(query.toLowerCase()) &&
        !t.description.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [query, catFilter]);

  const kpis = {
    total: TEMPLATES.length,
    deployed: TEMPLATES.reduce((a, t) => a + t.deploys, 0),
    valid: TEMPLATES.filter(t => t.validation.ok).length,
    invalid: TEMPLATES.filter(t => !t.validation.ok).length,
    categories: Object.keys(CAT_LABEL).length,
  };

  return (
    <HyperMCPShell>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <LayoutTemplate className="w-6 h-6 text-slate-700" />
              Workflow Templates
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Reusable orchestration templates admins can deploy quickly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("Templates exported")}>
              <Download className="w-4 h-4 mr-1.5" /> Export
            </Button>
            <Button size="sm" onClick={() => toast.info("New template editor")}>
              <Plus className="w-4 h-4 mr-1.5" /> New Template
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Total Templates", value: kpis.total, icon: LayoutTemplate, tone: "text-slate-700" },
            { label: "Deployments", value: kpis.deployed, icon: PlayCircle, tone: "text-slate-700" },
            { label: "Validated", value: kpis.valid, icon: CheckCircle2, tone: "text-emerald-600" },
            { label: "Validation Issues", value: kpis.invalid, icon: AlertTriangle, tone: "text-amber-600" },
            { label: "Categories", value: kpis.categories, icon: Workflow, tone: "text-slate-700" },
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

        {/* Filters */}
        <Card className="border-slate-200 shadow-sm p-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <Input className="pl-8 h-9" placeholder="Search templates..."
                value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <Button size="sm" variant={catFilter === "all" ? "default" : "outline"} onClick={() => setCatFilter("all")}>All</Button>
            {(Object.keys(CAT_LABEL) as TemplateCategory[]).map(c => (
              <Button key={c} size="sm" variant={catFilter === c ? "default" : "outline"} onClick={() => setCatFilter(c)}>
                {CAT_LABEL[c]}
              </Button>
            ))}
          </div>
        </Card>

        {/* Template grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => {
            const Icon = CAT_ICON[t.category];
            return (
              <Card key={t.id} className="border-slate-200 shadow-sm p-4 cursor-pointer hover:border-slate-400 transition-colors"
                    onClick={() => setSelected(t)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                      <p className="text-[10px] text-slate-500">{CAT_LABEL[t.category]} · v{t.version}</p>
                    </div>
                  </div>
                  {t.validation.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600"/> : <AlertTriangle className="w-4 h-4 text-amber-600"/>}
                </div>
                <p className="text-[12px] text-slate-600 leading-snug mb-3 line-clamp-2">{t.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                  <span>{t.steps.length} steps · {t.deploys} deploys</span>
                  <span>{t.lastUpdated}</span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Drawer */}
        <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle>{selected.name}</SheetTitle>
                  <SheetDescription>
                    {CAT_LABEL[selected.category]} · v{selected.version} · {selected.deploys} deployments
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-slate-700">{selected.description}</p>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Workflow Steps</p>
                    <ol className="space-y-1.5">
                      {selected.steps.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] text-slate-700">
                          <span className="w-5 h-5 shrink-0 rounded bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-semibold">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Dependency Requirements</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.dependencies.map((d, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] border border-slate-200">{d}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5"/> Validation Checks
                    </p>
                    <div className="border border-slate-200 rounded divide-y divide-slate-100">
                      {selected.validation.checks.map((c, i) => (
                        <div key={i} className="px-3 py-2 flex items-center justify-between text-[12px]">
                          <span className="text-slate-700">{c.label}</span>
                          {c.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600"/> : <AlertTriangle className="w-4 h-4 text-amber-600"/>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" disabled={!selected.validation.ok} onClick={() => toast.success("Template deployed")}>
                      <PlayCircle className="w-3.5 h-3.5 mr-1.5"/> Deploy
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success("Template cloned")}>
                      <Copy className="w-3.5 h-3.5 mr-1.5"/> Clone
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.info("Edit mode")}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5"/> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success("Validation re-run")}>
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5"/> Validate
                    </Button>
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
