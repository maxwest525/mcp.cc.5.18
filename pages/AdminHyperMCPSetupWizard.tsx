import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import PageIntro from "@/components/hypermcp/PageIntro";
import { usePublishAssistantContext } from "@/components/hypermcp/assistantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Check,
  Circle,
  ChevronRight,
  ChevronLeft,
  Plug,
  Users,
  KeyRound,
  ListChecks,
  ClipboardCheck,
  PlayCircle,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Sparkles,
  Workflow,
  Phone,
  Database,
  Webhook,
  Wrench,
  Bot,
  Activity,
  ExternalLink,
  GraduationCap,
  Zap,
  FastForward,
  Lightbulb,
  BookOpen,
} from "lucide-react";

/* ────────────── data ────────────── */

type GoalId =
  | "connect_system"
  | "route_leads"
  | "pulse"
  | "granot"
  | "webhook"
  | "fix_integration"
  | "ai_workflow"
  | "system_health";

const GOALS: { id: GoalId; title: string; desc: string; icon: any }[] = [
  { id: "connect_system", title: "Connect a new system", desc: "Wire a new tool into HyperMCP.", icon: Plug },
  { id: "route_leads", title: "Route leads into the CRM", desc: "Send incoming leads to the right pipeline.", icon: Users },
  { id: "pulse", title: "Connect call monitoring / Pulse", desc: "Stream call events into Pulse coaching.", icon: Phone },
  { id: "granot", title: "Send data to Granot", desc: "Push booked moves into Granot.", icon: Database },
  { id: "webhook", title: "Build a webhook automation", desc: "React to events from any external system.", icon: Webhook },
  { id: "fix_integration", title: "Fix a broken integration", desc: "Diagnose and repair a failing connection.", icon: Wrench },
  { id: "ai_workflow", title: "Set up an AI workflow", desc: "Add AI orchestration to a process.", icon: Bot },
  { id: "system_health", title: "Review system health", desc: "Check overall HyperMCP status.", icon: Activity },
];

const SYSTEMS = [
  "CRM", "Pulse", "Convoso", "RingCentral", "Granot", "Zapier",
  "SearchAtlas", "Google Ads", "Meta Ads", "TikTok Ads", "Microsoft Ads",
  "Email/SMS", "Supabase", "GitHub", "Vercel", "OpenAI", "Claude", "HyperFX",
];

const REQUIREMENTS = [
  { id: "api_key", label: "API Key", desc: "Secret token to authenticate requests." },
  { id: "oauth", label: "OAuth Login", desc: "User consents and authorizes access." },
  { id: "webhook", label: "Webhook URL", desc: "Endpoint that receives event payloads." },
  { id: "field_map", label: "Field Mapping", desc: "Translate fields between systems." },
  { id: "user_map", label: "User Mapping", desc: "Match external users to internal accounts." },
  { id: "test_payload", label: "Test Payload", desc: "Sample event used to validate setup." },
  { id: "permission", label: "Permission Level", desc: "What the integration is allowed to do." },
  { id: "environment", label: "Environment", desc: "Sandbox, staging, or production target." },
];

const STEP_LABELS = [
  "Choose Goal",
  "Select Systems",
  "Requirements",
  "Setup Plan",
  "Checklist",
  "Test Run",
  "Go-Live",
  "Summary",
];

/* ────────────── component ────────────── */

type WizardMode = "first_time" | "experienced" | "preset";

const PRESETS: { id: string; title: string; desc: string; goal: GoalId; source: string; destination: string; icon: any }[] = [
  { id: "convoso_crm", title: "Convoso → CRM", desc: "Stream dialer leads into the CRM pipeline.", goal: "route_leads", source: "Convoso", destination: "CRM", icon: Users },
  { id: "ringcentral_pulse", title: "RingCentral → Pulse", desc: "Send call recordings into Pulse coaching.", goal: "pulse", source: "RingCentral", destination: "Pulse", icon: Phone },
  { id: "crm_granot", title: "CRM → Granot", desc: "Push booked moves into Granot dispatch.", goal: "granot", source: "CRM", destination: "Granot", icon: Database },
  { id: "ai_workflow", title: "AI workflow starter", desc: "Wire OpenAI into a workflow trigger.", goal: "ai_workflow", source: "OpenAI", destination: "CRM", icon: Bot },
];

export default function AdminHyperMCPSetupWizard() {
  const [mode, setMode] = useState<WizardMode | null>(null);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Record<string, boolean>>({
    api_key: true, field_map: true, test_payload: true, environment: true,
  });
  const [checklist, setChecklist] = useState(() => buildChecklist());
  const [testRan, setTestRan] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const startFirstTime = () => { setMode("first_time"); setStep(0); };
  const startExperienced = () => { setMode("experienced"); setStep(0); };
  const startPreset = (p: typeof PRESETS[number]) => {
    setMode("preset");
    setGoal(p.goal);
    setSource(p.source);
    setDestination(p.destination);
    setStep(2);
  };
  const resetAll = () => {
    setMode(null); setStep(0); setGoal(null); setSource(null); setDestination(null);
    setTestRan(false); setDeployed(false); setChecklist(buildChecklist());
  };


  const canNext = useMemo(() => {
    if (step === 0) return !!goal;
    if (step === 1) return !!source && !!destination;
    return true;
  }, [step, goal, source, destination]);

  const completion = checklist.filter((c) => c.status === "done").length;
  const blockers = checklist.filter((c) => c.status === "blocked").length;

  // Publish wizard state to the floating Ask HyperMCP assistant so it can
  // reason over the current goal, systems, requirements, and checklist.
  const goalLabel = GOALS.find((g) => g.id === goal)?.title;
  usePublishAssistantContext(
    useMemo(
      () => ({
        kind: "setup-wizard",
        data: {
          goal,
          goalLabel,
          source,
          destination,
          requirements,
          checklist: checklist.map((c) => ({ id: c.id, title: c.title, status: c.status })),
          step,
          stepLabel: STEP_LABELS[step],
        },
      }),
      [goal, goalLabel, source, destination, requirements, checklist, step]
    )
  );

  return (
    <HyperMCPShell breadcrumb="Setup Wizard">
      <div className="space-y-5">
        <PageIntro
          title="Setup Wizard"
          description="The guided way to configure HyperMCP. Pick a goal, choose your systems, and the wizard generates a setup plan, runs validation, and walks you to go-live without visiting every technical page."
          actions={
            mode && (
              <Button variant="outline" size="sm" onClick={resetAll}>
                Restart Wizard
              </Button>
            )
          }
        />

        {!mode && (
          <WelcomeScreen
            onFirstTime={startFirstTime}
            onExperienced={startExperienced}
            onPreset={startPreset}
          />
        )}

        {mode && (<>
        {mode === "first_time" && <FirstTimeHint step={step} />}

        {/* Stepper */}
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STEP_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => i <= step && setStep(i)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors",
                  i === step ? "bg-foreground text-background font-medium" :
                  i < step ? "text-foreground hover:bg-muted" : "text-muted-foreground"
                )}
              >
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold border",
                  i === step ? "border-background/30 bg-background/10" :
                  i < step ? "border-[#16A34A] bg-[#16A34A] text-white" : "border-border"
                )}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                {label}
                {i < STEP_LABELS.length - 1 && <ChevronRight className="w-3 h-3 opacity-40" />}
              </button>
            ))}
          </div>
        </div>

        {/* Step body */}
        <div className="rounded-lg border bg-card">
          {step === 0 && (
            <StepWrap title="What are you trying to do?" subtitle="Pick a goal. The wizard will tailor the rest of the setup based on your selection.">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {GOALS.map((g) => {
                  const Icon = g.icon;
                  const active = goal === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id)}
                      className={cn(
                        "text-left p-3 rounded-lg border transition-all",
                        active ? "border-foreground bg-muted/40 shadow-sm" : "hover:border-foreground/40 hover:bg-muted/20"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-md border bg-muted/40 flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {active && <Check className="w-3.5 h-3.5 text-[#16A34A] ml-auto" />}
                      </div>
                      <div className="text-sm font-medium">{g.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{g.desc}</div>
                    </button>
                  );
                })}
              </div>
            </StepWrap>
          )}

          {step === 1 && (
            <StepWrap title="Select your systems" subtitle="Choose where the data is coming from and where it should land.">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SystemPicker label="Source system" value={source} onChange={setSource} />
                <SystemPicker label="Destination system" value={destination} onChange={setDestination} />
              </div>
              {source && destination && (
                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30 text-sm">
                  <span className="font-medium">{source}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{destination}</span>
                  <span className="ml-auto text-xs text-muted-foreground">Connection direction confirmed</span>
                </div>
              )}
            </StepWrap>
          )}

          {step === 2 && (
            <StepWrap title="What this connection needs" subtitle="HyperMCP detected the following requirements based on your selection. Toggle anything that doesn't apply.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {REQUIREMENTS.map((r) => {
                  const on = !!requirements[r.id];
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRequirements((p) => ({ ...p, [r.id]: !on }))}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                        on ? "border-foreground/40 bg-muted/40" : "hover:bg-muted/20"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5",
                        on ? "bg-[#16A34A] border-[#16A34A]" : "border-border bg-background"
                      )}>
                        {on && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                          {r.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </StepWrap>
          )}

          {step === 3 && (
            <StepWrap title="Recommended setup plan" subtitle="Here's the path HyperMCP recommends to safely get this live. You'll work through each step in the next screen.">
              <div className="rounded-lg border bg-background overflow-hidden">
                <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Plan for {source ?? "Source"} → {destination ?? "Destination"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Auto-generated
                  </div>
                </div>
                <div className="divide-y">
                  {checklist.map((c, i) => (
                    <div key={c.id} className="px-3 py-2.5 flex items-center gap-3 text-sm">
                      <div className="w-6 h-6 rounded-full border bg-muted/30 flex items-center justify-center text-[11px] font-semibold shrink-0">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{c.title}</div>
                        <div className="text-xs text-muted-foreground">{c.desc}</div>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{c.owner}</div>
                    </div>
                  ))}
                </div>
              </div>
            </StepWrap>
          )}

          {step === 4 && (
            <StepWrap title="Setup checklist" subtitle="Mark each step complete as you finish it. Open the related HyperMCP page only if you need it.">
              <div className="rounded-lg border bg-background divide-y">
                {checklist.map((c) => (
                  <div key={c.id} className="px-3 py-2.5 flex items-center gap-3 text-sm">
                    <button
                      onClick={() => toggleStatus(c.id, setChecklist)}
                      className={cn(
                        "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                        c.status === "done" ? "bg-[#16A34A] border-[#16A34A]" :
                        c.status === "blocked" ? "bg-destructive/10 border-destructive" :
                        "bg-background"
                      )}
                    >
                      {c.status === "done" ? <Check className="w-3.5 h-3.5 text-white" /> :
                       c.status === "blocked" ? <XCircle className="w-3.5 h-3.5 text-destructive" /> :
                       <Circle className="w-2.5 h-2.5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {c.title}
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="text-xs text-muted-foreground">{c.desc}</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground hidden md:block">{c.owner}</div>
                    {c.href && (
                      <Link to={c.href} className="text-xs text-foreground/80 hover:text-foreground inline-flex items-center gap-1 border rounded-md px-2 py-1 hover:bg-muted/40">
                        Open <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </StepWrap>
          )}

          {step === 5 && (
            <StepWrap title="Test run" subtitle="Send a sample event through the new connection and check the result before going live.">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <PayloadCard title="Sample event" tone="muted">
{`{
  "event": "lead.created",
  "source": "${source ?? "—"}",
  "destination": "${destination ?? "—"}",
  "payload": {
    "name": "Jordan Smith",
    "email": "jordan@example.com",
    "phone": "+13105550101",
    "move_date": "2026-06-12",
    "from_zip": "90210",
    "to_zip": "30301"
  }
}`}
                </PayloadCard>
                <PayloadCard title="Expected output" tone="muted">
{`{
  "status": "ok",
  "mapped": {
    "first_name": "Jordan",
    "last_name": "Smith",
    "email": "jordan@example.com",
    "phone_e164": "+13105550101",
    "pipeline": "new_leads"
  },
  "warnings": []
}`}
                </PayloadCard>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Button onClick={() => setTestRan(true)} variant="default" size="sm">
                  <PlayCircle className="w-4 h-4" /> Run test event
                </Button>
                {testRan && <span className="text-xs text-[#16A34A] flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Test completed</span>}
              </div>

              {testRan && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <ResultCard ok label="Schema validation" detail="All required fields present" />
                  <ResultCard ok label="Authentication" detail="Credentials accepted" />
                  <ResultCard warn label="Field mapping" detail="1 optional field unmapped: lead_source" />
                </div>
              )}

              {testRan && (
                <div className="mt-3 rounded-lg border bg-[#fffbeb] border-[#f59e0b]/30 px-3 py-2.5 text-sm">
                  <div className="font-medium text-[#78350f] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Fix recommendations
                  </div>
                  <ul className="mt-1 text-xs text-[#78350f]/90 list-disc pl-5 space-y-0.5">
                    <li>Map <code className="px-1 bg-white/60 rounded">lead_source</code> to a CRM field for attribution.</li>
                    <li>Add a fallback pipeline in case routing rules don't match.</li>
                  </ul>
                </div>
              )}
            </StepWrap>
          )}

          {step === 6 && (
            <StepWrap title="Go-live readiness" subtitle="HyperMCP checked the prerequisites. Resolve any blockers before deploying to live.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <ReadyRow ok label="Credentials verified" />
                <ReadyRow ok label="Field mapping complete" />
                <ReadyRow ok={testRan} label="Workflow tested" hint={testRan ? "Test passed" : "Run a test in step 6"} />
                <ReadyRow ok label="Policy checks passed" />
                <ReadyRow ok label="Approval not required" hint="Auto-approved for this environment" />
                <ReadyRow ok={testRan} label="Deployment ready" hint={testRan ? "All systems go" : "Blocked: testing required"} />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button
                  onClick={() => setDeployed(true)}
                  disabled={!testRan || deployed}
                  variant="default"
                  size="sm"
                >
                  <Rocket className="w-4 h-4" /> {deployed ? "Deployed" : "Deploy to live"}
                </Button>
                {deployed && <span className="text-xs text-[#16A34A] flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Live in production</span>}
              </div>
            </StepWrap>
          )}

          {step === 7 && (
            <StepWrap title="Setup summary" subtitle="Here's everything that was configured during this wizard run.">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <SummaryCard title="Systems connected">
                  <div className="text-sm flex items-center gap-2">
                    <span className="font-medium">{source ?? "—"}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium">{destination ?? "—"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Goal: {GOALS.find((g) => g.id === goal)?.title ?? "—"}
                  </div>
                </SummaryCard>

                <SummaryCard title="Workflow created">
                  <div className="text-sm font-medium">{(source ?? "Source")} → {(destination ?? "Destination")} sync</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {completion}/{checklist.length} steps complete · {deployed ? "Live" : "Draft"}
                  </div>
                </SummaryCard>

                <SummaryCard title="Remaining issues">
                  {blockers === 0 ? (
                    <div className="text-sm text-[#16A34A] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> No blockers</div>
                  ) : (
                    <div className="text-sm text-destructive flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {blockers} blocker{blockers > 1 ? "s" : ""}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">1 optional field still unmapped (lead_source).</div>
                </SummaryCard>

                <SummaryCard title="Recommended next action">
                  <div className="text-sm font-medium">
                    {deployed ? "Monitor first 24h of traffic" : "Run a test event and deploy"}
                  </div>
                  <Link to={deployed ? "/hypermcp/observability" : "/hypermcp/automation-flows"} className="text-xs inline-flex items-center gap-1 text-foreground hover:underline mt-1">
                    Open page <ArrowRight className="w-3 h-3" />
                  </Link>
                </SummaryCard>
              </div>
            </StepWrap>
          )}

          {/* Footer nav */}
          <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20">
            <Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <div className="text-xs text-muted-foreground">Step {step + 1} of {STEP_LABELS.length}</div>
            {step < STEP_LABELS.length - 1 ? (
              <Button size="sm" disabled={!canNext} onClick={() => setStep((s) => Math.min(STEP_LABELS.length - 1, s + 1))}>
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setStep(0)}>Start new setup</Button>
            )}
          </div>
        </div>
        </>)}
      </div>
    </HyperMCPShell>
  );
}

/* ────────────── helpers ────────────── */

function StepWrap({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4">
        <div className="text-base font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function SystemPicker({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string) => void }) {
  const [filter, setFilter] = useState("");
  const filtered = SYSTEMS.filter((s) => s.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="rounded-lg border bg-background overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        {value && <span className="text-xs text-foreground font-medium">{value}</span>}
      </div>
      <div className="p-2 border-b">
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search systems..." className="h-8 text-sm" />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {filtered.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={cn(
              "w-full text-left px-3 py-1.5 text-sm hover:bg-muted/40 flex items-center gap-2",
              value === s && "bg-muted/60 font-medium"
            )}
          >
            <Plug className="w-3.5 h-3.5 text-muted-foreground" />
            {s}
            {value === s && <Check className="w-3.5 h-3.5 text-[#16A34A] ml-auto" />}
          </button>
        ))}
      </div>
    </div>
  );
}

type ChecklistStatus = "todo" | "done" | "blocked";
interface ChecklistItem {
  id: string;
  title: string;
  desc: string;
  owner: string;
  status: ChecklistStatus;
  href?: string;
}

function buildChecklist(): ChecklistItem[] {
  return [
    { id: "creds", title: "Connect credentials", desc: "Add the API key or OAuth login for the source.", owner: "Admin", status: "done", href: "/hypermcp/credentials" },
    { id: "test_conn", title: "Test connection", desc: "Confirm HyperMCP can reach the system.", owner: "Admin", status: "done", href: "/hypermcp/integrations" },
    { id: "detect_fields", title: "Detect available fields", desc: "Pull the schema from the source.", owner: "System", status: "done", href: "/hypermcp/schema-registry" },
    { id: "field_map", title: "Create field mapping", desc: "Match source fields to destination fields.", owner: "Admin", status: "todo", href: "/hypermcp/data-mapping" },
    { id: "user_map", title: "Create user mapping", desc: "Match users between systems.", owner: "Admin", status: "todo", href: "/hypermcp/user-mapping" },
    { id: "rule", title: "Create workflow rule", desc: "Decide what triggers the automation.", owner: "Admin", status: "todo", href: "/hypermcp/workflow-rules" },
    { id: "test_event", title: "Run test event", desc: "Send a sample payload through.", owner: "Admin", status: "todo", href: "/hypermcp/event-explorer" },
    { id: "deploy", title: "Deploy to live", desc: "Promote the workflow to production.", owner: "Admin", status: "todo", href: "/hypermcp/environment-manager" },
  ];
}

function toggleStatus(id: string, set: React.Dispatch<React.SetStateAction<ChecklistItem[]>>) {
  set((prev) => prev.map((c) => {
    if (c.id !== id) return c;
    const next: ChecklistStatus = c.status === "todo" ? "done" : c.status === "done" ? "blocked" : "todo";
    return { ...c, status: next };
  }));
}

function StatusBadge({ status }: { status: ChecklistStatus }) {
  const map = {
    todo: { label: "To do", cls: "bg-muted text-muted-foreground" },
    done: { label: "Done", cls: "bg-[#16A34A]/10 text-[#15803d] border-[#16A34A]/30" },
    blocked: { label: "Blocked", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  } as const;
  const m = map[status];
  return <span className={cn("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border", m.cls)}>{m.label}</span>;
}

function PayloadCard({ title, children, tone = "muted" }: { title: string; children: React.ReactNode; tone?: "muted" }) {
  return (
    <div className="rounded-lg border bg-background overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/30 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      <pre className="text-[11px] leading-relaxed p-3 overflow-x-auto font-mono text-foreground/80">{children}</pre>
    </div>
  );
}

function ResultCard({ ok, warn, label, detail }: { ok?: boolean; warn?: boolean; label: string; detail: string }) {
  const Icon = ok ? CheckCircle2 : warn ? AlertTriangle : XCircle;
  const color = ok ? "text-[#16A34A]" : warn ? "text-[#b45309]" : "text-destructive";
  const bg = ok ? "bg-[#f0fdf4] border-[#16A34A]/20" : warn ? "bg-[#fffbeb] border-[#f59e0b]/30" : "bg-destructive/5 border-destructive/30";
  return (
    <div className={cn("rounded-lg border px-3 py-2", bg)}>
      <div className={cn("text-xs font-medium flex items-center gap-1.5", color)}>
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{detail}</div>
    </div>
  );
}

function ReadyRow({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 px-3 py-2 rounded-lg border",
      ok ? "bg-[#f0fdf4] border-[#16A34A]/20" : "bg-destructive/5 border-destructive/30"
    )}>
      {ok ? <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> : <XCircle className="w-4 h-4 text-destructive" />}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function WelcomeScreen({
  onFirstTime,
  onExperienced,
  onPreset,
}: {
  onFirstTime: () => void;
  onExperienced: () => void;
  onPreset: (p: typeof PRESETS[number]) => void;
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/20">
        <div className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-foreground/70" />
          Welcome to HyperMCP Setup
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          How would you like to get started? Pick the path that matches your experience.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
        <button
          onClick={onFirstTime}
          className="text-left p-4 rounded-lg border-2 border-foreground/80 bg-foreground/[0.03] hover:bg-foreground/[0.06] transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md bg-foreground text-background flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-foreground/70 px-2 py-0.5 rounded-full border border-foreground/30">
              Recommended
            </span>
          </div>
          <div className="text-sm font-semibold">First time using HyperMCP</div>
          <div className="text-xs text-muted-foreground mt-1">
            Walk through the wizard with extra guidance, plain-English explanations, and inline tips at every step. Best if you've never connected an integration before.
          </div>
          <div className="mt-3 text-xs font-medium text-foreground inline-flex items-center gap-1">
            Start guided setup <ArrowRight className="w-3 h-3" />
          </div>
        </button>

        <button
          onClick={onExperienced}
          className="text-left p-4 rounded-lg border hover:border-foreground/40 hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md border bg-muted/40 flex items-center justify-center">
              <FastForward className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-semibold">I've done this before</div>
          <div className="text-xs text-muted-foreground mt-1">
            Skip the explanations and jump straight into the wizard. Same steps, no inline coaching.
          </div>
          <div className="mt-3 text-xs font-medium text-foreground inline-flex items-center gap-1">
            Open wizard <ArrowRight className="w-3 h-3" />
          </div>
        </button>
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-lg border bg-background overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Quick-start presets
            </div>
            <div className="text-[11px] text-muted-foreground">Skip goal + system selection</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => onPreset(p)}
                  className="text-left p-2.5 rounded-md border hover:border-foreground/40 hover:bg-muted/20 transition-colors flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 rounded-md border bg-muted/40 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const FIRST_TIME_HINTS: Record<number, { title: string; body: string }> = {
  0: { title: "Start by picking your goal", body: "Don't worry about the technical details yet. Just choose what you're trying to accomplish in plain English. The wizard tailors everything else from this." },
  1: { title: "Source vs. destination", body: "The source is where the data starts (e.g. Convoso). The destination is where it should end up (e.g. CRM). If you're not sure, pick your dialer or lead system as the source." },
  2: { title: "What HyperMCP needs to connect", body: "These are the building blocks for any integration. Toggle off anything that obviously doesn't apply. We'll collect the actual values in the next steps." },
  3: { title: "This is your roadmap", body: "Read through the auto-generated plan so you know what's coming. Nothing is being deployed yet, this is just the path." },
  4: { title: "Work through the checklist", body: "Click each item to mark it Done, To do, or Blocked. Use the Open buttons only if you need to configure something deeper. Most teams finish in 10–15 minutes." },
  5: { title: "Always test before going live", body: "A test event proves the connection actually works end-to-end. If anything fails, the wizard will recommend fixes inline." },
  6: { title: "Final pre-flight check", body: "Resolve any red items before deploying. Once you click Deploy, the integration is live in production." },
  7: { title: "You're done", body: "Review the summary, then keep an eye on Observability for the first 24 hours to confirm real traffic flows correctly." },
};

function FirstTimeHint({ step }: { step: number }) {
  const hint = FIRST_TIME_HINTS[step];
  if (!hint) return null;
  return (
    <div className="rounded-lg border bg-[#f8fafc] border-foreground/15 px-3 py-2.5 flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-md bg-foreground text-background flex items-center justify-center shrink-0">
        <Lightbulb className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-muted-foreground" />
          Guided tip · {hint.title}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{hint.body}</div>
      </div>
    </div>
  );
}
