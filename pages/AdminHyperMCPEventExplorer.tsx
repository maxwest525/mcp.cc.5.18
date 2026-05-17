import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Play, Pause, Download, Search, Filter, RefreshCcw, ArrowRight,
  AlertTriangle, CheckCircle2, XCircle, Clock, RotateCcw, Eye,
  Database, Workflow, Webhook, ListOrdered, Activity, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

type EventStatus = "success" | "failed" | "retrying" | "queued" | "processing";

interface EventRow {
  id: string;
  ts: string;
  tsAgo: string;
  type: string;
  source: string;
  destination: string;
  workflow: string;
  status: EventStatus;
  processingMs: number;
  retries: number;
  payload: Record<string, unknown>;
  error?: string;
}

const EVENT_TYPES = [
  "lead.created",
  "lead.updated",
  "call.completed",
  "webhook.received",
  "sync.completed",
  "auth.failed",
  "automation.triggered",
  "crm.push.completed",
  "transcript.generated",
  "compliance.alert.created",
];

const SOURCES = ["Convoso", "RingCentral", "Webhook Engine", "Pulse", "SearchAtlas", "Zapier", "CRM API", "Auth Service"];
const DESTINATIONS = ["CRM API", "Automation Queue", "Pulse", "Supabase", "Email/SMS", "Webhook Engine"];
const WORKFLOWS = ["lead-intake", "call-disposition", "compliance-scan", "crm-sync", "auth-handshake", "automation-dispatch"];

function makeEvents(): EventRow[] {
  const seed: Array<Partial<EventRow>> = [
    { type: "lead.created", source: "Convoso", destination: "CRM API", workflow: "lead-intake", status: "success", processingMs: 184, retries: 0 },
    { type: "call.completed", source: "RingCentral", destination: "Pulse", workflow: "call-disposition", status: "success", processingMs: 312, retries: 0 },
    { type: "webhook.received", source: "Webhook Engine", destination: "Automation Queue", workflow: "automation-dispatch", status: "processing", processingMs: 42, retries: 0 },
    { type: "auth.failed", source: "Auth Service", destination: "Supabase", workflow: "auth-handshake", status: "failed", processingMs: 1840, retries: 2, error: "401 Unauthorized — token expired" },
    { type: "sync.completed", source: "SearchAtlas", destination: "Supabase", workflow: "crm-sync", status: "success", processingMs: 2210, retries: 0 },
    { type: "automation.triggered", source: "Zapier", destination: "Automation Queue", workflow: "automation-dispatch", status: "retrying", processingMs: 612, retries: 1 },
    { type: "crm.push.completed", source: "CRM API", destination: "Supabase", workflow: "crm-sync", status: "success", processingMs: 96, retries: 0 },
    { type: "transcript.generated", source: "Pulse", destination: "Supabase", workflow: "compliance-scan", status: "success", processingMs: 1420, retries: 0 },
    { type: "compliance.alert.created", source: "Pulse", destination: "Email/SMS", workflow: "compliance-scan", status: "success", processingMs: 88, retries: 0 },
    { type: "lead.updated", source: "CRM API", destination: "Webhook Engine", workflow: "lead-intake", status: "success", processingMs: 64, retries: 0 },
    { type: "webhook.received", source: "Convoso", destination: "Automation Queue", workflow: "lead-intake", status: "failed", processingMs: 980, retries: 3, error: "Schema validation failed: missing 'phone'" },
    { type: "call.completed", source: "Convoso", destination: "Pulse", workflow: "call-disposition", status: "success", processingMs: 244, retries: 0 },
    { type: "automation.triggered", source: "Webhook Engine", destination: "Email/SMS", workflow: "automation-dispatch", status: "queued", processingMs: 0, retries: 0 },
    { type: "sync.completed", source: "Zapier", destination: "CRM API", workflow: "crm-sync", status: "success", processingMs: 412, retries: 0 },
    { type: "auth.failed", source: "Auth Service", destination: "Supabase", workflow: "auth-handshake", status: "retrying", processingMs: 1120, retries: 1, error: "Refresh token rotation conflict" },
    { type: "lead.created", source: "Webhook Engine", destination: "CRM API", workflow: "lead-intake", status: "success", processingMs: 142, retries: 0 },
    { type: "transcript.generated", source: "Pulse", destination: "Supabase", workflow: "compliance-scan", status: "failed", processingMs: 2940, retries: 2, error: "OpenAI rate limit exceeded" },
    { type: "compliance.alert.created", source: "Pulse", destination: "Webhook Engine", workflow: "compliance-scan", status: "success", processingMs: 76, retries: 0 },
  ];
  return seed.map((e, i) => {
    const minsAgo = i * 2 + Math.floor(Math.random() * 3);
    const d = new Date(Date.now() - minsAgo * 60_000);
    return {
      id: `evt_${(Date.now() - i * 1000).toString(36)}${i}`,
      ts: d.toISOString(),
      tsAgo: minsAgo === 0 ? "Just now" : `${minsAgo}m ago`,
      payload: {
        event_id: `evt_${i}`,
        timestamp: d.toISOString(),
        source_system: e.source,
        destination_system: e.destination,
        workflow: e.workflow,
        data: {
          lead_id: `ld_${1000 + i}`,
          phone: "+1 (555) 010-" + (2000 + i),
          name: ["Sarah Mitchell", "James Carter", "Priya Patel", "Marcus Lee"][i % 4],
          source_campaign: ["google_search_q4", "meta_retargeting", "organic", "referral"][i % 4],
        },
        meta: { region: "us-east-1", attempt: (e.retries ?? 0) + 1 },
      },
      ...e,
    } as EventRow;
  });
}

const STATUS_META: Record<EventStatus, { label: string; dot: string; text: string; bg: string }> = {
  success:    { label: "Success",    dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  failed:     { label: "Failed",     dot: "bg-rose-500",    text: "text-rose-700",    bg: "bg-rose-50 border-rose-200" },
  retrying:   { label: "Retrying",   dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  queued:     { label: "Queued",     dot: "bg-slate-400",   text: "text-slate-700",   bg: "bg-slate-50 border-slate-200" },
  processing: { label: "Processing", dot: "bg-sky-500",     text: "text-sky-700",     bg: "bg-sky-50 border-sky-200" },
};

const Kpi = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Card className="border-border/70">
    <CardContent className="p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1 leading-tight">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </CardContent>
  </Card>
);

export default function AdminHyperMCPEventExplorer() {
  const [events] = useState<EventRow[]>(() => makeEvents());
  const [streaming, setStreaming] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [fType, setFType] = useState<string>("all");
  const [fSource, setFSource] = useState<string>("all");
  const [fDest, setFDest] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fWorkflow, setFWorkflow] = useState<string>("all");

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (fType !== "all" && e.type !== fType) return false;
      if (fSource !== "all" && e.source !== fSource) return false;
      if (fDest !== "all" && e.destination !== fDest) return false;
      if (fStatus !== "all" && e.status !== fStatus) return false;
      if (fWorkflow !== "all" && e.workflow !== fWorkflow) return false;
      if (search && !e.id.toLowerCase().includes(search.toLowerCase()) && !e.type.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [events, fType, fSource, fDest, fStatus, fWorkflow, search]);

  const kpis = useMemo(() => {
    const failed = events.filter((e) => e.status === "failed").length;
    const retried = events.filter((e) => e.retries > 0).length;
    const avg = Math.round(
      events.filter((e) => e.processingMs > 0).reduce((a, e) => a + e.processingMs, 0) /
        Math.max(1, events.filter((e) => e.processingMs > 0).length),
    );
    return { failed, retried, avg };
  }, [events]);

  const failureAnalysis = useMemo(() => {
    const byError: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const slowest: Record<string, number> = {};
    events.forEach((e) => {
      if (e.status === "failed" && e.error) byError[e.error] = (byError[e.error] ?? 0) + 1;
      if (e.retries > 0) byType[e.type] = (byType[e.type] ?? 0) + e.retries;
      slowest[e.workflow] = Math.max(slowest[e.workflow] ?? 0, e.processingMs);
    });
    return {
      commonFailures: Object.entries(byError).sort((a, b) => b[1] - a[1]).slice(0, 4),
      mostRetried: Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 4),
      slowest: Object.entries(slowest).sort((a, b) => b[1] - a[1]).slice(0, 4),
    };
  }, [events]);

  const open = openId ? events.find((e) => e.id === openId) : null;

  return (
    <HyperMCPShell breadcrumbs={[{ label: "Event Explorer" }]}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Event Explorer</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Inspect and trace orchestration events, payloads, and workflow execution history.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success("Events exported")}>
              <Download className="w-4 h-4 mr-1" />Export Events
            </Button>
            {streaming ? (
              <Button variant="outline" size="sm" onClick={() => { setStreaming(false); toast.message("Stream paused"); }}>
                <Pause className="w-4 h-4 mr-1" />Pause Stream
              </Button>
            ) : (
              <Button size="sm" onClick={() => { setStreaming(true); toast.success("Live stream resumed"); }}>
                <Play className="w-4 h-4 mr-1" />Live Stream
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <Kpi label="Events Today"        value="14,820" hint="+8.4% vs yesterday" />
          <Kpi label="Events / Min"        value="184"    hint="Rolling 5-min avg" />
          <Kpi label="Failed Events"       value={`${kpis.failed}`} hint="Last 1h" />
          <Kpi label="Retried Events"      value={`${kpis.retried}`} hint="Last 1h" />
          <Kpi label="Avg Processing Time" value={`${kpis.avg}ms`}  hint="p50 across types" />
          <Kpi label="Active Streams"      value="12"     hint="Open subscriptions" />
        </div>

        {/* Filters */}
        <Card className="border-border/70">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search event ID or type…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <FilterSelect label="Event Type" value={fType} onChange={setFType} options={EVENT_TYPES} />
              <FilterSelect label="Source" value={fSource} onChange={setFSource} options={SOURCES} />
              <FilterSelect label="Destination" value={fDest} onChange={setFDest} options={DESTINATIONS} />
              <FilterSelect label="Workflow" value={fWorkflow} onChange={setFWorkflow} options={WORKFLOWS} />
              <FilterSelect label="Status" value={fStatus} onChange={setFStatus} options={["success", "failed", "retrying", "queued", "processing"]} />
              <Button variant="outline" size="sm" className="h-8" onClick={() => { setFType("all"); setFSource("all"); setFDest("all"); setFStatus("all"); setFWorkflow("all"); setSearch(""); }}>
                <RefreshCcw className="w-3.5 h-3.5 mr-1" />Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Event Stream Table */}
        <Card className="border-border/70">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/70">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Event Stream</h3>
                <Badge variant="outline" className={`h-5 text-[10px] ${streaming ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-slate-300 text-slate-600 bg-slate-50"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${streaming ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                  {streaming ? "Live" : "Paused"}
                </Badge>
                <span className="text-xs text-muted-foreground">{filtered.length} events</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 border-b border-border/70">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Timestamp</th>
                    <th className="px-3 py-2 font-medium">Event ID</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Destination</th>
                    <th className="px-3 py-2 font-medium">Workflow</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Time</th>
                    <th className="px-3 py-2 font-medium text-right">Retries</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const m = STATUS_META[e.status];
                    return (
                      <tr key={e.id} className="border-b border-border/60 hover:bg-muted/30 cursor-pointer" onClick={() => setOpenId(e.id)}>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{e.tsAgo}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">{e.id}</td>
                        <td className="px-3 py-2 font-mono">{e.type}</td>
                        <td className="px-3 py-2">{e.source}</td>
                        <td className="px-3 py-2">{e.destination}</td>
                        <td className="px-3 py-2 text-muted-foreground">{e.workflow}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[11px] ${m.bg} ${m.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                            {m.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{e.processingMs > 0 ? `${e.processingMs}ms` : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{e.retries}</td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={(ev) => { ev.stopPropagation(); setOpenId(e.id); }}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} className="px-3 py-12 text-center text-muted-foreground">No events match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Trace + Failure Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Trace Visualization */}
          <Card className="border-border/70 lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">Event Trace</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Standard orchestration flow for events through HyperMCP.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto py-3">
                {[
                  { label: "Source", icon: Webhook, hint: "External system" },
                  { label: "Queue", icon: ListOrdered, hint: "Buffered intake" },
                  { label: "Processor", icon: Workflow, hint: "Validation + routing" },
                  { label: "Automation", icon: Activity, hint: "Triggers & actions" },
                  { label: "Destination", icon: Database, hint: "CRM / external" },
                ].map((step, i, arr) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="flex items-center gap-2 shrink-0">
                      <div className="rounded-md border border-border/70 bg-card px-3 py-2.5 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                            <Icon className="w-3.5 h-3.5 text-foreground/70" />
                          </div>
                          <div>
                            <div className="text-xs font-medium">{step.label}</div>
                            <div className="text-[10px] text-muted-foreground">{step.hint}</div>
                          </div>
                        </div>
                      </div>
                      {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Failure Analysis */}
          <Card className="border-border/70">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold">Failure Analysis</h3>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Patterns from the last 24 hours.</p>

              <div className="space-y-3">
                <FailureBlock title="Most common failures" items={failureAnalysis.commonFailures.map(([k, v]) => ({ label: k, value: `${v}` }))} />
                <FailureBlock title="Slowest workflows" items={failureAnalysis.slowest.map(([k, v]) => ({ label: k, value: `${v}ms` }))} />
                <FailureBlock title="Most retried event types" items={failureAnalysis.mostRetried.map(([k, v]) => ({ label: k, value: `${v}×` }))} />
                <FailureBlock title="Largest queue bottlenecks" items={[
                  { label: "automation-dispatch", value: "38" },
                  { label: "crm-sync", value: "12" },
                  { label: "compliance-scan", value: "4" },
                ]} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm">{open.type}</span>
                  <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[11px] ${STATUS_META[open.status].bg} ${STATUS_META[open.status].text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[open.status].dot}`} />
                    {STATUS_META[open.status].label}
                  </span>
                </SheetTitle>
                <SheetDescription className="font-mono text-[11px]">{open.id}</SheetDescription>
              </SheetHeader>

              <div className="space-y-5 mt-5">
                {/* Source/Dest meta */}
                <div className="grid grid-cols-2 gap-3">
                  <MetaBlock label="Source" value={open.source} sub={open.workflow} />
                  <MetaBlock label="Destination" value={open.destination} sub={`Attempt ${open.retries + 1}`} />
                </div>

                {/* Trace timeline */}
                <Section title="Processing Timeline">
                  <div className="space-y-2">
                    {[
                      { label: "Received from source", t: "0ms", ok: true },
                      { label: "Queued for processing", t: `${Math.round(open.processingMs * 0.1)}ms`, ok: true },
                      { label: "Validation complete", t: `${Math.round(open.processingMs * 0.3)}ms`, ok: true },
                      { label: "Routed to destination", t: `${Math.round(open.processingMs * 0.7)}ms`, ok: open.status !== "failed" },
                      { label: open.status === "failed" ? "Failed" : "Acknowledged", t: `${open.processingMs}ms`, ok: open.status !== "failed" },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-xs border border-border/60 rounded px-2.5 py-1.5">
                        <div className="flex items-center gap-2">
                          {s.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                          <span>{s.label}</span>
                        </div>
                        <span className="font-mono text-muted-foreground">{s.t}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Error trace */}
                {open.error && (
                  <Section title="Error Trace">
                    <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-mono">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="font-semibold">{open.error}</span>
                      </div>
                      <div className="text-rose-700/80 text-[11px] mt-2">
                        at WorkflowProcessor.execute (workflows/{open.workflow}.ts:42){"\n"}
                        at HyperMCP.dispatch (orchestrator.ts:118){"\n"}
                        at WebhookHandler.process (webhook-engine.ts:84)
                      </div>
                    </div>
                  </Section>
                )}

                {/* Payload */}
                <Section title="Payload">
                  <pre className="text-[11px] font-mono bg-muted/40 border border-border/60 rounded p-3 overflow-x-auto max-h-72">
{JSON.stringify(open.payload, null, 2)}
                  </pre>
                </Section>

                {/* Retry history */}
                <Section title="Retry History">
                  {open.retries === 0 ? (
                    <div className="text-xs text-muted-foreground">No retries — succeeded on first attempt.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {Array.from({ length: open.retries }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between text-xs border border-border/60 rounded px-2.5 py-1.5">
                          <div className="flex items-center gap-2">
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                            <span>Attempt {i + 1}</span>
                          </div>
                          <span className="text-muted-foreground">backoff {Math.pow(2, i) * 250}ms</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Related */}
                <Section title="Related Records">
                  <div className="grid grid-cols-1 gap-1.5">
                    <RelatedRow label="Sync Job" value={`sync_${open.workflow}_${open.id.slice(-4)}`} />
                    <RelatedRow label="Webhook Event" value={`whk_${open.id.slice(-6)}`} />
                    <RelatedRow label="Audit Log" value={`audit_${open.id.slice(-5)}`} />
                  </div>
                </Section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}

/* ─────────── helpers ─────────── */

function FilterSelect({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[150px] text-xs">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">All {label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-xs font-mono">{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FailureBlock({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{title}</div>
      <div className="space-y-1">
        {items.length === 0 && <div className="text-xs text-muted-foreground">No data.</div>}
        {items.map((i) => (
          <div key={i.label} className="flex items-center justify-between text-xs border border-border/60 rounded px-2 py-1">
            <span className="truncate pr-2">{i.label}</span>
            <span className="font-mono text-muted-foreground">{i.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetaBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-border/60 rounded-md p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-foreground/80 mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function RelatedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs border border-border/60 rounded px-2.5 py-1.5 hover:bg-muted/40 cursor-pointer">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1 font-mono">{value}<ChevronRight className="w-3 h-3 text-muted-foreground" /></span>
    </div>
  );
}
