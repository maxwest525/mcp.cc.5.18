import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Plus, Upload, Download, Search, Play, Pause, Edit3, Copy, Trash2,
  CheckCircle2, AlertTriangle, Clock, ArrowRight, FlaskConical, Eye,
  ShieldCheck, RotateCcw, ListChecks, Zap, Filter,
} from "lucide-react";
import { toast } from "sonner";

type RuleStatus = "active" | "test" | "disabled" | "pending_approval" | "failed";

type Condition = {
  id: string;
  field: string;
  operator: string;
  value: string;
};

interface Rule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  source: string;
  destination: string;
  action: string;
  conditions: Condition[];
  status: RuleStatus;
  testMode: boolean;
  requiresApproval: boolean;
  retries: number;
  fallback: string;
  lastTriggered: string;
  successRate: number;
  triggeredToday: number;
}

const TRIGGERS = [
  "lead.created", "lead.updated", "call.completed", "webhook.received",
  "compliance.alert", "sync.failed", "agent.unmapped", "vendor.risk.changed",
];
const SOURCES = ["Meta Ads", "Google Ads", "Convoso", "RingCentral", "Pulse", "Webhook Engine", "CRM API", "Zapier"];
const DESTINATIONS = ["CRM API", "Granot", "Pulse", "Automation Queue", "Email/SMS", "Review Queue", "HyperMCP Tasks"];
const ACTIONS = [
  "Create CRM Lead", "Push Lead to Granot", "Send Transcript", "Notify Manager",
  "Move to Review Queue", "Create HyperMCP Task", "Send SMS", "Trigger Webhook",
];
const FIELDS = ["lead_source", "status", "compliance_score", "webhook_failures", "agent_mapping", "vendor_risk_status", "lead_value", "call_duration"];
const OPERATORS = ["equals", "not equals", "changes to", "below", "above", "contains", "is missing", "is critical"];

function seedRules(): Rule[] {
  const base: Array<Partial<Rule> & { name: string }> = [
    {
      name: "Meta Ads → CRM Lead",
      description: "Auto-create CRM lead when a new lead arrives from Meta Ads campaigns.",
      trigger: "lead.created", source: "Meta Ads", destination: "CRM API", action: "Create CRM Lead",
      status: "active", successRate: 99.2, triggeredToday: 184,
      conditions: [{ id: "c1", field: "lead_source", operator: "equals", value: "meta_ads" }],
    },
    {
      name: "CRM Lead Sold → Granot",
      description: "Push booked deals to Granot operations system after sale completion.",
      trigger: "lead.updated", source: "CRM API", destination: "Granot", action: "Push Lead to Granot",
      status: "active", successRate: 98.7, triggeredToday: 42,
      conditions: [{ id: "c1", field: "status", operator: "changes to", value: "sold" }],
    },
    {
      name: "Call Completed → Pulse Transcript",
      description: "Send completed call recordings to Pulse for transcript and compliance scoring.",
      trigger: "call.completed", source: "RingCentral", destination: "Pulse", action: "Send Transcript",
      status: "active", successRate: 99.8, triggeredToday: 312,
      conditions: [{ id: "c1", field: "call_duration", operator: "above", value: "30" }],
    },
    {
      name: "Critical Compliance → Notify Manager",
      description: "Alert manager via SMS and email when compliance flags reach critical level.",
      trigger: "compliance.alert", source: "Pulse", destination: "Email/SMS", action: "Notify Manager",
      status: "active", successRate: 100, triggeredToday: 7,
      conditions: [{ id: "c1", field: "compliance_score", operator: "below", value: "60" }],
    },
    {
      name: "Webhook Failed 3x → Review Queue",
      description: "Move webhooks that fail more than three times to manual review.",
      trigger: "webhook.received", source: "Webhook Engine", destination: "Review Queue", action: "Move to Review Queue",
      status: "active", successRate: 96.4, triggeredToday: 11,
      conditions: [{ id: "c1", field: "webhook_failures", operator: "above", value: "3" }],
    },
    {
      name: "Missing Agent Mapping → HyperMCP Task",
      description: "Create a task for ops when an inbound event has no matching agent.",
      trigger: "agent.unmapped", source: "CRM API", destination: "HyperMCP Tasks", action: "Create HyperMCP Task",
      status: "test", successRate: 92.1, triggeredToday: 3,
      conditions: [{ id: "c1", field: "agent_mapping", operator: "is missing", value: "" }],
    },
    {
      name: "Vendor Risk Critical → Pause Routing",
      description: "Temporarily disable a vendor source when its risk status hits critical.",
      trigger: "vendor.risk.changed", source: "Pulse", destination: "Automation Queue", action: "Trigger Webhook",
      status: "pending_approval", successRate: 88.0, triggeredToday: 1,
      conditions: [{ id: "c1", field: "vendor_risk_status", operator: "is critical", value: "" }],
    },
    {
      name: "Sync Failed → Auto Retry",
      description: "Retry failed sync jobs with exponential backoff before failing over.",
      trigger: "sync.failed", source: "Zapier", destination: "Automation Queue", action: "Trigger Webhook",
      status: "disabled", successRate: 81.3, triggeredToday: 0,
      conditions: [{ id: "c1", field: "webhook_failures", operator: "below", value: "5" }],
    },
    {
      name: "Google Ads Lead → CRM (High Intent)",
      description: "Fast-track high-value Google Ads leads directly into the dialer queue.",
      trigger: "lead.created", source: "Google Ads", destination: "CRM API", action: "Create CRM Lead",
      status: "failed", successRate: 74.5, triggeredToday: 22,
      conditions: [{ id: "c1", field: "lead_value", operator: "above", value: "5000" }],
    },
  ];
  return base.map((r, i) => ({
    id: `rule_${i + 1}`,
    name: r.name,
    description: r.description ?? "",
    trigger: r.trigger ?? "lead.created",
    source: r.source ?? "Webhook Engine",
    destination: r.destination ?? "CRM API",
    action: r.action ?? "Create CRM Lead",
    conditions: r.conditions ?? [],
    status: r.status ?? "active",
    testMode: r.status === "test",
    requiresApproval: r.status === "pending_approval",
    retries: 3,
    fallback: "Move to Review Queue",
    lastTriggered: i === 7 ? "—" : `${(i + 1) * 4}m ago`,
    successRate: r.successRate ?? 95,
    triggeredToday: r.triggeredToday ?? 0,
  }));
}

const STATUS_META: Record<RuleStatus, { label: string; cls: string; icon: any }> = {
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  test: { label: "Test Mode", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: FlaskConical },
  disabled: { label: "Disabled", cls: "bg-slate-100 text-slate-600 border-slate-200", icon: Pause },
  pending_approval: { label: "Pending Approval", cls: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  failed: { label: "Failed", cls: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertTriangle },
};

export default function AdminHyperMCPWorkflowRules() {
  const [rules, setRules] = useState<Rule[]>(() => seedRules());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);

  const kpis = useMemo(() => ({
    active: rules.filter(r => r.status === "active").length,
    test: rules.filter(r => r.status === "test").length,
    failed: rules.filter(r => r.status === "failed").length,
    pending: rules.filter(r => r.status === "pending_approval").length,
    triggeredToday: rules.reduce((sum, r) => sum + r.triggeredToday, 0),
    disabled: rules.filter(r => r.status === "disabled").length,
  }), [rules]);

  const filtered = useMemo(() => rules.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.trigger.includes(search.toLowerCase())) return false;
    return true;
  }), [rules, search, statusFilter, sourceFilter]);

  const openNew = () => {
    setEditing({
      id: `rule_${Date.now()}`,
      name: "",
      description: "",
      trigger: TRIGGERS[0],
      source: SOURCES[0],
      destination: DESTINATIONS[0],
      action: ACTIONS[0],
      conditions: [{ id: "c1", field: FIELDS[0], operator: OPERATORS[0], value: "" }],
      status: "test",
      testMode: true,
      requiresApproval: false,
      retries: 3,
      fallback: "Move to Review Queue",
      lastTriggered: "—",
      successRate: 0,
      triggeredToday: 0,
    });
    setOpen(true);
  };

  const openEdit = (r: Rule) => { setEditing({ ...r }); setOpen(true); };

  const saveRule = () => {
    if (!editing) return;
    setRules(prev => {
      const exists = prev.some(p => p.id === editing.id);
      return exists ? prev.map(p => p.id === editing.id ? editing : p) : [editing, ...prev];
    });
    toast.success(`Rule "${editing.name || "Untitled"}" saved`);
    setOpen(false);
  };

  const toggleStatus = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, status: r.status === "active" ? "disabled" : "active" } : r));
  };

  const duplicateRule = (r: Rule) => {
    setRules(prev => [{ ...r, id: `rule_${Date.now()}`, name: `${r.name} (copy)`, status: "test", testMode: true }, ...prev]);
    toast.success("Rule duplicated to test mode");
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success("Rule deleted");
  };

  const runTest = () => toast.success("Test event executed — payload validated");

  return (
    <HyperMCPShell>
      <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Workflow Rules</h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure automation rules, event triggers, routing logic, and approval controls.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => toast.success("Rules imported")}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />Import Rules
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => toast.success("Rules exported")}>
              <Download className="w-3.5 h-3.5 mr-1.5" />Export Rules
            </Button>
            <Button size="sm" className="h-8 text-xs bg-slate-900 hover:bg-slate-800" onClick={openNew}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />New Rule
            </Button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { label: "Active Rules", value: kpis.active, icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Test Mode", value: kpis.test, icon: FlaskConical, color: "text-amber-600" },
            { label: "Failed Executions", value: kpis.failed, icon: AlertTriangle, color: "text-rose-600" },
            { label: "Pending Approvals", value: kpis.pending, icon: Clock, color: "text-blue-600" },
            { label: "Triggered Today", value: kpis.triggeredToday, icon: Zap, color: "text-slate-700" },
            { label: "Disabled Rules", value: kpis.disabled, icon: Pause, color: "text-slate-500" },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <Card key={k.label} className="border-slate-200 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">{k.label}</span>
                    <Icon className={`w-3.5 h-3.5 ${k.color}`} />
                  </div>
                  <div className="text-xl font-semibold text-slate-900 mt-1.5">{k.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
          {/* Rules table */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              {/* Filter bar */}
              <div className="flex items-center gap-2 p-3 border-b border-slate-200 bg-slate-50/60">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search rules or triggers…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 text-xs pl-8 bg-white"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[140px] text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="test">Test mode</SelectItem>
                    <SelectItem value="pending_approval">Pending approval</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="h-8 w-[140px] text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="ml-auto text-[11px] text-slate-500">
                  {filtered.length} of {rules.length} rules
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50/60 text-slate-600 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Rule</th>
                      <th className="text-left font-medium px-3 py-2">Trigger</th>
                      <th className="text-left font-medium px-3 py-2">Flow</th>
                      <th className="text-left font-medium px-3 py-2">Conditions</th>
                      <th className="text-left font-medium px-3 py-2">Status</th>
                      <th className="text-left font-medium px-3 py-2">Last Triggered</th>
                      <th className="text-left font-medium px-3 py-2">Success</th>
                      <th className="text-right font-medium px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filtered.map((r) => {
                      const meta = STATUS_META[r.status];
                      const SIcon = meta.icon;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-slate-900">{r.name}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 max-w-[260px]">{r.description}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <code className="text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">{r.trigger}</code>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                              <span className="font-medium">{r.source}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="font-medium">{r.destination}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{r.action}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-[11px] text-slate-700">
                              {r.conditions.length > 0 ? (
                                <span>
                                  <code className="bg-slate-50 px-1 py-0.5 rounded">{r.conditions[0].field}</code>
                                  <span className="text-slate-500"> {r.conditions[0].operator} </span>
                                  {r.conditions[0].value && <code className="bg-slate-50 px-1 py-0.5 rounded">{r.conditions[0].value}</code>}
                                </span>
                              ) : (
                                <span className="text-slate-400">No conditions</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge variant="outline" className={`${meta.cls} border text-[10px] font-medium gap-1`}>
                              <SIcon className="w-3 h-3" />{meta.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">{r.lastTriggered}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1 w-14 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${r.successRate >= 95 ? "bg-emerald-500" : r.successRate >= 85 ? "bg-amber-500" : "bg-rose-500"}`}
                                  style={{ width: `${r.successRate}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-slate-700 font-medium">{r.successRate}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleStatus(r.id)} title={r.status === "active" ? "Disable" : "Enable"}>
                                {r.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(r)} title="Edit">
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => duplicateRule(r)} title="Duplicate">
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => deleteRule(r.id)} title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-xs">No rules match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Side: Testing Panel + Approvals */}
          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Testing Panel</h3>
                </div>
                <p className="text-[11px] text-slate-500">Run a test event against any rule to preview matching, payload, and destination action.</p>
                <div className="space-y-2">
                  <Label className="text-[11px] text-slate-600">Rule</Label>
                  <Select defaultValue={rules[0]?.id}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {rules.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] text-slate-600">Sample payload</Label>
                  <Textarea
                    rows={5}
                    defaultValue={`{\n  "lead_source": "meta_ads",\n  "lead_value": 8400,\n  "agent": "rep_01"\n}`}
                    className="text-[11px] font-mono bg-slate-50"
                  />
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="w-3 h-3" />Conditions matched (1/1)</div>
                  <div className="flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="w-3 h-3" />Payload schema valid</div>
                  <div className="flex items-center gap-1.5 text-slate-600"><ArrowRight className="w-3 h-3" />Destination: CRM API → Create CRM Lead</div>
                </div>
                <Button size="sm" className="w-full h-8 text-xs bg-slate-900 hover:bg-slate-800" onClick={runTest}>
                  <Play className="w-3.5 h-3.5 mr-1.5" />Run Test Event
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Pending Approvals</h3>
                </div>
                {rules.filter(r => r.status === "pending_approval").length === 0 ? (
                  <p className="text-[11px] text-slate-500">No rules awaiting approval.</p>
                ) : rules.filter(r => r.status === "pending_approval").map(r => (
                  <div key={r.id} className="rounded-md border border-slate-200 p-2.5 text-[11px] space-y-1.5">
                    <div className="font-medium text-slate-900 text-xs">{r.name}</div>
                    <div className="text-slate-500 line-clamp-2">{r.description}</div>
                    <div className="flex gap-1.5 pt-1">
                      <Button size="sm" className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                        setRules(p => p.map(x => x.id === r.id ? { ...x, status: "active" } : x));
                        toast.success("Rule approved");
                      }}>Approve</Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => {
                        setRules(p => p.map(x => x.id === r.id ? { ...x, status: "disabled" } : x));
                      }}>Reject</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-semibold text-slate-900">Rule Activity</h3>
                </div>
                {[
                  { txt: "Meta Ads → CRM Lead executed 184× today", color: "text-emerald-600" },
                  { txt: "Webhook 3x failures triggered review queue", color: "text-amber-600" },
                  { txt: "Google Ads (high intent) failed 3 executions", color: "text-rose-600" },
                  { txt: "Critical Compliance fired 7 manager alerts", color: "text-blue-600" },
                ].map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full ${a.color.replace("text-", "bg-")}`} />
                    <span className="text-slate-700">{a.txt}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Rule Builder Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">{editing && rules.some(r => r.id === editing.id) ? "Edit Rule" : "New Workflow Rule"}</SheetTitle>
            <SheetDescription className="text-xs">Define trigger, conditions, destination, and fail-safes.</SheetDescription>
          </SheetHeader>

          {editing && (
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Rule name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="h-9 text-sm" placeholder="e.g. Meta Ads → CRM Lead" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Trigger event</Label>
                  <Select value={editing.trigger} onValueChange={(v) => setEditing({ ...editing, trigger: v })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{TRIGGERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Source system</Label>
                  <Select value={editing.source} onValueChange={(v) => setEditing({ ...editing, source: v })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Destination system</Label>
                  <Select value={editing.destination} onValueChange={(v) => setEditing({ ...editing, destination: v })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{DESTINATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Action</Label>
                  <Select value={editing.action} onValueChange={(v) => setEditing({ ...editing, action: v })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Condition builder */}
              <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Conditions</Label>
                  <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setEditing({
                    ...editing,
                    conditions: [...editing.conditions, { id: `c${Date.now()}`, field: FIELDS[0], operator: OPERATORS[0], value: "" }],
                  })}>
                    <Plus className="w-3 h-3 mr-1" />Add condition
                  </Button>
                </div>
                {editing.conditions.map((c, idx) => (
                  <div key={c.id} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-medium w-8">{idx === 0 ? "IF" : "AND"}</span>
                    <Select value={c.field} onValueChange={(v) => setEditing({
                      ...editing,
                      conditions: editing.conditions.map(x => x.id === c.id ? { ...x, field: v } : x),
                    })}>
                      <SelectTrigger className="h-8 text-[11px] flex-1 bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>{FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={c.operator} onValueChange={(v) => setEditing({
                      ...editing,
                      conditions: editing.conditions.map(x => x.id === c.id ? { ...x, operator: v } : x),
                    })}>
                      <SelectTrigger className="h-8 text-[11px] w-[110px] bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>{OPERATORS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input
                      value={c.value}
                      placeholder="value"
                      onChange={(e) => setEditing({
                        ...editing,
                        conditions: editing.conditions.map(x => x.id === c.id ? { ...x, value: e.target.value } : x),
                      })}
                      className="h-8 text-[11px] w-[100px] bg-white"
                    />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600" onClick={() => setEditing({
                      ...editing,
                      conditions: editing.conditions.filter(x => x.id !== c.id),
                    })}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Behavior */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Retry attempts</Label>
                  <Input type="number" min={0} max={10} value={editing.retries} onChange={(e) => setEditing({ ...editing, retries: parseInt(e.target.value || "0") })} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Failure fallback</Label>
                  <Select value={editing.fallback} onValueChange={(v) => setEditing({ ...editing, fallback: v })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Move to Review Queue">Move to Review Queue</SelectItem>
                      <SelectItem value="Notify Manager">Notify Manager</SelectItem>
                      <SelectItem value="Disable Rule">Disable Rule</SelectItem>
                      <SelectItem value="Silent Drop">Silent Drop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Test mode</Label>
                    <p className="text-[10px] text-slate-500">Simulate without affecting live systems.</p>
                  </div>
                  <Switch checked={editing.testMode} onCheckedChange={(v) => setEditing({ ...editing, testMode: v, status: v ? "test" : "active" })} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Requires approval</Label>
                    <p className="text-[10px] text-slate-500">Manager must approve before activation.</p>
                  </div>
                  <Switch checked={editing.requiresApproval} onCheckedChange={(v) => setEditing({ ...editing, requiresApproval: v })} />
                </div>
              </div>
            </div>
          )}

          <SheetFooter className="gap-2 border-t pt-3">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { runTest(); }}>
              <FlaskConical className="w-3.5 h-3.5 mr-1.5" />Run Test
            </Button>
            <Button size="sm" className="h-8 text-xs bg-slate-900 hover:bg-slate-800" onClick={saveRule}>Save Rule</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}
