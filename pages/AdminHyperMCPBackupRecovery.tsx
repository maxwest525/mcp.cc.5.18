import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  HardDrive, Search, Plus, RotateCcw, Download, CheckCircle2, AlertTriangle,
  XCircle, Clock, Camera, Rocket, ListChecks, ShieldCheck, Workflow, History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SnapshotType = "config" | "workflow" | "mapping" | "queue" | "deployment" | "full";
type SnapshotStatus = "available" | "restoring" | "validating" | "failed" | "archived";

interface Snapshot {
  id: string;
  name: string;
  type: SnapshotType;
  version: string;
  createdAt: string;
  size: string;
  status: SnapshotStatus;
  scope: string[];
  validation: { ok: boolean; checks: { label: string; ok: boolean }[] };
  triggeredBy: string;
  notes: string;
  restorable: boolean;
}

const TYPE_LABEL: Record<SnapshotType, string> = {
  config: "Configuration", workflow: "Workflow", mapping: "Mapping",
  queue: "Queue Recovery", deployment: "Deployment", full: "Full System",
};

const SNAPSHOTS: Snapshot[] = [
  {
    id: "s_full_today", name: "Daily Full Backup", type: "full", version: "2026.05.14-04:00",
    createdAt: "Today 04:00", size: "182 MB", status: "available",
    scope: ["All workflows", "All mappings", "All integrations config", "Schemas"],
    validation: { ok: true, checks: [
      { label: "Snapshot integrity hash valid", ok: true },
      { label: "All required components present", ok: true },
      { label: "Schema versions resolvable", ok: true },
    ]},
    triggeredBy: "system", notes: "Automated nightly backup", restorable: true,
  },
  {
    id: "s_pre_deploy", name: "Pre-Deploy v2.4.1 Snapshot", type: "deployment", version: "v2.4.0",
    createdAt: "Today 09:42", size: "94 MB", status: "available",
    scope: ["Production workflows", "Active integrations"],
    validation: { ok: true, checks: [
      { label: "Configuration valid", ok: true },
      { label: "Rollback compatible", ok: true },
    ]},
    triggeredBy: "deploy.bot", notes: "Auto-created before v2.4.1 release", restorable: true,
  },
  {
    id: "s_workflow_lead", name: "Lead Intake Workflow", type: "workflow", version: "v3.2.0",
    createdAt: "Yesterday 18:20", size: "12 MB", status: "available",
    scope: ["Lead Intake Flow"],
    validation: { ok: true, checks: [
      { label: "Workflow definition complete", ok: true },
      { label: "Dependencies resolvable", ok: true },
    ]},
    triggeredBy: "j.rivera", notes: "Manual snapshot before scoring tweak", restorable: true,
  },
  {
    id: "s_mapping_crm", name: "Lead → CRM Mapping", type: "mapping", version: "v1.4.0",
    createdAt: "2 d ago", size: "3 MB", status: "available",
    scope: ["Field mapping CRM v1.4"],
    validation: { ok: true, checks: [
      { label: "All target fields present", ok: true },
      { label: "Transform expressions valid", ok: true },
    ]},
    triggeredBy: "system", notes: "", restorable: true,
  },
  {
    id: "s_queue_dispatch", name: "Dispatch Queue Snapshot", type: "queue", version: "depth-1247",
    createdAt: "1 hr ago", size: "8 MB", status: "available",
    scope: ["dispatch.queue", "in-flight messages"],
    validation: { ok: true, checks: [
      { label: "Message integrity valid", ok: true },
      { label: "DLQ separated", ok: true },
    ]},
    triggeredBy: "ops", notes: "Captured before queue pause", restorable: true,
  },
  {
    id: "s_failed_deploy", name: "Rollback Recovery v2.3.9", type: "deployment", version: "v2.3.9",
    createdAt: "Mon 14:08", size: "88 MB", status: "available",
    scope: ["Failed deployment v2.4.0-rc1"],
    validation: { ok: false, checks: [
      { label: "Configuration valid", ok: true },
      { label: "Schema migrations reversible", ok: false },
    ]},
    triggeredBy: "deploy.bot", notes: "Created during failed v2.4.0-rc1 release", restorable: false,
  },
  {
    id: "s_config_global", name: "Global Configuration", type: "config", version: "rev-8842",
    createdAt: "3 d ago", size: "1.4 MB", status: "available",
    scope: ["Workspace settings", "Auth config", "Notification rules"],
    validation: { ok: true, checks: [{ label: "Config schema valid", ok: true }]},
    triggeredBy: "system", notes: "", restorable: true,
  },
  {
    id: "s_archived", name: "Q1 Archive Backup", type: "full", version: "2026.03.31",
    createdAt: "45 d ago", size: "176 MB", status: "archived",
    scope: ["Q1 final state"],
    validation: { ok: true, checks: [{ label: "Archive integrity verified", ok: true }]},
    triggeredBy: "system", notes: "Quarterly retention archive", restorable: true,
  },
];

const statusBadge = (s: SnapshotStatus) => {
  const map: Record<SnapshotStatus, { cls: string; label: string }> = {
    available: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Available" },
    restoring: { cls: "bg-blue-50 text-blue-700 border-blue-200", label: "Restoring" },
    validating: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Validating" },
    failed: { cls: "bg-red-50 text-red-700 border-red-200", label: "Failed" },
    archived: { cls: "bg-slate-100 text-slate-600 border-slate-200", label: "Archived" },
  };
  return <span className={cn("inline-flex px-2 py-0.5 rounded text-[11px] font-medium border", map[s].cls)}>{map[s].label}</span>;
};

const typeColor: Record<SnapshotType, string> = {
  config: "bg-slate-100 text-slate-700 border-slate-200",
  workflow: "bg-violet-50 text-violet-700 border-violet-200",
  mapping: "bg-cyan-50 text-cyan-700 border-cyan-200",
  queue: "bg-amber-50 text-amber-700 border-amber-200",
  deployment: "bg-blue-50 text-blue-700 border-blue-200",
  full: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function AdminHyperMCPBackupRecovery() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<SnapshotType | "all">("all");
  const [selected, setSelected] = useState<Snapshot | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const filtered = useMemo(() => SNAPSHOTS.filter(s => {
    if (typeFilter !== "all" && s.type !== typeFilter) return false;
    if (query && !s.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [query, typeFilter]);

  const kpis = {
    total: SNAPSHOTS.length,
    available: SNAPSHOTS.filter(s => s.status === "available").length,
    failed: SNAPSHOTS.filter(s => !s.validation.ok).length,
    deployments: SNAPSHOTS.filter(s => s.type === "deployment").length,
    queue: SNAPSHOTS.filter(s => s.type === "queue").length,
    archived: SNAPSHOTS.filter(s => s.status === "archived").length,
  };

  const handleRestore = () => {
    if (!selected) return;
    if (!selected.validation.ok) {
      toast.error("Cannot restore: validation failed");
      return;
    }
    toast.success(`Restoring ${selected.name}...`);
    setConfirmRestore(false);
    setSelected(null);
  };

  return (
    <HyperMCPShell>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <HardDrive className="w-6 h-6 text-slate-700" />
              Backup &amp; Recovery
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Configuration backups, workflow recovery, rollback snapshots, and restoration operations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("Snapshot exported")}>
              <Download className="w-4 h-4 mr-1.5" /> Export
            </Button>
            <Button size="sm" onClick={() => toast.success("Snapshot created")}>
              <Camera className="w-4 h-4 mr-1.5" /> New Snapshot
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Snapshots", value: kpis.total, icon: HardDrive, tone: "text-slate-700" },
            { label: "Available", value: kpis.available, icon: CheckCircle2, tone: "text-emerald-600" },
            { label: "Validation Issues", value: kpis.failed, icon: AlertTriangle, tone: "text-amber-600" },
            { label: "Deployment Snaps", value: kpis.deployments, icon: Rocket, tone: "text-slate-700" },
            { label: "Queue Recovery", value: kpis.queue, icon: ListChecks, tone: "text-amber-600" },
            { label: "Archived", value: kpis.archived, icon: History, tone: "text-slate-600" },
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

        {/* Filters + table */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-3 border-b border-slate-200 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <Input className="pl-8 h-9" placeholder="Search snapshots..."
                value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <Button size="sm" variant={typeFilter === "all" ? "default" : "outline"} onClick={() => setTypeFilter("all")}>All</Button>
            {(Object.keys(TYPE_LABEL) as SnapshotType[]).map(t => (
              <Button key={t} size="sm" variant={typeFilter === t ? "default" : "outline"} onClick={() => setTypeFilter(t)}>
                {TYPE_LABEL[t]}
              </Button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="text-left px-3 py-2 font-medium">Snapshot</th>
                  <th className="text-left px-3 py-2 font-medium">Type</th>
                  <th className="text-left px-3 py-2 font-medium">Version</th>
                  <th className="text-left px-3 py-2 font-medium">Created</th>
                  <th className="text-right px-3 py-2 font-medium">Size</th>
                  <th className="text-left px-3 py-2 font-medium">Trigger</th>
                  <th className="text-left px-3 py-2 font-medium">Validation</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(s)}>
                    <td className="px-3 py-2">
                      <p className="text-slate-900 font-medium">{s.name}</p>
                      {s.notes && <p className="text-[10px] text-slate-500 truncate max-w-[280px]">{s.notes}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border", typeColor[s.type])}>
                        {TYPE_LABEL[s.type]}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{s.version}</td>
                    <td className="px-3 py-2 text-[12px] text-slate-600">{s.createdAt}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[12px] text-slate-700">{s.size}</td>
                    <td className="px-3 py-2 text-[12px] text-slate-700">{s.triggeredBy}</td>
                    <td className="px-3 py-2">
                      {s.validation.ok
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
                        : <AlertTriangle className="w-4 h-4 text-amber-600"/>}
                    </td>
                    <td className="px-3 py-2">{statusBadge(s.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-slate-200 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <Rocket className="w-4 h-4 text-slate-700"/> Failed Deployment Recovery
            </p>
            <div className="space-y-2 text-[12px]">
              {SNAPSHOTS.filter(s => s.type === "deployment").map(s => (
                <div key={s.id} className="border border-slate-200 rounded p-2">
                  <p className="font-medium text-slate-900">{s.name}</p>
                  <p className="text-[11px] text-slate-600">{s.version} · {s.createdAt}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-slate-200 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-amber-600"/> Queue Recovery Snapshots
            </p>
            <div className="space-y-2 text-[12px]">
              {SNAPSHOTS.filter(s => s.type === "queue").map(s => (
                <div key={s.id} className="border border-slate-200 rounded p-2">
                  <p className="font-medium text-slate-900">{s.name}</p>
                  <p className="text-[11px] text-slate-600">{s.version} · {s.createdAt}</p>
                </div>
              ))}
              {SNAPSHOTS.filter(s => s.type === "queue").length === 0 &&
                <p className="text-[11px] text-slate-500">No queue snapshots</p>}
            </div>
          </Card>
          <Card className="border-slate-200 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <Workflow className="w-4 h-4 text-violet-600"/> Workflow Restoration
            </p>
            <div className="space-y-2 text-[12px]">
              {SNAPSHOTS.filter(s => s.type === "workflow" || s.type === "mapping").map(s => (
                <div key={s.id} className="border border-slate-200 rounded p-2">
                  <p className="font-medium text-slate-900">{s.name}</p>
                  <p className="text-[11px] text-slate-600">{s.version} · {s.createdAt}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Drawer */}
        <Sheet open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setConfirmRestore(false); } }}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle>{selected.name}</SheetTitle>
                  <SheetDescription>
                    {TYPE_LABEL[selected.type]} · {selected.version} · {selected.size}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: "Status", v: <div>{statusBadge(selected.status)}</div> },
                      { l: "Created", v: <span className="text-sm text-slate-900">{selected.createdAt}</span> },
                      { l: "Triggered By", v: <span className="text-sm text-slate-900">{selected.triggeredBy}</span> },
                    ].map((s, i) => (
                      <div key={i} className="p-2 border border-slate-200 rounded">
                        <p className="text-[10px] uppercase text-slate-500 mb-1">{s.l}</p>
                        {s.v}
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">Restore Scope</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.scope.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] border border-slate-200">{s}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5"/> Pre-Restore Validation
                    </p>
                    <div className="border border-slate-200 rounded divide-y divide-slate-100">
                      {selected.validation.checks.map((c, i) => (
                        <div key={i} className="px-3 py-2 flex items-center justify-between text-[12px]">
                          <span className="text-slate-700">{c.label}</span>
                          {c.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600"/> : <XCircle className="w-4 h-4 text-red-600"/>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {selected.notes && (
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1">Notes</p>
                      <p className="text-[12px] text-slate-700 border border-slate-200 rounded p-2 bg-slate-50">{selected.notes}</p>
                    </div>
                  )}

                  {confirmRestore ? (
                    <div className="border border-amber-300 bg-amber-50 rounded p-3">
                      <p className="text-[12px] text-amber-900 font-medium mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4"/> Confirm restore
                      </p>
                      <p className="text-[11px] text-amber-800 mb-3">
                        This will overwrite current state for {selected.scope.length} component(s). Action is logged in audit history.
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleRestore}>
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5"/> Confirm Restore
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmRestore(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" disabled={!selected.restorable} onClick={() => setConfirmRestore(true)}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5"/> Restore
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success("Validation re-run")}>
                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5"/> Re-validate
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast.success("Snapshot downloaded")}>
                        <Download className="w-3.5 h-3.5 mr-1.5"/> Download
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </HyperMCPShell>
  );
}
