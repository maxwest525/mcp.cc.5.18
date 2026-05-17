import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  FileJson, Search, Download, Plus, Upload, CheckCircle2, XCircle,
  AlertTriangle, Clock, ShieldAlert, ArrowUpRight, Copy, PlayCircle,
  GitBranch, Workflow as WorkflowIcon, Plug, ChevronRight, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─────────── Types ─────────── */

type SchemaType =
  | "webhook_payload" | "crm_object" | "workflow_event" | "ai_output"
  | "queue_event" | "compliance_event" | "deployment_payload" | "vendor_attribution";

type SchemaStatus = "active" | "draft" | "deprecated" | "archived";
type ValidationState = "passing" | "warning" | "failing";

interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "datetime" | "uuid";
  required: boolean;
  description: string;
  deprecated?: boolean;
}

interface SchemaVersion { version: string; ts: string; breaking: boolean; notes: string; }
interface ValidationIssue { severity: "error" | "warn"; field: string; message: string; }

interface SchemaDef {
  id: string;
  name: string;
  type: SchemaType;
  source: string;
  version: string;
  status: SchemaStatus;
  validation: ValidationState;
  lastUpdated: string;
  fields: SchemaField[];
  rules: string[];
  workflows: string[];
  integrations: string[];
  versions: SchemaVersion[];
  issues: ValidationIssue[];
  sample: string;
  transformation: string;
}

const TYPE_LABEL: Record<SchemaType, string> = {
  webhook_payload: "Webhook Payload",
  crm_object: "CRM Object",
  workflow_event: "Workflow Event",
  ai_output: "AI Output",
  queue_event: "Queue Event",
  compliance_event: "Compliance Event",
  deployment_payload: "Deployment Payload",
  vendor_attribution: "Vendor Attribution",
};

/* ─────────── Mock data ─────────── */

const SCHEMAS: SchemaDef[] = [
  {
    id: "sch_lead_inbound", name: "lead.inbound.v3", type: "webhook_payload",
    source: "MoverLeads Pro", version: "3.2.0", status: "active", validation: "passing",
    lastUpdated: "2 hr ago",
    fields: [
      { name: "lead_id", type: "uuid", required: true, description: "Vendor-assigned lead ID" },
      { name: "first_name", type: "string", required: true, description: "Customer first name" },
      { name: "last_name", type: "string", required: true, description: "Customer last name" },
      { name: "phone", type: "string", required: true, description: "E.164 phone number" },
      { name: "origin_zip", type: "string", required: true, description: "Origin ZIP" },
      { name: "destination_zip", type: "string", required: true, description: "Destination ZIP" },
      { name: "move_date", type: "datetime", required: false, description: "Requested move date" },
      { name: "campaign_id", type: "string", required: false, description: "Vendor campaign ID" },
      { name: "legacy_email", type: "string", required: false, description: "Email field", deprecated: true },
    ],
    rules: ["phone matches ^\\+1\\d{10}$", "origin_zip ≠ destination_zip", "move_date ≥ today"],
    workflows: ["Intake Router", "Lead Scoring", "Attribution Sync"],
    integrations: ["MoverLeads Pro", "CRM Leads"],
    versions: [
      { version: "3.2.0", ts: "Today", breaking: false, notes: "Added campaign_id" },
      { version: "3.1.0", ts: "Mon", breaking: false, notes: "Phone normalization rule" },
      { version: "3.0.0", ts: "Last week", breaking: true, notes: "legacy_email deprecated" },
    ],
    issues: [],
    sample: `{
  "lead_id": "8f4c2e1a-0d31-4f77-9b84-9c1e2a4f7d19",
  "first_name": "Alex",
  "last_name": "Rivera",
  "phone": "+13105551042",
  "origin_zip": "90024",
  "destination_zip": "94110",
  "move_date": "2026-06-12",
  "campaign_id": "ca_long_distance_q4"
}`,
    transformation: "→ leads.insert + dispatch:intake.queue",
  },
  {
    id: "sch_quote_event", name: "quote.created.v2", type: "workflow_event",
    source: "Pricing Engine", version: "2.1.0", status: "active", validation: "passing",
    lastUpdated: "12 min ago",
    fields: [
      { name: "quote_id", type: "uuid", required: true, description: "" },
      { name: "lead_id", type: "uuid", required: true, description: "" },
      { name: "cube_feet", type: "number", required: true, description: "Inventory cube ft" },
      { name: "price", type: "number", required: true, description: "Quoted price USD" },
      { name: "carrier_id", type: "uuid", required: false, description: "" },
    ],
    rules: ["price ≥ cube_feet * 4.00", "cube_feet > 0"],
    workflows: ["Pricing Engine", "Carrier Match"],
    integrations: ["CRM Deals", "Granot Tariff"],
    versions: [
      { version: "2.1.0", ts: "Today", breaking: false, notes: "Added carrier_id" },
      { version: "2.0.0", ts: "2 wks", breaking: true, notes: "Renamed cubic_ft → cube_feet" },
    ],
    issues: [],
    sample: `{ "quote_id": "...", "lead_id": "...", "cube_feet": 412, "price": 1980 }`,
    transformation: "→ deals.update + notify:agent",
  },
  {
    id: "sch_carrier_vetting", name: "carrier.vetting.v1", type: "compliance_event",
    source: "FMCSA", version: "1.4.0", status: "active", validation: "warning",
    lastUpdated: "44 min ago",
    fields: [
      { name: "dot_number", type: "string", required: true, description: "DOT registration" },
      { name: "mc_number", type: "string", required: false, description: "MC number" },
      { name: "safety_rating", type: "string", required: true, description: "Satisfactory/Conditional/Unsatisfactory" },
      { name: "insurance_active", type: "boolean", required: true, description: "" },
    ],
    rules: ["dot_number matches ^\\d{6,8}$", "safety_rating ∈ enum"],
    workflows: ["Carrier Vetting", "Dispatch Gate"],
    integrations: ["FMCSA Safety", "Carrier Registry"],
    versions: [
      { version: "1.4.0", ts: "Yesterday", breaking: false, notes: "Insurance flag added" },
    ],
    issues: [
      { severity: "warn", field: "mc_number", message: "60% of payloads missing optional MC number" },
    ],
    sample: `{ "dot_number": "1234567", "safety_rating": "Satisfactory", "insurance_active": true }`,
    transformation: "→ carrier.update",
  },
  {
    id: "sch_ai_estimate", name: "ai.estimate.v2", type: "ai_output",
    source: "Gemini Orchestrator", version: "2.0.1", status: "active", validation: "passing",
    lastUpdated: "8 min ago",
    fields: [
      { name: "rooms", type: "array", required: true, description: "Detected rooms" },
      { name: "total_cube_ft", type: "number", required: true, description: "" },
      { name: "confidence", type: "number", required: true, description: "0-1 score" },
    ],
    rules: ["confidence between 0 and 1", "total_cube_ft > 0"],
    workflows: ["Inventory AI", "Pricing Engine"],
    integrations: ["Lovable AI Gateway"],
    versions: [{ version: "2.0.1", ts: "Today", breaking: false, notes: "Confidence floor 0.4" }],
    issues: [],
    sample: `{ "rooms": [...], "total_cube_ft": 412, "confidence": 0.87 }`,
    transformation: "→ inventory.persist",
  },
  {
    id: "sch_queue_dispatch", name: "queue.dispatch.v1", type: "queue_event",
    source: "Workflow Engine", version: "1.2.0", status: "active", validation: "passing",
    lastUpdated: "30 min ago",
    fields: [
      { name: "job_id", type: "uuid", required: true, description: "" },
      { name: "deal_id", type: "uuid", required: true, description: "" },
      { name: "priority", type: "number", required: true, description: "1-10" },
    ],
    rules: ["priority between 1 and 10"],
    workflows: ["Carrier Dispatch"],
    integrations: ["Dispatch Engine"],
    versions: [{ version: "1.2.0", ts: "Today", breaking: false, notes: "Priority bounds" }],
    issues: [],
    sample: `{ "job_id": "...", "deal_id": "...", "priority": 5 }`,
    transformation: "→ dispatch:queue",
  },
  {
    id: "sch_legacy_lead", name: "lead.inbound.v2", type: "webhook_payload",
    source: "MoverLeads Pro", version: "2.4.0", status: "deprecated", validation: "warning",
    lastUpdated: "Last month",
    fields: [
      { name: "lead_id", type: "uuid", required: true, description: "" },
      { name: "email", type: "string", required: true, description: "Use phone instead", deprecated: true },
    ],
    rules: [],
    workflows: ["Legacy Intake"],
    integrations: ["MoverLeads Pro"],
    versions: [{ version: "2.4.0", ts: "Last month", breaking: false, notes: "Deprecated in favor of v3" }],
    issues: [
      { severity: "warn", field: "email", message: "Field deprecated; migrate consumers to v3" },
    ],
    sample: `{ "lead_id": "...", "email": "alex@example.com" }`,
    transformation: "→ legacy bridge",
  },
  {
    id: "sch_vendor_attr", name: "vendor.attribution.v1", type: "vendor_attribution",
    source: "AdSpark Media", version: "1.0.3", status: "active", validation: "failing",
    lastUpdated: "1 hr ago",
    fields: [
      { name: "vendor_id", type: "string", required: true, description: "" },
      { name: "utm_source", type: "string", required: true, description: "" },
      { name: "utm_campaign", type: "string", required: true, description: "" },
      { name: "sub_campaign", type: "string", required: false, description: "" },
    ],
    rules: ["vendor_id non-empty"],
    workflows: ["Attribution Sync"],
    integrations: ["AdSpark Media", "GA4"],
    versions: [{ version: "1.0.3", ts: "Today", breaking: false, notes: "Sub-campaign added" }],
    issues: [
      { severity: "error", field: "utm_campaign", message: "12% of payloads missing required field" },
      { severity: "warn", field: "sub_campaign", message: "Mapping gap on 39% of payloads" },
    ],
    sample: `{ "vendor_id": "v_004", "utm_source": "google", "utm_campaign": "ppc_q4" }`,
    transformation: "→ leads.attribution",
  },
  {
    id: "sch_deploy_payload", name: "deployment.published.v1", type: "deployment_payload",
    source: "Deployment Center", version: "1.1.0", status: "active", validation: "passing",
    lastUpdated: "3 hr ago",
    fields: [
      { name: "deployment_id", type: "uuid", required: true, description: "" },
      { name: "env", type: "string", required: true, description: "dev/staging/production" },
      { name: "version", type: "string", required: true, description: "semver" },
    ],
    rules: ["env ∈ {development, staging, production}"],
    workflows: ["Release Notify"],
    integrations: ["Deployment Center"],
    versions: [{ version: "1.1.0", ts: "Today", breaking: false, notes: "Added rollback flag" }],
    issues: [],
    sample: `{ "deployment_id": "...", "env": "production", "version": "2.4.1" }`,
    transformation: "→ audit.append + notify:slack",
  },
];

/* ─────────── Helpers ─────────── */

const statusBadge = (s: SchemaStatus) => {
  const map: Record<SchemaStatus, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    draft: "bg-blue-50 text-blue-700 border-blue-200",
    deprecated: "bg-amber-50 text-amber-700 border-amber-200",
    archived: "bg-slate-50 text-slate-500 border-slate-200",
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border capitalize", map[s])}>{s}</span>;
};

const validationBadge = (v: ValidationState) => {
  const map: Record<ValidationState, { cls: string; label: string }> = {
    passing: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Passing" },
    warning: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Warning" },
    failing: { cls: "bg-red-50 text-red-700 border-red-200", label: "Failing" },
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border", map[v].cls)}>{map[v].label}</span>;
};

const typeColor: Record<SchemaField["type"], string> = {
  string: "text-blue-700",
  number: "text-emerald-700",
  boolean: "text-violet-700",
  object: "text-amber-700",
  array: "text-amber-700",
  datetime: "text-cyan-700",
  uuid: "text-slate-700",
};

/* ─────────── Page ─────────── */

export default function AdminHyperMCPSchemaRegistry() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<SchemaType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<SchemaStatus | "all">("all");
  const [selected, setSelected] = useState<SchemaDef | null>(null);
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; messages: string[] } | null>(null);

  const filtered = useMemo(() =>
    SCHEMAS.filter(s => {
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (query && !s.name.toLowerCase().includes(query.toLowerCase()) &&
          !s.source.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    }), [query, typeFilter, statusFilter]);

  const kpis = {
    active: SCHEMAS.filter(s => s.status === "active").length,
    versioned: SCHEMAS.reduce((acc, s) => acc + s.versions.length, 0),
    failures: SCHEMAS.filter(s => s.validation === "failing").length,
    deprecated: SCHEMAS.filter(s => s.status === "deprecated").length,
    deps: SCHEMAS.reduce((acc, s) => acc + s.workflows.length + s.integrations.length, 0),
    violations: SCHEMAS.reduce((acc, s) => acc + s.issues.filter(i => i.severity === "error").length, 0),
  };

  const validation = {
    missingRequired: SCHEMAS.filter(s => s.issues.some(i => i.severity === "error" && i.message.includes("missing required"))),
    invalidTypes: SCHEMAS.filter(s => s.validation === "failing"),
    mappingConflicts: SCHEMAS.filter(s => s.issues.some(i => i.message.toLowerCase().includes("mapping"))),
    deprecatedFields: SCHEMAS.filter(s => s.fields.some(f => f.deprecated)),
    payloadMismatches: SCHEMAS.filter(s => s.validation === "warning"),
    contractFails: SCHEMAS.filter(s => s.issues.some(i => i.severity === "error")),
  };

  const runTest = () => {
    if (!selected) return;
    let parsed: any;
    try { parsed = JSON.parse(testInput || selected.sample); }
    catch { setTestResult({ ok: false, messages: ["Invalid JSON"] }); return; }
    const messages: string[] = [];
    selected.fields.forEach(f => {
      if (f.required && !(f.name in parsed)) messages.push(`Missing required field: ${f.name}`);
      if (f.deprecated && f.name in parsed) messages.push(`Using deprecated field: ${f.name}`);
    });
    if (messages.length === 0) messages.push("All required fields present", "Type checks passed", "Transformation: " + selected.transformation);
    setTestResult({ ok: !messages.some(m => m.startsWith("Missing")), messages });
  };

  return (
    <HyperMCPShell>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <FileJson className="w-6 h-6 text-slate-700" />
              Schema Registry
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage payload schemas, event contracts, field definitions, and validation standards.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("Contracts validated")}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Validate Contracts
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Schema exported")}>
              <Download className="w-4 h-4 mr-1.5" /> Export
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("Import dialog")}>
              <Upload className="w-4 h-4 mr-1.5" /> Import
            </Button>
            <Button size="sm" onClick={() => toast.success("New schema draft created")}>
              <Plus className="w-4 h-4 mr-1.5" /> New Schema
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Active Schemas", value: kpis.active, icon: CheckCircle2, tone: "text-emerald-600" },
            { label: "Versioned Contracts", value: kpis.versioned, icon: GitBranch, tone: "text-slate-700" },
            { label: "Validation Failures", value: kpis.failures, icon: XCircle, tone: "text-red-600" },
            { label: "Deprecated", value: kpis.deprecated, icon: Clock, tone: "text-amber-600" },
            { label: "Mapping Deps", value: kpis.deps, icon: WorkflowIcon, tone: "text-slate-700" },
            { label: "Contract Violations", value: kpis.violations, icon: ShieldAlert, tone: "text-red-600" },
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

        {/* Filters + Table */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-3 border-b border-slate-200 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search schemas..." className="pl-8 h-9 text-sm" />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as SchemaType | "all")}
              className="h-9 px-2 text-sm border border-slate-200 rounded bg-white text-slate-700">
              <option value="all">All types</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as SchemaStatus | "all")}
              className="h-9 px-2 text-sm border border-slate-200 rounded bg-white text-slate-700">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="deprecated">Deprecated</option>
              <option value="archived">Archived</option>
            </select>
            <span className="text-xs text-slate-500 ml-auto">{filtered.length} of {SCHEMAS.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Schema Name</th>
                  <th className="px-3 py-2 font-medium">Event Type</th>
                  <th className="px-3 py-2 font-medium">Source System</th>
                  <th className="px-3 py-2 font-medium">Version</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Validation</th>
                  <th className="px-3 py-2 font-medium">Last Updated</th>
                  <th className="px-3 py-2 font-medium">Deps</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(s)}>
                    <td className="px-3 py-2">
                      <p className="font-mono text-xs text-slate-900 font-medium">{s.name}</p>
                      <p className="text-[11px] text-slate-500">{s.fields.length} fields</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{TYPE_LABEL[s.type]}</td>
                    <td className="px-3 py-2 text-slate-700">{s.source}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">v{s.version}</td>
                    <td className="px-3 py-2">{statusBadge(s.status)}</td>
                    <td className="px-3 py-2">{validationBadge(s.validation)}</td>
                    <td className="px-3 py-2 text-slate-600">{s.lastUpdated}</td>
                    <td className="px-3 py-2 text-slate-700">{s.workflows.length + s.integrations.length}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={ev => { ev.stopPropagation(); setSelected(s); }}>
                        View <ArrowUpRight className="w-3 h-3 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Validation + Dependency Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <WorkflowIcon className="w-4 h-4 text-slate-700" /> Dependency Visualization
              </p>
              <p className="text-[11px] text-slate-500">Schemas → Mappings → Workflows → Integrations</p>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
                {[
                  { label: "Schemas", items: SCHEMAS.slice(0, 4).map(s => s.name) },
                  { label: "Mappings", items: ["lead.map", "quote.map", "vendor.map", "carrier.map"] },
                  { label: "Workflows", items: ["Intake Router", "Pricing Engine", "Carrier Dispatch", "Attribution Sync"] },
                  { label: "Integrations", items: ["MoverLeads Pro", "Granot Tariff", "FMCSA", "AdSpark Media"] },
                ].map((col, i, arr) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="border border-slate-200 rounded-lg bg-white min-w-[180px]">
                      <p className="text-[10px] uppercase text-slate-500 font-medium px-3 py-1.5 border-b border-slate-100">{col.label}</p>
                      <ul className="p-2 space-y-1">
                        {col.items.map((it, j) => (
                          <li key={j} className="text-xs text-slate-700 font-mono truncate">{it}</li>
                        ))}
                      </ul>
                    </div>
                    {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Validation Panel
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                { title: "Missing Required Fields", items: validation.missingRequired },
                { title: "Invalid Types", items: validation.invalidTypes },
                { title: "Mapping Conflicts", items: validation.mappingConflicts },
                { title: "Deprecated Fields", items: validation.deprecatedFields },
                { title: "Payload Mismatches", items: validation.payloadMismatches },
                { title: "Failed Contract Checks", items: validation.contractFails },
              ].map((g, i) => (
                <div key={i} className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">{g.title}</p>
                    <span className="text-[11px] text-slate-500">{g.items.length}</span>
                  </div>
                  {g.items.length === 0
                    ? <p className="text-xs text-slate-400">None</p>
                    : (
                      <ul className="space-y-0.5">
                        {g.items.slice(0, 3).map(s => (
                          <li key={s.id}>
                            <button onClick={() => setSelected(s)} className="text-xs text-slate-700 hover:text-slate-900 hover:underline font-mono">
                              {s.name}
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

      {/* Schema Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setTestInput(""); setTestResult(null); } }}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-slate-700" />
                  <span className="font-mono">{selected.name}</span>
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 flex-wrap">
                  {TYPE_LABEL[selected.type]} · {selected.source} · v{selected.version}
                  {statusBadge(selected.status)} {validationBadge(selected.validation)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4 text-sm">
                {/* Field Definitions */}
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">Field Definitions</p>
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-left text-[10px] uppercase text-slate-500">
                          <th className="px-2 py-1.5 font-medium">Field</th>
                          <th className="px-2 py-1.5 font-medium">Type</th>
                          <th className="px-2 py-1.5 font-medium">Required</th>
                          <th className="px-2 py-1.5 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.fields.map((f, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="px-2 py-1.5 font-mono text-slate-800">
                              {f.name}
                              {f.deprecated && <span className="ml-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded">deprecated</span>}
                            </td>
                            <td className={cn("px-2 py-1.5 font-mono", typeColor[f.type])}>{f.type}</td>
                            <td className="px-2 py-1.5 text-slate-600">{f.required ? "yes" : "—"}</td>
                            <td className="px-2 py-1.5 text-slate-600">{f.description || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* JSON Preview */}
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">JSON Structure Preview</p>
                  <pre className="text-[11px] bg-slate-900 text-emerald-300 p-3 rounded font-mono overflow-x-auto leading-relaxed">{selected.sample}</pre>
                </div>

                {/* Validation Rules */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">Validation Rules</p>
                    <div className="border border-slate-200 rounded p-2 space-y-1">
                      {selected.rules.length === 0
                        ? <p className="text-xs text-slate-400">None</p>
                        : selected.rules.map((r, i) => (
                            <p key={i} className="text-[11px] font-mono text-slate-700">• {r}</p>
                          ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">Transformation</p>
                    <div className="border border-slate-200 rounded p-2">
                      <p className="text-[11px] font-mono text-slate-700">{selected.transformation}</p>
                    </div>
                  </div>
                </div>

                {/* Workflows + Integrations */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">Related Workflows</p>
                    <div className="border border-slate-200 rounded p-2">
                      {selected.workflows.map((w, i) => (
                        <span key={i} className="inline-block text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded mr-1 mb-1">{w}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">Related Integrations</p>
                    <div className="border border-slate-200 rounded p-2">
                      {selected.integrations.map((c, i) => (
                        <span key={i} className="inline-block text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded mr-1 mb-1">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {selected.issues.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">Active Issues</p>
                    <ul className="space-y-1">
                      {selected.issues.map((i, idx) => (
                        <li key={idx} className={cn(
                          "text-xs border rounded px-2 py-1",
                          i.severity === "error" ? "text-red-700 bg-red-50 border-red-200" : "text-amber-800 bg-amber-50 border-amber-200"
                        )}>
                          <span className="font-mono">{i.field}</span> — {i.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Version History */}
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                    <GitBranch className="w-3 h-3" /> Version History
                  </p>
                  <div className="border border-slate-200 rounded divide-y divide-slate-100">
                    {selected.versions.map((v, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-1.5 text-xs">
                        <span className="font-mono text-slate-800 w-16 shrink-0">v{v.version}</span>
                        <span className="text-slate-500 w-20 shrink-0">{v.ts}</span>
                        {v.breaking && <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1 rounded">BREAKING</span>}
                        <span className="text-slate-700 flex-1">{v.notes}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payload Testing */}
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                    <PlayCircle className="w-3 h-3" /> Payload Testing
                  </p>
                  <textarea
                    value={testInput}
                    onChange={e => setTestInput(e.target.value)}
                    placeholder={selected.sample}
                    className="w-full h-28 text-[11px] font-mono border border-slate-200 rounded p-2 bg-white focus:outline-none focus:border-slate-400"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={runTest}>
                      <PlayCircle className="w-3 h-3 mr-1" /> Validate Payload
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setTestInput(selected.sample); setTestResult(null); }}>
                      Use Sample
                    </Button>
                  </div>
                  {testResult && (
                    <div className={cn(
                      "mt-2 border rounded p-2 text-xs space-y-1",
                      testResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
                    )}>
                      {testResult.messages.map((m, i) => <p key={i}>• {m}</p>)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                  <Button size="sm" variant="outline" onClick={() => toast.success("Validated")}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Validate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Schema published")}>
                    Publish
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Cloned to new version")}>
                    <Copy className="w-3 h-3 mr-1" /> Clone Version
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Marked deprecated")}>
                    <Clock className="w-3 h-3 mr-1" /> Deprecate
                  </Button>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => toast.info("Audit logs opened")}>
                    <FileText className="w-3 h-3 mr-1" /> Audit
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
