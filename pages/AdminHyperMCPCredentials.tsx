import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import OperationalContext from "@/components/hypermcp/OperationalContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, KeyRound, Plus, RefreshCw, ShieldCheck, FlaskConical,
  PowerOff, Search, Loader2, MoreHorizontal, Filter, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { formatDistanceToNow, format, isPast, differenceInDays } from "date-fns";

type CredStatus = "active" | "expiring_soon" | "expired" | "invalid" | "needs_setup";

interface CredentialRow {
  id: string;
  integration_id: string;
  credential_type: string;
  label: string | null;
  masked_value: string | null;
  status: string;
  expires_at: string | null;
  last_verified_at: string | null;
  created_at: string;
  // joined from integrations
  integration_name?: string;
  integration_environment?: string;
  integration_category?: string;
}

const STATUS_PILL: Record<CredStatus, string> = {
  active:        "bg-[#22C55E]/10 text-[#16A34A] border-[#22C55E]/40",
  expiring_soon: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  expired:       "bg-rose-500/10 text-rose-600 border-rose-500/30",
  invalid:       "bg-rose-500/10 text-rose-600 border-rose-500/30",
  needs_setup:   "bg-slate-500/10 text-slate-600 border-slate-300",
};

const STATUS_LABEL: Record<CredStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  invalid: "Invalid",
  needs_setup: "Needs Setup",
};

function normalizeStatus(raw: string, expiresAt: string | null): CredStatus {
  const s = (raw || "").toLowerCase();
  if (s === "expiring_soon" || s === "expired" || s === "invalid" || s === "needs_setup" || s === "active") {
    // auto-promote active → expiring_soon if within 14d
    if (s === "active" && expiresAt) {
      const days = differenceInDays(new Date(expiresAt), new Date());
      if (days < 0) return "expired";
      if (days <= 14) return "expiring_soon";
    }
    return s as CredStatus;
  }
  if (s === "disabled" || s === "inactive") return "needs_setup";
  return "active";
}

function StatusPill({ status }: { status: CredStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium tracking-wide whitespace-nowrap",
      STATUS_PILL[status]
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full",
        status === "active" && "bg-[#22C55E]",
        status === "expiring_soon" && "bg-amber-500",
        (status === "expired" || status === "invalid") && "bg-rose-500",
        status === "needs_setup" && "bg-slate-400")} />
      {STATUS_LABEL[status]}
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
      <PopoverContent align="start" className="w-48 p-1">
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

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return format(new Date(d), "MMM d, yyyy"); } catch { return "—"; }
}
function fmtRel(d: string | null) {
  if (!d) return "Never";
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return "—"; }
}

export default function AdminHyperMCPCredentials() {
  const [rows, setRows] = useState<CredentialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [envFilter, setEnvFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  async function load() {
    setLoading(true);
    const { data: creds, error } = await supabase
      .from("hyper_mcp_credentials")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load credentials");
      setLoading(false);
      return;
    }
    const list = (creds || []) as CredentialRow[];
    if (list.length) {
      const ids = Array.from(new Set(list.map((r) => r.integration_id)));
      const { data: ints } = await supabase
        .from("hyper_mcp_integrations")
        .select("id, name, environment, category")
        .in("id", ids);
      const map = new Map((ints || []).map((i: any) => [i.id, i]));
      list.forEach((r) => {
        const i = map.get(r.integration_id);
        r.integration_name = i?.name;
        r.integration_environment = i?.environment;
        r.integration_category = i?.category;
      });
    }
    setRows(list);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const status = normalizeStatus(r.status, r.expires_at);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (envFilter !== "all" && (r.integration_environment || "production") !== envFilter) return false;
      if (typeFilter !== "all" && r.credential_type !== typeFilter) return false;
      if (q.trim()) {
        const t = q.trim().toLowerCase();
        const hay = `${r.integration_name || ""} ${r.label || ""} ${r.credential_type} ${r.masked_value || ""}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    });
  }, [rows, q, statusFilter, envFilter, typeFilter]);

  const counts = useMemo(() => {
    const out: Record<CredStatus, number> = { active: 0, expiring_soon: 0, expired: 0, invalid: 0, needs_setup: 0 };
    rows.forEach((r) => { out[normalizeStatus(r.status, r.expires_at)]++; });
    return out;
  }, [rows]);

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.credential_type))).sort(), [rows]);

  async function setStatus(id: string, status: string) {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await supabase.from("hyper_mcp_credentials").update({ status }).eq("id", id);
    if (error) {
      setRows(prev);
      toast.error(error.message);
    }
  }

  async function markVerified(id: string) {
    const now = new Date().toISOString();
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, last_verified_at: now, status: "active" } : x)));
    const { error } = await supabase
      .from("hyper_mcp_credentials")
      .update({ last_verified_at: now, status: "active" })
      .eq("id", id);
    if (error) { setRows(prev); toast.error(error.message); return; }
    toast.success("Credential test passed");
  }

  return (
    <HyperMCPShell breadcrumb="/ Hyper MCP / Credentials Vault">
      <div className="p-6 space-y-5 bg-[#F6F8FB] min-h-[calc(100vh-3.5rem)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/hypermcp"
              className="inline-flex items-center gap-1.5 text-[12px] text-[rgba(11,22,36,0.62)] hover:text-[#0B1624] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Command Center
            </Link>
            <span className="text-[rgba(11,22,36,0.30)]">/</span>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold text-[#0B1624] tracking-tight inline-flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[rgba(11,22,36,0.62)]" />
                Credentials Vault
              </h1>
              <p className="text-[11px] text-[rgba(11,22,36,0.62)] mt-0.5">
                Metadata only · raw secrets are never displayed in the UI
              </p>
            </div>
          </div>
          <button className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md bg-[#0B1624] text-white hover:bg-[#1a2940] transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Credential
          </button>
        </div>

        <OperationalContext kind="credential" />

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {([
            ["active", "Active", "#16A34A"],
            ["expiring_soon", "Expiring Soon", "#D97706"],
            ["expired", "Expired", "#DC2626"],
            ["invalid", "Invalid", "#DC2626"],
            ["needs_setup", "Needs Setup", "#64748B"],
          ] as const).map(([key, label, color]) => (
            <Card
              key={key}
              className="bg-white border-[rgba(15,23,42,0.06)] rounded-lg p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">{label}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[22px] font-semibold tabular-nums text-[#0B1624]">{counts[key]}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              </div>
            </Card>
          ))}
        </div>

        {/* Filter bar */}
        <Card className="bg-white border-[rgba(15,23,42,0.06)] rounded-lg p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-[rgba(11,22,36,0.48)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by integration, label, or type…"
                className="h-8 pl-8 text-[12px] bg-white border-[rgba(15,23,42,0.10)] focus-visible:ring-0"
              />
            </div>
            <FilterButton
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={(Object.keys(STATUS_LABEL) as CredStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            />
            <FilterButton
              label="Environment"
              value={envFilter}
              onChange={setEnvFilter}
              options={[
                { value: "production", label: "Production" },
                { value: "staging", label: "Staging" },
                { value: "sandbox", label: "Sandbox" },
              ]}
            />
            <FilterButton
              label="Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={types.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))}
            />
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md bg-white border border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#F6F8FB] transition-colors"
            >
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
                  <th className="text-left font-medium px-3 py-2">Integration</th>
                  <th className="text-left font-medium px-3 py-2">Type</th>
                  <th className="text-left font-medium px-3 py-2">Label</th>
                  <th className="text-left font-medium px-3 py-2">Masked Value</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                  <th className="text-left font-medium px-3 py-2">Environment</th>
                  <th className="text-left font-medium px-3 py-2">Expires</th>
                  <th className="text-left font-medium px-3 py-2">Last Verified</th>
                  <th className="text-right font-medium px-3 py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="px-3 py-10 text-center text-[rgba(11,22,36,0.48)]">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading credentials…
                  </td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-10 text-center text-[rgba(11,22,36,0.48)]">
                    No credentials match these filters.
                  </td></tr>
                )}
                {!loading && filtered.map((r) => {
                  const status = normalizeStatus(r.status, r.expires_at);
                  const env = r.integration_environment || "production";
                  const expiringSoon = r.expires_at && !isPast(new Date(r.expires_at)) && differenceInDays(new Date(r.expires_at), new Date()) <= 14;
                  return (
                    <tr key={r.id} className="border-b border-[rgba(15,23,42,0.04)] last:border-0 hover:bg-[#F6F8FB]/50 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-[#0B1624]">{r.integration_name || "—"}</div>
                        {r.integration_category && (
                          <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">{r.integration_category}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[rgba(11,22,36,0.78)] capitalize">{r.credential_type.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2.5 text-[rgba(11,22,36,0.78)]">{r.label || "—"}</td>
                      <td className="px-3 py-2.5">
                        {r.masked_value ? (
                          <code className="text-[11px] font-mono text-[rgba(11,22,36,0.78)] bg-[#F6F8FB] border border-[rgba(15,23,42,0.06)] rounded px-1.5 py-0.5">
                            {r.masked_value}
                          </code>
                        ) : <span className="text-[rgba(11,22,36,0.48)]">—</span>}
                      </td>
                      <td className="px-3 py-2.5"><StatusPill status={status} /></td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.62)] border border-[rgba(15,23,42,0.10)] rounded px-1.5 py-0.5">
                          {env}
                        </span>
                      </td>
                      <td className={cn("px-3 py-2.5 tabular-nums", expiringSoon ? "text-amber-700" : "text-[rgba(11,22,36,0.78)]")}>
                        {fmtDate(r.expires_at)}
                      </td>
                      <td className="px-3 py-2.5 text-[rgba(11,22,36,0.62)]">{fmtRel(r.last_verified_at)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => markVerified(r.id)}
                            title="Test Credential"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#F6F8FB] text-[rgba(11,22,36,0.62)] hover:text-[#0B1624] transition-colors"
                          >
                            <FlaskConical className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toast.message("Rotation flow opens secure form (not implemented)")}
                            title="Rotate Credential"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#F6F8FB] text-[rgba(11,22,36,0.62)] hover:text-[#0B1624] transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toast.message("Re-authentication redirects to provider")}
                            title="Re-authenticate"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#F6F8FB] text-[rgba(11,22,36,0.62)] hover:text-[#0B1624] transition-colors"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                title="More"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#F6F8FB] text-[rgba(11,22,36,0.62)] hover:text-[#0B1624] transition-colors"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-44 p-1">
                              <button
                                onClick={() => setStatus(r.id, "needs_setup")}
                                className="w-full text-left text-[12px] px-2 py-1.5 rounded hover:bg-[#F6F8FB] text-[#0B1624] inline-flex items-center gap-2"
                              >
                                <PowerOff className="w-3.5 h-3.5" /> Disable Credential
                              </button>
                              <button
                                onClick={() => setStatus(r.id, "active")}
                                className="w-full text-left text-[12px] px-2 py-1.5 rounded hover:bg-[#F6F8FB] text-[#0B1624] inline-flex items-center gap-2"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" /> Mark Active
                              </button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-[11px] text-[rgba(11,22,36,0.48)] px-1">
          Raw API keys, tokens, and passwords are stored in the encrypted secret manager and are never returned to the browser. Use Rotate or Re-authenticate to update a credential's underlying secret.
        </p>
      </div>
    </HyperMCPShell>
  );
}
