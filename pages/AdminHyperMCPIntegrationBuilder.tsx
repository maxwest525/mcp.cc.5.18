import { useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Plus, Upload, Download, Plug, Webhook, Database, Mail, MessageSquare,
  Megaphone, Sparkles, Cable, Server, Users, ChevronRight, ChevronLeft,
  CheckCircle2, AlertTriangle, XCircle, Activity, ArrowRight, Save, Rocket, FlaskConical,
} from "lucide-react";
import { toast } from "sonner";

// ─── Templates ───
type TemplateKey =
  | "rest" | "webhook" | "crm" | "dialer" | "email" | "sms"
  | "marketing" | "ai" | "database" | "custom";

interface Template {
  key: TemplateKey;
  name: string;
  type: string;
  useCase: string;
  auth: string[];
  icon: React.ElementType;
}

const TEMPLATES: Template[] = [
  { key: "rest", name: "REST API", type: "HTTP", useCase: "Generic REST endpoint integration", auth: ["API Key", "Bearer", "Basic"], icon: Server },
  { key: "webhook", name: "Webhook", type: "Event", useCase: "Inbound or outbound webhook events", auth: ["Webhook Secret", "Bearer"], icon: Webhook },
  { key: "crm", name: "CRM", type: "Platform", useCase: "Bi-directional contact and deal sync", auth: ["OAuth", "API Key"], icon: Users },
  { key: "dialer", name: "Dialer", type: "Telephony", useCase: "Click-to-call, call events, recordings", auth: ["API Key", "OAuth"], icon: Cable },
  { key: "email", name: "Email Provider", type: "Messaging", useCase: "Transactional and marketing email", auth: ["API Key"], icon: Mail },
  { key: "sms", name: "SMS Provider", type: "Messaging", useCase: "Outbound SMS and reply tracking", auth: ["API Key", "Bearer"], icon: MessageSquare },
  { key: "marketing", name: "Marketing Platform", type: "Growth", useCase: "Campaign sync and attribution", auth: ["OAuth", "API Key"], icon: Megaphone },
  { key: "ai", name: "AI Service", type: "Inference", useCase: "LLM, transcription, classification", auth: ["API Key", "Bearer"], icon: Sparkles },
  { key: "database", name: "Database", type: "Storage", useCase: "External Postgres or warehouse sync", auth: ["Basic", "Bearer"], icon: Database },
  { key: "custom", name: "Custom Connector", type: "Custom", useCase: "Build a fully custom integration", auth: ["API Key", "OAuth", "Bearer", "Basic", "Webhook Secret"], icon: Plug },
];

// ─── Existing integrations ───
type Status = "live" | "draft" | "test" | "error" | "paused";

interface Integration {
  id: string;
  name: string;
  type: string;
  auth: string;
  status: Status;
  lastSync: string;
  systems: string[];
  owner: string;
}

const INTEGRATIONS: Integration[] = [
  { id: "i1", name: "Convoso Dialer", type: "Dialer", auth: "API Key", status: "live", lastSync: "2m ago", systems: ["CRM", "Pulse"], owner: "ops@trumove" },
  { id: "i2", name: "RingCentral", type: "Telephony", auth: "OAuth", status: "live", lastSync: "8m ago", systems: ["CRM"], owner: "ops@trumove" },
  { id: "i3", name: "SlickText", type: "SMS Provider", auth: "API Key", status: "live", lastSync: "1m ago", systems: ["CRM", "Marketing"], owner: "marketing@trumove" },
  { id: "i4", name: "Resend", type: "Email Provider", auth: "API Key", status: "live", lastSync: "3m ago", systems: ["CRM"], owner: "marketing@trumove" },
  { id: "i5", name: "FMCSA SAFER", type: "REST API", auth: "API Key", status: "live", lastSync: "21m ago", systems: ["Vetting"], owner: "compliance@trumove" },
  { id: "i6", name: "HubSpot Sync", type: "CRM", auth: "OAuth", status: "test", lastSync: "—", systems: ["CRM"], owner: "admin@trumove" },
  { id: "i7", name: "Stripe Webhooks", type: "Webhook", auth: "Webhook Secret", status: "live", lastSync: "5m ago", systems: ["Payments"], owner: "finance@trumove" },
  { id: "i8", name: "Granot Inventory", type: "REST API", auth: "Bearer", status: "error", lastSync: "47m ago", systems: ["Estimates"], owner: "ops@trumove" },
  { id: "i9", name: "Internal Warehouse", type: "Database", auth: "Basic", status: "draft", lastSync: "—", systems: ["Analytics"], owner: "data@trumove" },
];

const statusMeta = (s: Status) => {
  switch (s) {
    case "live": return { label: "Live", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "test": return { label: "Test", cls: "bg-blue-50 text-blue-700 border-blue-200" };
    case "draft": return { label: "Draft", cls: "bg-slate-50 text-slate-700 border-slate-200" };
    case "error": return { label: "Error", cls: "bg-rose-50 text-rose-700 border-rose-200" };
    case "paused": return { label: "Paused", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  }
};

// ─── Wizard state ───
interface WizardState {
  name: string;
  description: string;
  category: TemplateKey;
  environment: "production" | "test";
  authType: "api_key" | "oauth" | "bearer" | "basic" | "webhook_secret";
  baseUrl: string;
  inboundWebhook: string;
  outboundWebhook: string;
  retries: number;
  timeoutMs: number;
  incomingEvents: string;
  outgoingEvents: string;
  triggerActions: string;
  queueBehavior: "fifo" | "priority" | "parallel";
}

const WIZARD_DEFAULT: WizardState = {
  name: "",
  description: "",
  category: "rest",
  environment: "test",
  authType: "api_key",
  baseUrl: "https://api.example.com/v1",
  inboundWebhook: "https://hypermcp.trumove.com/webhooks/incoming/{integration_id}",
  outboundWebhook: "",
  retries: 3,
  timeoutMs: 15000,
  incomingEvents: "lead.created, lead.updated",
  outgoingEvents: "deal.booked, customer.signed",
  triggerActions: "Create CRM contact, Notify owner, Queue follow-up",
  queueBehavior: "fifo",
};

const STEPS = [
  { n: 1, label: "Basics" },
  { n: 2, label: "Authentication" },
  { n: 3, label: "Endpoints" },
  { n: 4, label: "Event Mapping" },
  { n: 5, label: "Test & Validate" },
];

// ─── Reusable bits ───
const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const Diagnostic = ({ label, status, detail }: { label: string; status: "ok" | "warn" | "err"; detail: string }) => {
  const map = {
    ok: { Icon: CheckCircle2, cls: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", word: "Pass" },
    warn: { Icon: AlertTriangle, cls: "text-amber-600", badge: "bg-amber-50 text-amber-700 border-amber-200", word: "Warning" },
    err: { Icon: XCircle, cls: "text-rose-600", badge: "bg-rose-50 text-rose-700 border-rose-200", word: "Fail" },
  }[status];
  const Icon = map.Icon;
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-t border-border/50 first:border-t-0">
      <div className="flex items-start gap-2 min-w-0">
        <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${map.cls}`} />
        <div className="min-w-0">
          <div className="text-xs font-medium">{label}</div>
          <div className="text-[11px] text-muted-foreground">{detail}</div>
        </div>
      </div>
      <Badge variant="outline" className={`text-[10px] ${map.badge}`}>{map.word}</Badge>
    </div>
  );
};

export default function AdminHyperMCPIntegrationBuilder() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [w, setW] = useState<WizardState>(WIZARD_DEFAULT);
  const set = <K extends keyof WizardState>(k: K, v: WizardState[K]) =>
    setW(prev => ({ ...prev, [k]: v }));

  const openWizard = (preset?: TemplateKey) => {
    setW({ ...WIZARD_DEFAULT, category: preset ?? "rest" });
    setStep(1);
    setWizardOpen(true);
  };

  return (
    <HyperMCPShell breadcrumbs={[{ label: "Integration Builder" }]}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Integration Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure external systems, authentication, event mappings, and automation behavior.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success("Configuration imported")}>
              <Upload className="w-4 h-4 mr-1" />Import Config
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.success("Configuration exported")}>
              <Download className="w-4 h-4 mr-1" />Export Config
            </Button>
            <Button size="sm" onClick={() => openWizard()}>
              <Plus className="w-4 h-4 mr-1" />New Integration
            </Button>
          </div>
        </div>

        {/* Templates */}
        <Card className="border-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Integration Templates</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Start from a pre-configured template or build a custom connector.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => openWizard(t.key)}
                    className="text-left rounded-md border border-border/70 bg-card hover:border-foreground/40 transition-colors p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t.name}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mb-2 line-clamp-2 min-h-[28px]">{t.useCase}</div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">{t.type}</Badge>
                      {t.auth.slice(0, 2).map(a => (
                        <Badge key={a} variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/50">{a}</Badge>
                      ))}
                      {t.auth.length > 2 && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/50">+{t.auth.length - 2}</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Existing Integrations */}
        <Card className="border-border/70">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b border-border/60">
              <div>
                <h3 className="text-sm font-semibold">Existing Integrations</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Manage configured external systems and connectors.</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{INTEGRATIONS.length} total</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-medium">Integration</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Auth</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Last Sync</th>
                    <th className="px-4 py-2 font-medium">Connected</th>
                    <th className="px-4 py-2 font-medium">Owner</th>
                    <th className="px-4 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {INTEGRATIONS.map((i) => {
                    const m = statusMeta(i.status);
                    return (
                      <tr key={i.id} className="border-t border-border/50 hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium">{i.name}</td>
                        <td className="px-4 py-2 text-muted-foreground">{i.type}</td>
                        <td className="px-4 py-2 text-muted-foreground">{i.auth}</td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{i.lastSync}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {i.systems.map(sys => (
                              <Badge key={sys} variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/50">{sys}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{i.owner}</td>
                        <td className="px-4 py-2 text-right">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openWizard()}>Configure</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Flow + Diagnostics */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="border-border/70 xl:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">Integration Flow Preview</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Default orchestration path for inbound events.</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Live preview</Badge>
              </div>
              <div className="flex items-stretch gap-1">
                {[
                  { label: "External System", sub: "API / Webhook", Icon: Plug },
                  { label: "HyperMCP", sub: "Auth + Mapping", Icon: Activity },
                  { label: "Queue", sub: "Retry + DLQ", Icon: Server },
                  { label: "Automation", sub: "Triggers + Rules", Icon: Sparkles },
                  { label: "CRM / Target", sub: "Persist + Notify", Icon: Database },
                ].map((node, idx, arr) => {
                  const Icon = node.Icon;
                  return (
                    <div key={node.label} className="flex items-center flex-1">
                      <div className="flex-1 rounded-md border border-border/70 bg-card p-3 text-center">
                        <div className="w-7 h-7 mx-auto rounded-md bg-muted flex items-center justify-center mb-2">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="text-xs font-medium">{node.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{node.sub}</div>
                      </div>
                      {idx < arr.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mx-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">Validation & Diagnostics</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Live checks across active integrations.</p>
                </div>
              </div>
              <Diagnostic status="ok" label="Authentication" detail="All credentials valid and unexpired." />
              <Diagnostic status="ok" label="API health" detail="9 of 9 endpoints responding under 400ms." />
              <Diagnostic status="warn" label="Payload validation" detail="2 payloads missing optional 'utm_term' field." />
              <Diagnostic status="err" label="Mapping conflicts" detail="Granot Inventory: field 'cuft' not mapped to estimate." />
              <Diagnostic status="warn" label="Retry recommendations" detail="Increase Convoso retry delay from 30s to 45s." />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Wizard */}
      <Sheet open={wizardOpen} onOpenChange={setWizardOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Integration</SheetTitle>
            <SheetDescription>Configure a new external system end-to-end.</SheetDescription>
          </SheetHeader>

          {/* Stepper */}
          <div className="flex items-center justify-between mt-4 mb-5">
            {STEPS.map((s, idx) => {
              const active = step === s.n;
              const done = step > s.n;
              return (
                <div key={s.n} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium border ${
                      active ? "border-foreground bg-foreground text-background"
                      : done ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-card text-muted-foreground"
                    }`}>
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
                    </div>
                    <div className={`text-[10px] mt-1 ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 ${done ? "bg-emerald-500" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step content */}
          {step === 1 && (
            <div className="space-y-3">
              <Field label="Integration Name">
                <Input className="h-8 text-xs" value={w.name} onChange={e => set("name", e.target.value)} placeholder="e.g. HubSpot Production" />
              </Field>
              <Field label="Description">
                <Textarea rows={3} className="text-xs" value={w.description} onChange={e => set("description", e.target.value)}
                  placeholder="What this integration does and which systems it touches." />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <Select value={w.category} onValueChange={v => set("category", v as TemplateKey)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEMPLATES.map(t => <SelectItem key={t.key} value={t.key}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Environment">
                  <Select value={w.environment} onValueChange={v => set("environment", v as any)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="test">Test / Sandbox</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Field label="Authentication Type" hint="Determines required credential fields and rotation policy.">
                <Select value={w.authType} onValueChange={v => set("authType", v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="oauth">OAuth 2.0</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="webhook_secret">Webhook Secret</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {w.authType === "api_key" && (
                <Field label="API Key"><Input className="h-8 text-xs" placeholder="sk_live_••••••••" /></Field>
              )}
              {w.authType === "oauth" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Client ID"><Input className="h-8 text-xs" placeholder="client_id" /></Field>
                  <Field label="Client Secret"><Input className="h-8 text-xs" placeholder="client_secret" /></Field>
                </div>
              )}
              {w.authType === "bearer" && (
                <Field label="Bearer Token"><Input className="h-8 text-xs" placeholder="eyJhbGciOi..." /></Field>
              )}
              {w.authType === "basic" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Username"><Input className="h-8 text-xs" /></Field>
                  <Field label="Password"><Input type="password" className="h-8 text-xs" /></Field>
                </div>
              )}
              {w.authType === "webhook_secret" && (
                <Field label="Signing Secret" hint="Used to validate inbound webhook signatures.">
                  <Input className="h-8 text-xs" placeholder="whsec_••••••••" />
                </Field>
              )}
              <p className="text-[11px] text-muted-foreground">Credentials are stored encrypted in the HyperMCP credentials vault.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Field label="Base URL">
                <Input className="h-8 text-xs" value={w.baseUrl} onChange={e => set("baseUrl", e.target.value)} />
              </Field>
              <Field label="Inbound Webhook URL" hint="HyperMCP-generated endpoint to receive external events.">
                <Input className="h-8 text-xs font-mono" value={w.inboundWebhook} readOnly />
              </Field>
              <Field label="Outbound Webhook URL" hint="Optional — destination for HyperMCP-emitted events.">
                <Input className="h-8 text-xs" value={w.outboundWebhook} onChange={e => set("outboundWebhook", e.target.value)}
                  placeholder="https://your-system.com/hooks/incoming" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Retry Attempts">
                  <Input type="number" min={0} max={10} className="h-8 text-xs" value={w.retries}
                    onChange={e => set("retries", Number(e.target.value))} />
                </Field>
                <Field label="Timeout (ms)">
                  <Input type="number" min={1000} max={120000} step={1000} className="h-8 text-xs" value={w.timeoutMs}
                    onChange={e => set("timeoutMs", Number(e.target.value))} />
                </Field>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <Field label="Incoming Events" hint="Comma-separated event names received from the external system.">
                <Textarea rows={2} className="text-xs" value={w.incomingEvents}
                  onChange={e => set("incomingEvents", e.target.value)} />
              </Field>
              <Field label="Outgoing Events" hint="Events emitted from HyperMCP to the external system.">
                <Textarea rows={2} className="text-xs" value={w.outgoingEvents}
                  onChange={e => set("outgoingEvents", e.target.value)} />
              </Field>
              <Field label="Trigger Actions" hint="What HyperMCP should do when an inbound event lands.">
                <Textarea rows={2} className="text-xs" value={w.triggerActions}
                  onChange={e => set("triggerActions", e.target.value)} />
              </Field>
              <Field label="Queue Behavior">
                <Select value={w.queueBehavior} onValueChange={v => set("queueBehavior", v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fifo">FIFO (preserve order)</SelectItem>
                    <SelectItem value="priority">Priority (severity-weighted)</SelectItem>
                    <SelectItem value="parallel">Parallel (high-throughput)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <div className="rounded-md border border-border/70 p-3 bg-muted/30">
                <div className="text-xs font-semibold mb-2">Connection Test</div>
                <Diagnostic status="ok" label="Authentication" detail="Credentials accepted by remote system." />
                <Diagnostic status="ok" label="Endpoint reachability" detail="Base URL responded with 200 OK in 184ms." />
                <Diagnostic status="warn" label="Payload validation" detail="2 of 14 sample fields missing — non-blocking." />
                <Diagnostic status="ok" label="Webhook signature" detail="Signing secret verified against test payload." />
              </div>
              <div className="rounded-md border border-border/70 p-3">
                <div className="text-xs font-semibold mb-2">Preview Flow</div>
                <div className="text-[11px] text-muted-foreground">
                  External event → HyperMCP receiver → Validate signature → Map fields → Queue ({w.queueBehavior}) → Trigger: <span className="text-foreground">{w.triggerActions}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => toast.success("Draft saved")}>
                  <Save className="w-4 h-4 mr-1" />Save Draft
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.success("Test mode enabled")}>
                  <FlaskConical className="w-4 h-4 mr-1" />Test Mode
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.success("Integration enabled")}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />Enable Integration
                </Button>
                <Button size="sm" onClick={() => { toast.success("Deployed to live"); setWizardOpen(false); }}>
                  <Rocket className="w-4 h-4 mr-1" />Deploy Live
                </Button>
              </div>
            </div>
          )}

          {/* Wizard nav */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/60">
            <Button size="sm" variant="ghost" disabled={step === 1} onClick={() => setStep(s => Math.max(1, s - 1))}>
              <ChevronLeft className="w-4 h-4 mr-1" />Back
            </Button>
            {step < 5 ? (
              <Button size="sm" onClick={() => setStep(s => Math.min(5, s + 1))}>
                Next<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setWizardOpen(false)}>Close</Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}
