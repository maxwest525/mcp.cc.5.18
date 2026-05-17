import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  KeyRound, Search, Plus, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Clock, ShieldCheck, Calendar, History, User as UserIcon, Link2, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CredStatus = "active" | "expiring" | "expired" | "rotation_required" | "validation_failing";
type CredType = "api_key" | "oauth_token" | "secret" | "certificate" | "service_account";

interface Credential {
  id: string;
  name: string;
  type: CredType;
  integration: string;
  owner: string;
  createdAt: string;
  lastRotated: string;
  expiresIn: number; // days
  status: CredStatus;
  validation: "ok" | "warn" | "fail";
  rotationSchedule: string;
  dependencies: string[];
  rotations: { ts: string; by: string; result: "success" | "failed" }[];
  securityEvents: { ts: string; severity: "info" | "warn" | "alert"; text: string }[];
  audit: { ts: string; actor: string; action: string }[];
}

const CREDS: Credential[] = [
  {
    id: "c_twilio_main", name: "TWILIO_AUTH_TOKEN", type: "api_key", integration: "Twilio",
    owner: "Ops Platform", createdAt: "Apr 12, 2025", lastRotated: "12 days ago",
    expiresIn: 4, status: "expiring", validation: "ok", rotationSchedule: "Every 90 days",
    dependencies: ["SMS Send Workflow", "Pulse Notifications", "Customer Messaging"],
    rotations: [
      { ts: "12 d ago", by: "system", result: "success" },
      { ts: "102 d ago", by: "system", result: "success" },
      { ts: "192 d ago", by: "j.rivera", result: "success" },
    ],
    securityEvents: [
      { ts: "2 d ago", severity: "info", text: "Token validated successfully" },
      { ts: "Today", severity: "warn", text: "Approaching expiration window" },
    ],
    audit: [
      { ts: "12 d ago", actor: "system", action: "Auto-rotated" },
      { ts: "Today", actor: "system", action: "Validation check passed" },
    ],
  },
  {
    id: "c_resend", name: "RESEND_API_KEY", type: "api_key", integration: "Resend",
    owner: "Email Infra", createdAt: "Jan 04, 2026", lastRotated: "30 days ago",
    expiresIn: 60, status: "active", validation: "ok", rotationSchedule: "Every 90 days",
    dependencies: ["Transactional Email", "Daily Digest", "Customer Messaging"],
    rotations: [{ ts: "30 d ago", by: "system", result: "success" }],
    securityEvents: [{ ts: "30 d ago", severity: "info", text: "Rotated automatically" }],
    audit: [{ ts: "30 d ago", actor: "system", action: "Rotated" }],
  },
  {
    id: "c_fmcsa", name: "FMCSA_WEB_KEY", type: "api_key", integration: "FMCSA Safety",
    owner: "Compliance", createdAt: "Aug 22, 2024", lastRotated: "240 days ago",
    expiresIn: -3, status: "expired", validation: "fail", rotationSchedule: "Every 180 days",
    dependencies: ["Carrier Vetting", "Dispatch Gate"],
    rotations: [{ ts: "240 d ago", by: "k.morgan", result: "success" }],
    securityEvents: [
      { ts: "3 d ago", severity: "alert", text: "Credential expired - validation failing" },
      { ts: "10 d ago", severity: "warn", text: "Rotation reminder ignored" },
    ],
    audit: [{ ts: "3 d ago", actor: "system", action: "Marked expired" }],
  },
  {
    id: "c_google_oauth", name: "GSC_REFRESH_TOKEN", type: "oauth_token", integration: "Google Search Console",
    owner: "Marketing", createdAt: "Feb 18, 2026", lastRotated: "—", expiresIn: 180, status: "active",
    validation: "ok", rotationSchedule: "Auto refresh",
    dependencies: ["GSC Sync", "Marketing SEO Module"],
    rotations: [],
    securityEvents: [{ ts: "Today", severity: "info", text: "Refresh succeeded" }],
    audit: [{ ts: "Today", actor: "system", action: "Token refreshed" }],
  },
  {
    id: "c_lovable_ai", name: "LOVABLE_API_KEY", type: "api_key", integration: "Lovable AI Gateway",
    owner: "AI Platform", createdAt: "Mar 02, 2026", lastRotated: "8 days ago",
    expiresIn: 82, status: "active", validation: "ok", rotationSchedule: "Every 90 days",
    dependencies: ["AI Estimation", "Trudy Assistant", "Marketing AI"],
    rotations: [{ ts: "8 d ago", by: "system", result: "success" }],
    securityEvents: [],
    audit: [{ ts: "8 d ago", actor: "system", action: "Rotated" }],
  },
  {
    id: "c_convoso", name: "CONVOSO_AUTH_TOKEN", type: "secret", integration: "Convoso Dialer",
    owner: "Sales Ops", createdAt: "Nov 11, 2025", lastRotated: "60 days ago",
    expiresIn: 14, status: "rotation_required", validation: "warn", rotationSchedule: "Every 75 days",
    dependencies: ["Call Routing", "Lead Distribution"],
    rotations: [{ ts: "60 d ago", by: "ops", result: "success" }],
    securityEvents: [{ ts: "Today", severity: "warn", text: "Rotation overdue per policy" }],
    audit: [{ ts: "60 d ago", actor: "ops", action: "Manual rotation" }],
  },
  {
    id: "c_supabase_srv", name: "SUPABASE_SERVICE_ROLE_KEY", type: "service_account",
    integration: "Lovable Cloud", owner: "Platform", createdAt: "Jan 01, 2026",
    lastRotated: "—", expiresIn: 365, status: "active", validation: "ok",
    rotationSchedule: "Manual",
    dependencies: ["Edge Functions", "Backend Workers", "Daily Digest"],
    rotations: [],
    securityEvents: [{ ts: "Today", severity: "info", text: "Active and validated" }],
    audit: [],
  },
  {
    id: "c_mapbox", name: "MAPBOX_SECRET_TOKEN", type: "api_key", integration: "Mapbox",
    owner: "Dispatch", createdAt: "May 30, 2025", lastRotated: "120 days ago",
    expiresIn: 22, status: "expiring", validation: "ok", rotationSchedule: "Every 150 days",
    dependencies: ["Fleet Tracker", "Route Optimization"],
    rotations: [{ ts: "120 d ago", by: "system", result: "success" }],
    securityEvents: [],
    audit: [],
  },
];

const statusBadge = (s: CredStatus) => {
  const map: Record<CredStatus, { cls: string; label: string }> = {
    active: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Active" },
    expiring: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Expiring" },
    expired: { cls: "bg-red-50 text-red-700 border-red-200", label: "Expired" },
    rotation_required: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Rotation Required" },
    validation_failing: { cls: "bg-red-50 text-red-700 border-red-200", label: "Validation Failing" },
  };
  return <span className={cn("inline-flex px-2 py-0.5 rounded text-[11px] font-medium border", map[s].cls)}>{map[s].label}</span>;
};

const typeLabel: Record<CredType, string> = {
  api_key: "API Key", oauth_token: "OAuth Token", secret: "Secret",
  certificate: "Certificate", service_account: "Service Account",
};

export default function AdminHyperMCPCredentialLifecycle() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CredStatus | "all">("all");
  const [selected, setSelected] = useState<Credential | null>(null);

  const filtered = useMemo(() => CREDS.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (query && !c.name.toLowerCase().includes(query.toLowerCase()) &&
        !c.integration.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [query, statusFilter]);

  const kpis = {
    total: CREDS.length,
    expiring: CREDS.filter(c => c.status === "expiring").length,
    expired: CREDS.filter(c => c.status === "expired").length,
    rotationDue: CREDS.filter(c => c.status === "rotation_required").length,
    failing: CREDS.filter(c => c.validation === "fail").length,
    autoRotated: CREDS.filter(c => c.rotationSchedule.includes("Every")).length,
  };

  return (
    <HyperMCPShell>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-6 h-6 text-slate-700" />
              Credential Lifecycle
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Track credential creation, expiration, rotation, validation, and security events.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("Validation run started")}>
              <ShieldCheck className="w-4 h-4 mr-1.5" /> Validate All
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Audit exported")}>
              <Download className="w-4 h-4 mr-1.5" /> Export Audit
            </Button>
            <Button size="sm" onClick={() => toast.info("Add credential dialog")}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Credential
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Credentials", value: kpis.total, icon: KeyRound, tone: "text-slate-700" },
            { label: "Expiring", value: kpis.expiring, icon: Clock, tone: "text-amber-600" },
            { label: "Expired", value: kpis.expired, icon: XCircle, tone: "text-red-600" },
            { label: "Rotation Due", value: kpis.rotationDue, icon: RefreshCw, tone: "text-amber-600" },
            { label: "Validation Failing", value: kpis.failing, icon: AlertTriangle, tone: "text-red-600" },
            { label: "Auto-Rotated", value: kpis.autoRotated, icon: CheckCircle2, tone: "text-emerald-600" },
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

        {/* Top: Expiring + filters/table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-slate-200 shadow-sm p-4 lg:col-span-1">
            <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600"/> Expiring Soon
            </p>
            <div className="space-y-2">
              {CREDS.filter(c => c.expiresIn <= 30).sort((a, b) => a.expiresIn - b.expiresIn).map(c => (
                <div key={c.id} onClick={() => setSelected(c)}
                     className="flex items-center justify-between p-2 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="text-[12px] font-mono text-slate-900 truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500">{c.integration}</p>
                  </div>
                  <span className={cn("text-[11px] font-semibold tabular-nums",
                    c.expiresIn < 0 ? "text-red-600" : c.expiresIn < 7 ? "text-red-600" : "text-amber-600")}>
                    {c.expiresIn < 0 ? `${Math.abs(c.expiresIn)}d ago` : `${c.expiresIn}d`}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-slate-200 shadow-sm lg:col-span-2">
            <div className="p-3 border-b border-slate-200 flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                <Input className="pl-8 h-9" placeholder="Search credentials..."
                  value={query} onChange={e => setQuery(e.target.value)} />
              </div>
              {(["all", "active", "expiring", "expired", "rotation_required"] as const).map(s => (
                <Button key={s} size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => setStatusFilter(s)}>
                  {s === "all" ? "All" : s.replace("_", " ")}
                </Button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="text-left px-3 py-2 font-medium">Credential</th>
                    <th className="text-left px-3 py-2 font-medium">Type</th>
                    <th className="text-left px-3 py-2 font-medium">Owner</th>
                    <th className="text-left px-3 py-2 font-medium">Last Rotated</th>
                    <th className="text-right px-3 py-2 font-medium">Expires In</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => setSelected(c)}>
                      <td className="px-3 py-2">
                        <p className="font-mono text-[12px] text-slate-900">{c.name}</p>
                        <p className="text-[10px] text-slate-500">{c.integration}</p>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-slate-700">{typeLabel[c.type]}</td>
                      <td className="px-3 py-2 text-[12px] text-slate-700">{c.owner}</td>
                      <td className="px-3 py-2 text-[12px] text-slate-600">{c.lastRotated}</td>
                      <td className={cn("px-3 py-2 text-right text-[12px] tabular-nums font-medium",
                        c.expiresIn < 0 ? "text-red-600" : c.expiresIn < 14 ? "text-amber-600" : "text-slate-700")}>
                        {c.expiresIn < 0 ? `${Math.abs(c.expiresIn)}d ago` : `${c.expiresIn}d`}
                      </td>
                      <td className="px-3 py-2">{statusBadge(c.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Bottom panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-slate-200 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-700"/> Recent Rotations
            </p>
            <div className="space-y-2 text-[12px]">
              {CREDS.flatMap(c => c.rotations.map(r => ({ ...r, name: c.name })))
                .slice(0, 6).map((r, i) => (
                <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="min-w-0">
                    <p className="font-mono text-slate-800 truncate">{r.name}</p>
                    <p className="text-[10px] text-slate-500">by {r.by}</p>
                  </div>
                  <span className="text-[11px] text-slate-600">{r.ts}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-slate-200 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600"/> Validation Failures
            </p>
            <div className="space-y-2 text-[12px]">
              {CREDS.filter(c => c.validation !== "ok").map(c => (
                <div key={c.id} className="border border-slate-200 rounded p-2">
                  <p className="font-mono text-slate-900">{c.name}</p>
                  <p className="text-[11px] text-slate-600">{c.integration}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-slate-200 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-700"/> Rotation Schedule
            </p>
            <div className="space-y-2 text-[12px]">
              {CREDS.slice(0, 6).map(c => (
                <div key={c.id} className="flex items-center justify-between">
                  <span className="font-mono text-slate-700 truncate">{c.name}</span>
                  <span className="text-[11px] text-slate-600">{c.rotationSchedule}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Drawer */}
        <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle className="font-mono text-[15px]">{selected.name}</SheetTitle>
                  <SheetDescription>
                    {selected.integration} · {typeLabel[selected.type]}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { l: "Status", v: <div>{statusBadge(selected.status)}</div> },
                      { l: "Owner", v: <span className="text-sm text-slate-900 flex items-center gap-1"><UserIcon className="w-3 h-3"/>{selected.owner}</span> },
                      { l: "Created", v: <span className="text-sm text-slate-900">{selected.createdAt}</span> },
                      { l: "Last Rotated", v: <span className="text-sm text-slate-900">{selected.lastRotated}</span> },
                      { l: "Schedule", v: <span className="text-sm text-slate-900">{selected.rotationSchedule}</span> },
                      { l: "Expires In", v: <span className="text-sm text-slate-900">{selected.expiresIn < 0 ? `${Math.abs(selected.expiresIn)}d ago` : `${selected.expiresIn}d`}</span> },
                    ].map((s, i) => (
                      <div key={i} className="p-2 border border-slate-200 rounded">
                        <p className="text-[10px] uppercase text-slate-500 mb-1">{s.l}</p>
                        {s.v}
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1"><Link2 className="w-3 h-3"/> Dependencies</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.dependencies.map((d, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] border border-slate-200">{d}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">Rotation History</p>
                    <div className="border border-slate-200 rounded divide-y divide-slate-100">
                      {selected.rotations.length === 0 && <p className="px-3 py-2 text-[12px] text-slate-500">No rotations recorded</p>}
                      {selected.rotations.map((r, i) => (
                        <div key={i} className="px-3 py-2 flex items-center justify-between text-[12px]">
                          <span className="text-slate-700">{r.ts} · by {r.by}</span>
                          <span className={cn("text-[11px] font-medium",
                            r.result === "success" ? "text-emerald-700" : "text-red-600")}>{r.result}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">Security Events</p>
                    <div className="border border-slate-200 rounded divide-y divide-slate-100">
                      {selected.securityEvents.map((e, i) => (
                        <div key={i} className="px-3 py-2 flex items-start justify-between text-[12px] gap-2">
                          <span className="text-slate-700">{e.text}</span>
                          <span className={cn("text-[10px] font-medium uppercase shrink-0",
                            e.severity === "alert" ? "text-red-600" : e.severity === "warn" ? "text-amber-600" : "text-slate-500")}>
                            {e.severity} · {e.ts}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">Audit History</p>
                    <div className="border border-slate-200 rounded divide-y divide-slate-100">
                      {selected.audit.map((a, i) => (
                        <div key={i} className="px-3 py-2 flex items-center justify-between text-[12px]">
                          <span className="text-slate-700">{a.action}</span>
                          <span className="text-[11px] text-slate-500">{a.actor} · {a.ts}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => toast.success("Rotation initiated")}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5"/> Rotate Now
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success("Validation triggered")}>
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5"/> Validate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.info("Schedule updated")}>
                      <Calendar className="w-3.5 h-3.5 mr-1.5"/> Schedule
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
