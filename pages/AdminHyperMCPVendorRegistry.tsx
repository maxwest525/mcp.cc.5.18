import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import OperationalContext from "@/components/hypermcp/OperationalContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Building2, Search, Download, Plus, Upload, AlertTriangle, ShieldAlert,
  Plug, Activity, Phone, Database, Megaphone, Workflow as WorkflowIcon,
  PhoneCall, FileText, ArrowUpRight, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─────────── Types ─────────── */

type VendorType =
  | "lead_vendor" | "marketing_source" | "dialer_source" | "api_partner"
  | "crm_source" | "call_vendor" | "data_provider" | "automation_partner";

type VendorStatus = "active" | "paused" | "disconnected" | "pending_review";
type RiskLevel = "none" | "low" | "medium" | "high";

interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  connectedSystem: string;
  status: VendorStatus;
  owner: string;
  risk: RiskLevel;
  lastActivity: string;
  workflows: string[];
  campaigns: string[];
  integrations: { name: string; status: "ok" | "warn" | "fail" }[];
  webhookStatus: "ok" | "warn" | "fail";
  leadVolume30d: number;
  callVolume30d: number;
  complianceFlags: string[];
  recentEvents: { ts: string; text: string; level: "info" | "warn" | "error" }[];
  notes: string;
  mappingGaps: string[];
}

/* ─────────── Mock data ─────────── */

const TYPE_LABEL: Record<VendorType, string> = {
  lead_vendor: "Lead Vendor",
  marketing_source: "Marketing Source",
  dialer_source: "Dialer Source",
  api_partner: "API Partner",
  crm_source: "CRM Source",
  call_vendor: "Call Vendor",
  data_provider: "Data Provider",
  automation_partner: "Automation Partner",
};

const TYPE_ICON: Record<VendorType, React.ComponentType<{ className?: string }>> = {
  lead_vendor: Megaphone,
  marketing_source: Megaphone,
  dialer_source: PhoneCall,
  api_partner: Plug,
  crm_source: Database,
  call_vendor: Phone,
  data_provider: Database,
  automation_partner: WorkflowIcon,
};

const VENDORS: Vendor[] = [
  {
    id: "v_001", name: "MoverLeads Pro", type: "lead_vendor", connectedSystem: "Webhook Engine",
    status: "active", owner: "Sarah Chen", risk: "low",
    lastActivity: "2 min ago", workflows: ["Intake Router", "Lead Scoring"],
    campaigns: ["Long-Distance Q4", "Local Moves"],
    integrations: [{ name: "Inbound Webhook", status: "ok" }, { name: "API Sync", status: "ok" }],
    webhookStatus: "ok", leadVolume30d: 1842, callVolume30d: 0,
    complianceFlags: [],
    recentEvents: [
      { ts: "10:42", text: "Lead batch received (47 leads)", level: "info" },
      { ts: "10:18", text: "Webhook signature verified", level: "info" },
    ],
    notes: "Top-tier lead vendor. Low return rate.", mappingGaps: [],
  },
  {
    id: "v_002", name: "DialerOne", type: "dialer_source", connectedSystem: "Twilio Bridge",
    status: "active", owner: "Marcus Webb", risk: "medium",
    lastActivity: "8 min ago", workflows: ["Call Routing", "Recording Capture"],
    campaigns: ["Outbound Q4"],
    integrations: [{ name: "SIP Trunk", status: "ok" }, { name: "Recording API", status: "warn" }],
    webhookStatus: "warn", leadVolume30d: 0, callVolume30d: 4218,
    complianceFlags: ["TCPA review pending"],
    recentEvents: [
      { ts: "10:30", text: "Recording upload latency elevated", level: "warn" },
    ],
    notes: "Monitor recording API.", mappingGaps: ["sub_campaign"],
  },
  {
    id: "v_003", name: "FMCSA Safety", type: "api_partner", connectedSystem: "Carrier Lookup",
    status: "active", owner: "System", risk: "none",
    lastActivity: "Just now", workflows: ["Carrier Vetting"],
    campaigns: [],
    integrations: [{ name: "Public API", status: "ok" }],
    webhookStatus: "ok", leadVolume30d: 0, callVolume30d: 0,
    complianceFlags: [],
    recentEvents: [{ ts: "10:44", text: "DOT lookup #4218", level: "info" }],
    notes: "Regulatory data provider.", mappingGaps: [],
  },
  {
    id: "v_004", name: "AdSpark Media", type: "marketing_source", connectedSystem: "Landing Pages",
    status: "active", owner: "Jenna Liu", risk: "low",
    lastActivity: "14 min ago", workflows: ["Attribution Sync"],
    campaigns: ["Google PPC", "Meta Retargeting"],
    integrations: [{ name: "UTM Capture", status: "ok" }, { name: "GA4 Sync", status: "ok" }],
    webhookStatus: "ok", leadVolume30d: 942, callVolume30d: 0,
    complianceFlags: [],
    recentEvents: [{ ts: "10:31", text: "Campaign param updated", level: "info" }],
    notes: "", mappingGaps: [],
  },
  {
    id: "v_005", name: "QuoteHub Network", type: "lead_vendor", connectedSystem: "Webhook Engine",
    status: "pending_review", owner: "Sarah Chen", risk: "high",
    lastActivity: "2 hr ago", workflows: ["Intake Router"],
    campaigns: [],
    integrations: [{ name: "Inbound Webhook", status: "fail" }],
    webhookStatus: "fail", leadVolume30d: 318, callVolume30d: 0,
    complianceFlags: ["Duplicate-rate anomaly", "Source verification failed"],
    recentEvents: [
      { ts: "08:42", text: "Webhook signature mismatch", level: "error" },
      { ts: "08:40", text: "Duplicate rate exceeded 38%", level: "warn" },
    ],
    notes: "Quality declining. Review before reactivation.", mappingGaps: ["vendor_id", "tracking_number"],
  },
  {
    id: "v_006", name: "ClickSend SMS", type: "api_partner", connectedSystem: "Messaging",
    status: "active", owner: "System", risk: "none",
    lastActivity: "1 min ago", workflows: ["Customer SMS", "Agent Alerts"],
    campaigns: [],
    integrations: [{ name: "REST API", status: "ok" }],
    webhookStatus: "ok", leadVolume30d: 0, callVolume30d: 0,
    complianceFlags: [],
    recentEvents: [{ ts: "10:43", text: "Outbound SMS delivered", level: "info" }],
    notes: "", mappingGaps: [],
  },
  {
    id: "v_007", name: "Resend Email", type: "api_partner", connectedSystem: "Notify Domain",
    status: "active", owner: "System", risk: "low",
    lastActivity: "3 min ago", workflows: ["Transactional Email"],
    campaigns: [],
    integrations: [{ name: "REST API", status: "ok" }, { name: "Domain DKIM", status: "ok" }],
    webhookStatus: "ok", leadVolume30d: 0, callVolume30d: 0,
    complianceFlags: [],
    recentEvents: [{ ts: "10:41", text: "Bounce rate within threshold", level: "info" }],
    notes: "", mappingGaps: [],
  },
  {
    id: "v_008", name: "LegacyCRM Bridge", type: "crm_source", connectedSystem: "Sync Jobs",
    status: "disconnected", owner: "Marcus Webb", risk: "medium",
    lastActivity: "3 d ago", workflows: [],
    campaigns: [],
    integrations: [{ name: "REST Sync", status: "fail" }],
    webhookStatus: "fail", leadVolume30d: 0, callVolume30d: 0,
    complianceFlags: ["Disconnected > 72h"],
    recentEvents: [{ ts: "Mon", text: "Auth token expired", level: "error" }],
    notes: "Awaiting credential rotation.", mappingGaps: ["lead_source", "campaign"],
  },
  {
    id: "v_009", name: "RouteOne Automation", type: "automation_partner", connectedSystem: "Workflow Engine",
    status: "active", owner: "Jenna Liu", risk: "low",
    lastActivity: "5 min ago", workflows: ["Dispatch Trigger", "Carrier Match"],
    campaigns: [],
    integrations: [{ name: "Webhook Out", status: "ok" }],
    webhookStatus: "ok", leadVolume30d: 0, callVolume30d: 0,
    complianceFlags: [],
    recentEvents: [{ ts: "10:39", text: "Trigger fired: dispatch.ready", level: "info" }],
    notes: "", mappingGaps: [],
  },
  {
    id: "v_010", name: "DataEnrich Co", type: "data_provider", connectedSystem: "Lead Enrichment",
    status: "paused", owner: "Sarah Chen", risk: "low",
    lastActivity: "1 d ago", workflows: ["Enrich Pipeline"],
    campaigns: [],
    integrations: [{ name: "REST API", status: "warn" }],
    webhookStatus: "ok", leadVolume30d: 0, callVolume30d: 0,
    complianceFlags: [],
    recentEvents: [{ ts: "Yesterday", text: "Paused for budget review", level: "info" }],
    notes: "Pause until Q1 budget approved.", mappingGaps: [],
  },
];

const SOURCE_MAPPING = [
  { crmField: "lead_source", vendorAttr: "source_name", coverage: "92%" },
  { crmField: "campaign", vendorAttr: "campaign_id", coverage: "88%" },
  { crmField: "sub_campaign", vendorAttr: "sub_id", coverage: "61%" },
  { crmField: "vendor_id", vendorAttr: "vendor_uid", coverage: "100%" },
  { crmField: "call_source", vendorAttr: "tracking_did", coverage: "78%" },
  { crmField: "tracking_number", vendorAttr: "did", coverage: "78%" },
  { crmField: "utm_source", vendorAttr: "utm_source", coverage: "95%" },
  { crmField: "utm_medium", vendorAttr: "utm_medium", coverage: "95%" },
  { crmField: "utm_campaign", vendorAttr: "utm_campaign", coverage: "94%" },
];

/* ─────────── Helpers ─────────── */

const statusBadge = (s: VendorStatus) => {
  const map: Record<VendorStatus, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paused: "bg-slate-50 text-slate-600 border-slate-200",
    disconnected: "bg-red-50 text-red-700 border-red-200",
    pending_review: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const label = s.replace("_", " ");
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border capitalize", map[s])}>{label}</span>;
};

const riskBadge = (r: RiskLevel) => {
  const map: Record<RiskLevel, string> = {
    none: "bg-slate-50 text-slate-500 border-slate-200",
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-red-50 text-red-700 border-red-200",
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border capitalize", map[r])}>{r}</span>;
};

const integrationDot = (s: "ok" | "warn" | "fail") => {
  const map = { ok: "bg-emerald-500", warn: "bg-amber-500", fail: "bg-red-500" };
  return <span className={cn("inline-block w-1.5 h-1.5 rounded-full", map[s])} />;
};

/* ─────────── Page ─────────── */

export default function AdminHyperMCPVendorRegistry() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<VendorType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<VendorStatus | "all">("all");
  const [selected, setSelected] = useState<Vendor | null>(null);

  const filtered = useMemo(() => {
    return VENDORS.filter(v => {
      if (typeFilter !== "all" && v.type !== typeFilter) return false;
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (query && !v.name.toLowerCase().includes(query.toLowerCase()) &&
          !v.connectedSystem.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [query, typeFilter, statusFilter]);

  const kpis = useMemo(() => ({
    active: VENDORS.filter(v => v.status === "active").length,
    leadSources: VENDORS.filter(v => v.type === "lead_vendor" || v.type === "marketing_source").length,
    apiPartners: VENDORS.filter(v => v.type === "api_partner").length,
    risky: VENDORS.filter(v => v.risk === "medium" || v.risk === "high").length,
    disconnected: VENDORS.filter(v => v.status === "disconnected").length,
    pending: VENDORS.filter(v => v.status === "pending_review").length,
  }), []);

  const reviewList = VENDORS.filter(v => v.status === "pending_review" || v.risk === "high");
  const failedSyncs = VENDORS.filter(v => v.webhookStatus === "fail");
  const mappingGaps = VENDORS.filter(v => v.mappingGaps.length > 0);
  const complianceList = VENDORS.filter(v => v.complianceFlags.length > 0);
  const disconnectedList = VENDORS.filter(v => v.status === "disconnected");

  return (
    <HyperMCPShell>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-slate-700" />
              Vendor Registry
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage vendors, lead sources, system partners, and source-level risk visibility.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("Registry exported")}>
              <Download className="w-4 h-4 mr-1.5" /> Export Registry
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("Import sources opened")}>
              <Upload className="w-4 h-4 mr-1.5" /> Import Sources
            </Button>
            <Button size="sm" onClick={() => toast.success("Add vendor flow opened")}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Vendor
            </Button>
          </div>
        </div>

        <OperationalContext kind="vendor" />

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Active Vendors", value: kpis.active, icon: CheckCircle2, tone: "text-emerald-600" },
            { label: "Lead Sources", value: kpis.leadSources, icon: Megaphone, tone: "text-slate-700" },
            { label: "API Partners", value: kpis.apiPartners, icon: Plug, tone: "text-slate-700" },
            { label: "Risk Flags", value: kpis.risky, icon: ShieldAlert, tone: "text-amber-600" },
            { label: "Disconnected", value: kpis.disconnected, icon: XCircle, tone: "text-red-600" },
            { label: "Pending Review", value: kpis.pending, icon: Clock, tone: "text-amber-600" },
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
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search vendors or systems..."
                className="pl-8 h-9 text-sm"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as VendorType | "all")}
              className="h-9 px-2 text-sm border border-slate-200 rounded bg-white text-slate-700"
            >
              <option value="all">All types</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as VendorStatus | "all")}
              className="h-9 px-2 text-sm border border-slate-200 rounded bg-white text-slate-700"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="disconnected">Disconnected</option>
              <option value="pending_review">Pending review</option>
            </select>
            <span className="text-xs text-slate-500 ml-auto">{filtered.length} of {VENDORS.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Vendor / Source</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Connected System</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                  <th className="px-3 py-2 font-medium">Risk</th>
                  <th className="px-3 py-2 font-medium">Last Activity</th>
                  <th className="px-3 py-2 font-medium">Workflows</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const Icon = TYPE_ICON[v.type];
                  return (
                    <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => setSelected(v)}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-500" />
                          <div>
                            <p className="font-medium text-slate-900">{v.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{v.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{TYPE_LABEL[v.type]}</td>
                      <td className="px-3 py-2 text-slate-700">{v.connectedSystem}</td>
                      <td className="px-3 py-2">{statusBadge(v.status)}</td>
                      <td className="px-3 py-2 text-slate-700">{v.owner}</td>
                      <td className="px-3 py-2">{riskBadge(v.risk)}</td>
                      <td className="px-3 py-2 text-slate-600">{v.lastActivity}</td>
                      <td className="px-3 py-2 text-slate-700">{v.workflows.length}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" size="sm" className="h-7 px-2"
                          onClick={(e) => { e.stopPropagation(); setSelected(v); }}>
                          View <ArrowUpRight className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-500">No vendors match current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Source Mapping + Risk & Review */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Source Mapping</p>
                <p className="text-[11px] text-slate-500">CRM ↔ vendor attribution fields</p>
              </div>
              <Button variant="outline" size="sm" className="h-7" onClick={() => toast.info("Mapping editor opened")}>
                Configure
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">CRM Field</th>
                  <th className="px-3 py-2 font-medium">Vendor Attribute</th>
                  <th className="px-3 py-2 font-medium text-right">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {SOURCE_MAPPING.map((m, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs text-slate-800">{m.crmField}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{m.vendorAttr}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{m.coverage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Risk & Review
              </p>
              <p className="text-[11px] text-slate-500">Vendors needing attention</p>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                { title: "Pending Review", items: reviewList, icon: Clock, tone: "text-amber-600" },
                { title: "Failed Syncs", items: failedSyncs, icon: XCircle, tone: "text-red-600" },
                { title: "Mapping Gaps", items: mappingGaps, icon: AlertTriangle, tone: "text-amber-600" },
                { title: "Compliance Anomaly", items: complianceList, icon: ShieldAlert, tone: "text-red-600" },
                { title: "Disconnected", items: disconnectedList, icon: XCircle, tone: "text-slate-500" },
              ].map((g, i) => (
                <div key={i} className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium flex items-center gap-1.5">
                      <g.icon className={cn("w-3 h-3", g.tone)} /> {g.title}
                    </p>
                    <span className="text-[11px] text-slate-500">{g.items.length}</span>
                  </div>
                  {g.items.length === 0 ? (
                    <p className="text-xs text-slate-400">None</p>
                  ) : (
                    <ul className="space-y-0.5">
                      {g.items.slice(0, 3).map(v => (
                        <li key={v.id}>
                          <button onClick={() => setSelected(v)}
                            className="text-xs text-slate-700 hover:text-slate-900 hover:underline">
                            {v.name}
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

      {/* Vendor Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-700" />
                  {selected.name}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  {TYPE_LABEL[selected.type]} · {selected.connectedSystem} · <span className="font-mono">{selected.id}</span>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4 text-sm">
                {/* Profile bar */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-slate-200 rounded p-2">
                    <p className="text-[10px] uppercase text-slate-500">Status</p>
                    <div className="mt-1">{statusBadge(selected.status)}</div>
                  </div>
                  <div className="border border-slate-200 rounded p-2">
                    <p className="text-[10px] uppercase text-slate-500">Risk Level</p>
                    <div className="mt-1">{riskBadge(selected.risk)}</div>
                  </div>
                  <div className="border border-slate-200 rounded p-2">
                    <p className="text-[10px] uppercase text-slate-500">Owner</p>
                    <p className="mt-1 text-slate-800 font-medium">{selected.owner}</p>
                  </div>
                  <div className="border border-slate-200 rounded p-2">
                    <p className="text-[10px] uppercase text-slate-500">Last Activity</p>
                    <p className="mt-1 text-slate-800">{selected.lastActivity}</p>
                  </div>
                </div>

                {/* Volume */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-slate-200 rounded p-2">
                    <p className="text-[10px] uppercase text-slate-500">Lead Volume (30d)</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{selected.leadVolume30d.toLocaleString()}</p>
                  </div>
                  <div className="border border-slate-200 rounded p-2">
                    <p className="text-[10px] uppercase text-slate-500">Call Volume (30d)</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{selected.callVolume30d.toLocaleString()}</p>
                  </div>
                </div>

                {/* Integrations */}
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">Connected Integrations</p>
                  <div className="border border-slate-200 rounded divide-y divide-slate-100">
                    {selected.integrations.map((i, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-slate-800">{i.name}</span>
                        <span className="flex items-center gap-1.5">
                          {integrationDot(i.status)}
                          <span className="capitalize text-slate-600">{i.status}</span>
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-slate-50">
                      <span className="text-slate-700 font-medium">Webhook Status</span>
                      <span className="flex items-center gap-1.5">
                        {integrationDot(selected.webhookStatus)}
                        <span className="capitalize text-slate-600">{selected.webhookStatus}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workflows + Campaigns */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">Related Workflows</p>
                    <div className="border border-slate-200 rounded p-2 min-h-[60px]">
                      {selected.workflows.length === 0
                        ? <p className="text-xs text-slate-400">None</p>
                        : selected.workflows.map((w, i) => (
                            <span key={i} className="inline-block text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded mr-1 mb-1">{w}</span>
                          ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">Related Campaigns</p>
                    <div className="border border-slate-200 rounded p-2 min-h-[60px]">
                      {selected.campaigns.length === 0
                        ? <p className="text-xs text-slate-400">None</p>
                        : selected.campaigns.map((c, i) => (
                            <span key={i} className="inline-block text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded mr-1 mb-1">{c}</span>
                          ))}
                    </div>
                  </div>
                </div>

                {/* Compliance */}
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-amber-600" /> Compliance Risk
                  </p>
                  <div className="border border-slate-200 rounded p-2">
                    {selected.complianceFlags.length === 0
                      ? <p className="text-xs text-slate-500">No compliance flags.</p>
                      : (
                        <ul className="space-y-1">
                          {selected.complianceFlags.map((f, i) => (
                            <li key={i} className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">{f}</li>
                          ))}
                        </ul>
                      )}
                  </div>
                </div>

                {/* Recent Events */}
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">Recent Events</p>
                  <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {selected.recentEvents.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-1.5 text-xs">
                        <span className="text-slate-400 font-mono w-12 shrink-0">{e.ts}</span>
                        <span className={cn(
                          "flex-1",
                          e.level === "error" && "text-red-700",
                          e.level === "warn" && "text-amber-700",
                          e.level === "info" && "text-slate-700",
                        )}>{e.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes + Owner */}
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1.5">Notes</p>
                  <div className="border border-slate-200 rounded p-2 text-xs text-slate-700 min-h-[40px]">
                    {selected.notes || <span className="text-slate-400">No notes.</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <Button size="sm" variant="outline" onClick={() => toast.success("Owner reassigned")}>Reassign Owner</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Sync triggered")}>Re-sync</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Marked reviewed")}>Mark Reviewed</Button>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => toast.info("Audit logs opened")}>
                    <FileText className="w-3 h-3 mr-1" /> Audit Logs
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
