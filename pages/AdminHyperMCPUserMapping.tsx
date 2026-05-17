import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  ArrowLeft, Users, Plus, RefreshCw, Search, Loader2, Filter,
  ChevronDown, Download, Sparkles, CheckCircle2, AlertTriangle,
  EyeOff, Trash2, Pencil, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type MapStatus = "mapped" | "unmapped" | "low_confidence" | "conflict" | "ignored";

interface MappingRow {
  id: string;
  integration_id: string | null;
  crm_user_id: string | null;
  crm_name: string | null;
  crm_email: string | null;
  external_user_id: string | null;
  external_name: string | null;
  external_email: string | null;
  mapping_status: string;
  confidence_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  integration_name?: string;
  integration_slug?: string;
}

const STATUS_PILL: Record<MapStatus, string> = {
  mapped:         "bg-[#22C55E]/10 text-[#16A34A] border-[#22C55E]/40",
  unmapped:       "bg-slate-500/10 text-slate-600 border-slate-300",
  low_confidence: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  conflict:       "bg-rose-500/10 text-rose-600 border-rose-500/30",
  ignored:        "bg-slate-400/10 text-slate-500 border-slate-300",
};

const STATUS_LABEL: Record<MapStatus, string> = {
  mapped: "Mapped",
  unmapped: "Unmapped",
  low_confidence: "Low Confidence",
  conflict: "Conflict",
  ignored: "Ignored",
};

function normalizeStatus(raw: string): MapStatus {
  const s = (raw || "").toLowerCase();
  if (s in STATUS_LABEL) return s as MapStatus;
  return "unmapped";
}

function StatusPill({ status }: { status: MapStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium tracking-wide whitespace-nowrap",
      STATUS_PILL[status],
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full",
        status === "mapped" && "bg-[#22C55E]",
        status === "low_confidence" && "bg-amber-500",
        status === "conflict" && "bg-rose-500",
        (status === "unmapped" || status === "ignored") && "bg-slate-400")} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function ConfidencePill({ score }: { score: number | null }) {
  if (score == null) return <span className="text-[rgba(11,22,36,0.48)] text-[11px]">—</span>;
  const pct = Math.round(score * 100);
  const color =
    pct >= 85 ? "text-[#16A34A] bg-[#22C55E]/10 border-[#22C55E]/30" :
    pct >= 65 ? "text-amber-600 bg-amber-500/10 border-amber-500/30" :
                "text-rose-600 bg-rose-500/10 border-rose-500/30";
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium tabular-nums", color)}>
      {pct}%
    </span>
  );
}

function FilterButton({
  label, value, options, onChange, allLabel = "All",
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  allLabel?: string;
}) {
  const current = value === "all" ? allLabel : (options.find((o) => o.value === value)?.label ?? value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md bg-white border border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#F6F8FB] transition-colors">
          <Filter className="w-3.5 h-3.5 text-[rgba(11,22,36,0.48)]" />
          <span className="text-[rgba(11,22,36,0.62)]">{label}:</span>
          <span className="font-medium capitalize">{current}</span>
          <ChevronDown className="w-3 h-3 text-[rgba(11,22,36,0.48)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        <button
          onClick={() => onChange("all")}
          className={cn("w-full text-left text-[12px] px-2 py-1.5 rounded hover:bg-[#F6F8FB]", value === "all" && "bg-[#F6F8FB] font-medium")}
        >
          {allLabel}
        </button>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn("w-full text-left text-[12px] px-2 py-1.5 rounded hover:bg-[#F6F8FB] capitalize", value === o.value && "bg-[#F6F8FB] font-medium")}
          >
            {o.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function fmtRel(d: string | null) {
  if (!d) return "—";
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return "—"; }
}

export default function AdminHyperMCPUserMapping() {
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [intFilter, setIntFilter] = useState("all");
  const [confFilter, setConfFilter] = useState("all"); // all | high | medium | low | none

  const [openRow, setOpenRow] = useState<MappingRow | null>(null);
  const [draft, setDraft] = useState<Partial<MappingRow>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("hyper_mcp_user_mappings")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) { toast.error("Failed to load mappings"); setLoading(false); return; }
    const list = (data || []) as MappingRow[];
    if (list.length) {
      const ids = Array.from(new Set(list.map((r) => r.integration_id).filter(Boolean) as string[]));
      if (ids.length) {
        const { data: ints } = await supabase
          .from("hyper_mcp_integrations").select("id, name, slug").in("id", ids);
        const map = new Map((ints || []).map((i: any) => [i.id, i]));
        list.forEach((r) => {
          const i = r.integration_id ? map.get(r.integration_id) : null;
          r.integration_name = i?.name;
          r.integration_slug = i?.slug;
        });
      }
    }
    setRows(list);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const integrations = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((r) => { if (r.integration_id && r.integration_name) seen.set(r.integration_id, r.integration_name); });
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const status = normalizeStatus(r.mapping_status);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (intFilter !== "all" && r.integration_id !== intFilter) return false;
      if (confFilter !== "all") {
        const c = r.confidence_score;
        if (confFilter === "none" && c != null) return false;
        if (confFilter === "high" && !(c != null && c >= 0.85)) return false;
        if (confFilter === "medium" && !(c != null && c >= 0.65 && c < 0.85)) return false;
        if (confFilter === "low" && !(c != null && c < 0.65)) return false;
      }
      if (q.trim()) {
        const t = q.trim().toLowerCase();
        const hay = `${r.crm_name || ""} ${r.crm_email || ""} ${r.external_name || ""} ${r.external_email || ""} ${r.external_user_id || ""} ${r.integration_name || ""}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    });
  }, [rows, q, statusFilter, intFilter, confFilter]);

  const summary = useMemo(() => {
    const crmEmails = new Set<string>();
    let mapped = 0, unmapped = 0, conflict = 0, low = 0;
    rows.forEach((r) => {
      if (r.crm_email) crmEmails.add(r.crm_email.toLowerCase());
      const s = normalizeStatus(r.mapping_status);
      if (s === "mapped") mapped++;
      else if (s === "unmapped") unmapped++;
      else if (s === "conflict") conflict++;
      else if (s === "low_confidence") low++;
    });
    return { totalCrm: crmEmails.size, mapped, unmapped, conflict, low };
  }, [rows]);

  async function patchRow(id: string, patch: Partial<MappingRow>) {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch, updated_at: new Date().toISOString() } : x)));
    const { error } = await supabase.from("hyper_mcp_user_mappings").update(patch).eq("id", id);
    if (error) { setRows(prev); toast.error(error.message); return false; }
    return true;
  }

  async function deleteRow(id: string) {
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    const { error } = await supabase.from("hyper_mcp_user_mappings").delete().eq("id", id);
    if (error) { setRows(prev); toast.error(error.message); return; }
    toast.success("Mapping deleted");
  }

  function openDrawer(r: MappingRow) {
    setOpenRow(r);
    setDraft({
      crm_name: r.crm_name, crm_email: r.crm_email,
      external_name: r.external_name, external_email: r.external_email,
      external_user_id: r.external_user_id, notes: r.notes,
    });
  }

  async function saveDraft() {
    if (!openRow) return;
    const ok = await patchRow(openRow.id, draft);
    if (ok) { toast.success("Mapping updated"); setOpenRow(null); }
  }

  function exportCsv() {
    const header = ["CRM Name","CRM Email","Integration","External Name","External Email","External User ID","Confidence","Status","Updated"];
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      const row = [
        r.crm_name, r.crm_email, r.integration_name, r.external_name, r.external_email,
        r.external_user_id, r.confidence_score, r.mapping_status, r.updated_at,
      ].map((v) => v == null ? "" : `"${String(v).replace(/"/g, '""')}"`);
      lines.push(row.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `user-mappings-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function autoMatch() {
    // Promote any unmapped/low_confidence rows whose CRM and external emails match exactly
    const targets = rows.filter((r) =>
      r.crm_email && r.external_email &&
      r.crm_email.toLowerCase() === r.external_email.toLowerCase() &&
      normalizeStatus(r.mapping_status) !== "mapped"
    );
    if (!targets.length) { toast.message("No additional auto-matches found"); return; }
    let n = 0;
    for (const t of targets) {
      const ok = await patchRow(t.id, { mapping_status: "mapped", confidence_score: 0.99 });
      if (ok) n++;
    }
    toast.success(`Auto-matched ${n} user${n === 1 ? "" : "s"}`);
  }

  const possibleDuplicates = useMemo(() => {
    if (!openRow?.external_email) return [];
    const e = openRow.external_email.toLowerCase();
    return rows.filter((r) => r.id !== openRow.id && (r.external_email?.toLowerCase() === e || r.crm_email?.toLowerCase() === e));
  }, [openRow, rows]);

  return (
    <HyperMCPShell breadcrumb="/ Hyper MCP / User Mapping">
      <div className="p-6 space-y-5 bg-[#F6F8FB] min-h-[calc(100vh-3.5rem)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/hypermcp" className="inline-flex items-center gap-1.5 text-[12px] text-[rgba(11,22,36,0.62)] hover:text-[#0B1624] transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Command Center
            </Link>
            <span className="text-[rgba(11,22,36,0.30)]">/</span>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold text-[#0B1624] tracking-tight inline-flex items-center gap-2">
                <Users className="w-4 h-4 text-[rgba(11,22,36,0.62)]" />
                User Mapping
              </h1>
              <p className="text-[11px] text-[rgba(11,22,36,0.62)] mt-0.5">
                Match CRM users to connected platform users.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={autoMatch} className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md bg-white border border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#F6F8FB] transition-colors">
              <Sparkles className="w-3.5 h-3.5" /> Auto Match Users
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md bg-white border border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#F6F8FB] transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button onClick={() => toast.message("Add Mapping form opens here")} className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md bg-[#0B1624] text-white hover:bg-[#1a2940] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Mapping
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {([
            ["Total CRM Users", summary.totalCrm, "#0B1624"],
            ["Mapped", summary.mapped, "#16A34A"],
            ["Unmapped", summary.unmapped, "#64748B"],
            ["Duplicate Conflicts", summary.conflict, "#DC2626"],
            ["Low Confidence", summary.low, "#D97706"],
          ] as const).map(([label, value, color]) => (
            <Card key={label} className="bg-white border-[rgba(15,23,42,0.06)] rounded-lg p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">{label}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[22px] font-semibold tabular-nums text-[#0B1624]">{value}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="bg-white border-[rgba(15,23,42,0.06)] rounded-lg p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-[rgba(11,22,36,0.48)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, or external ID…"
                className="h-8 pl-8 text-[12px] bg-white border-[rgba(15,23,42,0.10)] focus-visible:ring-0"
              />
            </div>
            <FilterButton
              label="Integration"
              value={intFilter}
              onChange={setIntFilter}
              options={integrations}
            />
            <FilterButton
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={(Object.keys(STATUS_LABEL) as MapStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            />
            <FilterButton
              label="Confidence"
              value={confFilter}
              onChange={setConfFilter}
              options={[
                { value: "high", label: "High (≥85%)" },
                { value: "medium", label: "Medium (65–84%)" },
                { value: "low", label: "Low (<65%)" },
                { value: "none", label: "No score" },
              ]}
            />
            <button onClick={load} className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md bg-white border border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#F6F8FB] transition-colors">
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </Card>

        {/* Table */}
        <Card className="bg-white border-[rgba(15,23,42,0.06)] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#F6F8FB] border-b border-[rgba(15,23,42,0.06)] text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">
                  <th className="text-left font-medium px-3 py-2">CRM Name</th>
                  <th className="text-left font-medium px-3 py-2">CRM Email</th>
                  <th className="text-left font-medium px-3 py-2">Integration</th>
                  <th className="text-left font-medium px-3 py-2">External Name</th>
                  <th className="text-left font-medium px-3 py-2">External Email</th>
                  <th className="text-left font-medium px-3 py-2">External ID</th>
                  <th className="text-left font-medium px-3 py-2">Confidence</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                  <th className="text-left font-medium px-3 py-2">Updated</th>
                  <th className="text-right font-medium px-3 py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={10} className="px-3 py-10 text-center text-[rgba(11,22,36,0.48)]">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading mappings…
                  </td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-3 py-10 text-center text-[rgba(11,22,36,0.48)]">
                    No mappings match these filters.
                  </td></tr>
                )}
                {!loading && filtered.map((r) => {
                  const status = normalizeStatus(r.mapping_status);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => openDrawer(r)}
                      className="border-b border-[rgba(15,23,42,0.04)] last:border-0 hover:bg-[#F6F8FB]/60 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-2.5 font-medium text-[#0B1624]">{r.crm_name || <span className="text-[rgba(11,22,36,0.40)]">—</span>}</td>
                      <td className="px-3 py-2.5 text-[rgba(11,22,36,0.78)]">{r.crm_email || "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.62)] border border-[rgba(15,23,42,0.10)] rounded px-1.5 py-0.5">
                          {r.integration_name || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[rgba(11,22,36,0.78)]">{r.external_name || "—"}</td>
                      <td className="px-3 py-2.5 text-[rgba(11,22,36,0.78)]">{r.external_email || "—"}</td>
                      <td className="px-3 py-2.5">
                        {r.external_user_id ? (
                          <code className="text-[11px] font-mono text-[rgba(11,22,36,0.78)] bg-[#F6F8FB] border border-[rgba(15,23,42,0.06)] rounded px-1.5 py-0.5">
                            {r.external_user_id}
                          </code>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2.5"><ConfidencePill score={r.confidence_score} /></td>
                      <td className="px-3 py-2.5"><StatusPill status={status} /></td>
                      <td className="px-3 py-2.5 text-[rgba(11,22,36,0.62)]">{fmtRel(r.updated_at)}</td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openDrawer(r)} title="Edit Mapping" className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#F6F8FB] text-[rgba(11,22,36,0.62)] hover:text-[#0B1624] transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => patchRow(r.id, { mapping_status: "mapped", confidence_score: Math.max(r.confidence_score || 0, 0.99) }).then((ok) => ok && toast.success("Match confirmed"))} title="Confirm Match" className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#F6F8FB] text-[rgba(11,22,36,0.62)] hover:text-[#16A34A] transition-colors">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => patchRow(r.id, { mapping_status: "conflict" }).then((ok) => ok && toast.message("Marked as conflict"))} title="Mark Conflict" className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#F6F8FB] text-[rgba(11,22,36,0.62)] hover:text-rose-600 transition-colors">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => patchRow(r.id, { mapping_status: "ignored" }).then((ok) => ok && toast.message("Mapping ignored"))} title="Ignore" className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#F6F8FB] text-[rgba(11,22,36,0.62)] hover:text-[#0B1624] transition-colors">
                            <EyeOff className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteRow(r.id)} title="Delete Mapping" className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#F6F8FB] text-[rgba(11,22,36,0.62)] hover:text-rose-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-white border-l border-[rgba(15,23,42,0.10)] p-0">
          {openRow && (
            <div className="flex flex-col h-full">
              <SheetHeader className="px-5 pt-5 pb-3 border-b border-[rgba(15,23,42,0.06)]">
                <SheetTitle className="text-[14px] font-semibold text-[#0B1624] inline-flex items-center gap-2">
                  <Users className="w-4 h-4 text-[rgba(11,22,36,0.62)]" />
                  Mapping Details
                </SheetTitle>
                <SheetDescription className="text-[11px] text-[rgba(11,22,36,0.62)]">
                  {openRow.integration_name || "Integration"} · {STATUS_LABEL[normalizeStatus(openRow.mapping_status)]}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* Confidence */}
                <div className="flex items-center justify-between bg-[#F6F8FB] border border-[rgba(15,23,42,0.06)] rounded-md px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">Match Confidence</div>
                  <ConfidencePill score={openRow.confidence_score} />
                </div>

                {/* CRM */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)] mb-2">CRM User</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[rgba(11,22,36,0.62)]">Name</label>
                      <Input value={draft.crm_name || ""} onChange={(e) => setDraft({ ...draft, crm_name: e.target.value })} className="h-8 text-[12px] mt-1" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[rgba(11,22,36,0.62)]">Email</label>
                      <Input value={draft.crm_email || ""} onChange={(e) => setDraft({ ...draft, crm_email: e.target.value })} className="h-8 text-[12px] mt-1" />
                    </div>
                  </div>
                </div>

                {/* External */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)] mb-2">External Platform User</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[rgba(11,22,36,0.62)]">Name</label>
                      <Input value={draft.external_name || ""} onChange={(e) => setDraft({ ...draft, external_name: e.target.value })} className="h-8 text-[12px] mt-1" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[rgba(11,22,36,0.62)]">Email</label>
                      <Input value={draft.external_email || ""} onChange={(e) => setDraft({ ...draft, external_email: e.target.value })} className="h-8 text-[12px] mt-1" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-[rgba(11,22,36,0.62)]">External User ID</label>
                      <Input value={draft.external_user_id || ""} onChange={(e) => setDraft({ ...draft, external_user_id: e.target.value })} className="h-8 text-[12px] font-mono mt-1" />
                    </div>
                  </div>
                </div>

                {/* Possible Duplicates */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)] mb-2">Possible Duplicate Matches</div>
                  {possibleDuplicates.length === 0 ? (
                    <div className="text-[12px] text-[rgba(11,22,36,0.48)] bg-[#F6F8FB] border border-[rgba(15,23,42,0.06)] rounded-md px-3 py-2">
                      No duplicates detected.
                    </div>
                  ) : (
                    <div className="border border-[rgba(15,23,42,0.06)] rounded-md divide-y divide-[rgba(15,23,42,0.06)]">
                      {possibleDuplicates.map((d) => (
                        <div key={d.id} className="px-3 py-2 text-[12px] flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="font-medium text-[#0B1624] truncate">{d.crm_name || d.external_name || "—"}</div>
                            <div className="text-[10px] text-[rgba(11,22,36,0.62)] truncate">{d.crm_email || d.external_email}</div>
                          </div>
                          <StatusPill status={normalizeStatus(d.mapping_status)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">Notes</label>
                  <Textarea
                    value={draft.notes || ""}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    className="text-[12px] mt-1 min-h-[80px]"
                    placeholder="Manual correction notes…"
                  />
                </div>
              </div>

              <div className="border-t border-[rgba(15,23,42,0.06)] px-5 py-3 flex items-center justify-between bg-white">
                <button onClick={() => setOpenRow(null)} className="text-[12px] px-3 py-1.5 rounded-md text-[rgba(11,22,36,0.62)] hover:text-[#0B1624]">
                  Cancel
                </button>
                <button onClick={saveDraft} className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md bg-[#0B1624] text-white hover:bg-[#1a2940] transition-colors">
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}
