import { useEffect, useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Activity, CheckCircle2, XCircle, AlertTriangle, Plug, Cpu, Wrench, RefreshCw,
  Loader2, Database, ListChecks, Clock, ShieldAlert, Eye, EyeOff,
} from "lucide-react";

type Status = "verified" | "configured" | "active" | "not_configured" | "failed" | "disabled";

interface ProviderRow {
  key: string; name: string; kind?: string; status: Status;
  default_model?: string | null; last_verified_at?: string | null;
  last_error?: string | null; description?: string | null;
}
interface ConnectionRow {
  key: string; name: string; kind: string; category?: string | null;
  status: Status; required_secrets?: string[] | null; description?: string | null;
  enables?: string[] | null; last_verified_at?: string | null;
}
interface ToolRow {
  key: string; name: string; description?: string | null;
  enabled: boolean; category?: string | null; is_read_only?: boolean | null;
  connection_key?: string | null;
}

interface Diag {
  threads: number; messages: number; tasks: number; pending: number;
  executions: number; failedExec: number; lastExec: string | null;
}

const STATUS_TONE: Record<Status, string> = {
  verified: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  active: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  configured: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  not_configured: "bg-muted text-muted-foreground border-border",
  failed: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  disabled: "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={`${STATUS_TONE[status]} text-[10px] uppercase tracking-wide font-semibold`}>
      {status.replace("_", " ")}
    </Badge>
  );
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export default function AdminHyperMCPSystemStatus() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [diag, setDiag] = useState<Diag | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setLoading(true);
    setRegistryError(null);
    const t0 = performance.now();

    // Registry
    const reg = await supabase.functions.invoke("ai-hub-registry", { body: { action: "list" } });
    if (reg.error) {
      setRegistryError(reg.error.message);
    } else {
      setProviders((reg.data?.providers ?? []) as ProviderRow[]);
      setConnections((reg.data?.connections ?? []) as ConnectionRow[]);
      setTools((reg.data?.tools ?? []) as ToolRow[]);
    }

    // Diagnostics — head counts on canonical tables (RLS-scoped)
    const [threadsR, msgR, tasksR, pendR, execR, failR, lastR] = await Promise.all([
      supabase.from("ai_command_threads").select("id", { count: "exact", head: true }),
      supabase.from("ai_command_messages").select("id", { count: "exact", head: true }),
      supabase.from("ai_hub_tasks").select("id", { count: "exact", head: true }),
      supabase.from("ai_hub_pending_actions").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
      supabase.from("ai_command_executions").select("id", { count: "exact", head: true }),
      supabase.from("ai_command_executions").select("id", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("ai_command_executions").select("created_at,status").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    setDiag({
      threads: threadsR.count ?? 0,
      messages: msgR.count ?? 0,
      tasks: tasksR.count ?? 0,
      pending: pendR.count ?? 0,
      executions: execR.count ?? 0,
      failedExec: failR.count ?? 0,
      lastExec: lastR.data?.created_at ?? null,
    });

    setLoading(false);
    const elapsed = Math.round(performance.now() - t0);
    if (refreshing) {
      toast({ title: "System status refreshed", description: `Loaded in ${elapsed} ms` });
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const verifyProvider = async (key: string) => {
    setVerifying(key);
    try {
      const { data, error } = await supabase.functions.invoke("ai-hub-registry", { body: { action: "verify", key } });
      if (error) throw error;
      toast({
        title: data?.ok ? `${key} verified` : `${key} failed verification`,
        description: data?.ok ? "Provider responded successfully" : (data?.error ?? "Unknown error"),
        variant: data?.ok ? "default" : "destructive",
      });
      await load();
    } catch (e: any) {
      toast({ title: "Verification error", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setVerifying(null);
    }
  };

  // ── Derived ─────────────────────────────────────────
  const summary = useMemo(() => {
    const provVerified = providers.filter((p) => p.status === "verified").length;
    const connVerified = connections.filter((c) => c.status === "verified" || c.status === "active").length;
    const connConfigured = connections.filter((c) => ["configured", "active", "verified"].includes(c.status)).length;
    const callableTools = tools.filter((t) => t.enabled).length;
    const failed = [
      ...providers.filter((p) => p.status === "failed"),
      ...connections.filter((c) => c.status === "failed"),
    ].length;

    // Connections that are configured but have no callable tool mapped
    const toolConnKeys = new Set(tools.filter((t) => t.enabled && t.connection_key).map((t) => t.connection_key!));
    const callableConn = new Set([...toolConnKeys]);
    const configuredNoTools = connections
      .filter((c) => ["configured", "active", "verified"].includes(c.status) && !callableConn.has(c.key));

    return { provVerified, connVerified, connConfigured, callableTools, failed, configuredNoTools };
  }, [providers, connections, tools]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = connections.filter((c) => {
      if (!showInactive && c.status === "not_configured") return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.key.toLowerCase().includes(q) || (c.category ?? "").toLowerCase().includes(q);
    });
    const map = new Map<string, ConnectionRow[]>();
    filtered.forEach((c) => {
      const cat = (c.category ?? "other").replace(/_/g, " ");
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [connections, search, showInactive]);

  const googlePlatforms = connections.filter((c) =>
    c.key.startsWith("google_") || c.key === "gsc" || c.key === "ga4"
  );

  // ── Render ──────────────────────────────────────────
  return (
    <HyperMCPShell breadcrumbs={[{ label: "System Status" }]}>
      <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#16A34A]" />
              System Status
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Truthful operating map of the AI Operations Hub. Distinguishes <b>configured</b> from <b>verified</b> from <b>callable</b>.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setRefreshing(true); load(); }} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span className="ml-1.5">Refresh</span>
          </Button>
        </div>

        {registryError && (
          <Card className="p-3 border-rose-500/40 bg-rose-500/5 text-xs text-rose-700">
            <AlertTriangle className="w-4 h-4 inline mr-1.5" />
            Registry edge function failed: {registryError}
          </Card>
        )}

        {/* Overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <SummaryCard icon={Cpu} label="Providers" value={`${summary.provVerified}/${providers.length}`} sub="verified" tone="good" />
          <SummaryCard icon={Plug} label="Connections" value={`${summary.connConfigured}/${connections.length}`} sub="configured" tone="neutral" />
          <SummaryCard icon={CheckCircle2} label="Conns Verified" value={String(summary.connVerified)} sub="actively healthy" tone="good" />
          <SummaryCard icon={Wrench} label="Callable Tools" value={String(summary.callableTools)} sub="exposed to AI loop" tone="good" />
          <SummaryCard icon={Database} label="AI Threads" value={String(diag?.threads ?? "—")} sub={`${diag?.messages ?? 0} messages`} tone="neutral" />
          <SummaryCard icon={ListChecks} label="Hub Tasks" value={String(diag?.tasks ?? "—")} sub={`${diag?.pending ?? 0} pending approval`} tone="neutral" />
          <SummaryCard icon={ShieldAlert} label="Broken / Failed" value={String(summary.failed + (diag?.failedExec ?? 0))} sub="across registry + runs" tone={summary.failed ? "bad" : "good"} />
        </div>

        {/* Providers */}
        <Section title="Providers" subtitle="LLM providers registered in the hub">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {providers.map((p) => (
              <Card key={p.key} className="p-3 border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm">{p.name}</div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">key: <code>{p.key}</code> · model: <code>{p.default_model ?? "—"}</code></div>
                    {p.last_verified_at && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">Last verified: {fmtDate(p.last_verified_at)}</div>
                    )}
                    {p.last_error && (
                      <div className="text-[11px] text-rose-600 mt-1 line-clamp-2">⚠ {p.last_error}</div>
                    )}
                  </div>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => verifyProvider(p.key)}
                    disabled={verifying === p.key}
                    className="h-7 text-[11px]"
                  >
                    {verifying === p.key ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* Google Platforms — explicit */}
        <Section title="Google Platforms" subtitle="Explicit status for every Google integration in the registry">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {googlePlatforms.length === 0 && (
              <div className="text-xs text-muted-foreground">No Google connections registered.</div>
            )}
            {googlePlatforms.map((c) => (
              <ConnectionCard key={c.key} c={c} toolCount={tools.filter((t) => t.enabled && t.connection_key === c.key).length} />
            ))}
          </div>
        </Section>

        {/* Callable Tools */}
        <Section
          title="AI-Callable Tools"
          subtitle="Tools currently exposed to the OpenAI/Lovable AI tool loop via ai-hub-tools / ai-command-execute"
        >
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tool</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Purpose</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Read/Write</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Backing</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Callable</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((t) => (
                  <tr key={t.key} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono font-semibold">{t.key}</td>
                    <td className="px-3 py-2 text-muted-foreground max-w-md">{t.description ?? t.name}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={t.is_read_only ? "bg-blue-500/10 text-blue-700" : "bg-amber-500/10 text-amber-700"}>
                        {t.is_read_only ? "read" : "write"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{t.connection_key ?? t.category ?? "built-in"}</td>
                    <td className="px-3 py-2">
                      {t.enabled
                        ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">yes</Badge>
                        : <Badge variant="outline" className="bg-muted">no</Badge>}
                    </td>
                  </tr>
                ))}
                {tools.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No tools registered.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Configured but not callable */}
        <Section
          title="Configured but Not Callable by AI"
          subtitle="These connections have credentials but no AI tool wired yet — the AI cannot actually use them"
        >
          {summary.configuredNoTools.length === 0 ? (
            <div className="text-xs text-muted-foreground">All configured connections have at least one callable tool mapped.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {summary.configuredNoTools.map((c) => (
                <Card key={c.key} className="p-3 border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{c.name}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{c.category} · <code>{c.key}</code></div>
                  <div className="text-[11px] text-amber-700 mt-1.5">Configured, but no callable AI functions are mapped yet.</div>
                </Card>
              ))}
            </div>
          )}
        </Section>

        {/* Connections (all) */}
        <Section
          title="All Connections / Integrations"
          subtitle={`${connections.length} total · grouped by category`}
          right={
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-44 text-xs"
              />
              <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => setShowInactive((v) => !v)}>
                {showInactive ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                {showInactive ? "All" : "Active only"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {grouped.map(([cat, items]) => (
              <div key={cat}>
                <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">{cat}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {items.map((c) => (
                    <ConnectionCard
                      key={c.key}
                      c={c}
                      toolCount={tools.filter((t) => t.enabled && t.connection_key === c.key).length}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Diagnostics */}
        <Section title="Task / History Diagnostics" subtitle="Verifies the canonical AI tables are returning rows under current RLS">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <Diagnostic label="ai_command_threads" value={diag?.threads} healthy={(diag?.threads ?? 0) > 0} />
            <Diagnostic label="ai_command_messages" value={diag?.messages} healthy={(diag?.messages ?? 0) > 0} />
            <Diagnostic label="ai_hub_tasks" value={diag?.tasks} healthy={(diag?.tasks ?? 0) > 0} />
            <Diagnostic label="ai_hub_pending_actions" value={diag?.pending} healthy={true} />
            <Diagnostic label="ai_command_executions" value={diag?.executions} healthy={(diag?.executions ?? 0) > 0} />
            <Diagnostic label="failed executions" value={diag?.failedExec} healthy={(diag?.failedExec ?? 0) === 0} invertHealth />
            <Card className="p-3 border-border col-span-2">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Last execution
              </div>
              <div className="text-sm font-semibold mt-1">{fmtDate(diag?.lastExec)}</div>
              <div className="text-[11px] text-muted-foreground">If this is stale or empty, the AI runtime hasn't been called recently.</div>
            </Card>
          </div>
        </Section>

        {/* Speed hints */}
        <Section title="Response Speed Notes" subtitle="What contributes to slow AI Hub responses today">
          <Card className="p-3 border-border text-xs text-muted-foreground space-y-1.5">
            <div>• Each AI request fans out: <code>ai-command-router</code> → <code>ai-command-execute</code> → tool loop. Each hop is a separate edge function cold-start.</div>
            <div>• Inspection tools (<code>list_*</code>, <code>system_summary</code>) re-query the registry each call — the model often calls 2–3 of them per turn.</div>
            <div>• Knowledge retrieval (<code>match_ai_command_knowledge</code>) runs an embedding query when KB context is requested.</div>
            <div>• Open browser devtools → Network → filter <code>functions/v1</code> to see real per-call duration during a chat.</div>
            <div>• To reduce hops: tighten the model's system prompt to avoid speculative tool fan-out, or pre-cache registry data on the client (already done with 15s TTL in the SDK).</div>
          </Card>
        </Section>
      </div>
    </HyperMCPShell>
  );
}

// ─────────────────────────────────────────────

function Section({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-end justify-between mb-2 gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub?: string; tone: "good" | "bad" | "warn" | "neutral" }) {
  const toneClass =
    tone === "good" ? "text-emerald-600" :
    tone === "bad" ? "text-rose-600" :
    tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <Card className="p-2.5 border-border">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-lg font-bold mt-0.5 ${toneClass}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function ConnectionCard({ c, toolCount }: { c: ConnectionRow; toolCount: number }) {
  return (
    <Card className="p-3 border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm">{c.name}</span>
            <StatusBadge status={c.status} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            <code>{c.key}</code> · {c.kind}
          </div>
          {(c.required_secrets ?? []).length > 0 && (
            <div className="text-[10px] text-muted-foreground mt-1">
              Secrets: {(c.required_secrets ?? []).join(", ")}
            </div>
          )}
          <div className="text-[10px] mt-1.5 flex items-center gap-2">
            <span className={toolCount > 0 ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
              {toolCount > 0 ? <CheckCircle2 className="w-3 h-3 inline mr-0.5" /> : <XCircle className="w-3 h-3 inline mr-0.5" />}
              {toolCount} AI tool{toolCount === 1 ? "" : "s"}
            </span>
            {c.last_verified_at && <span className="text-muted-foreground">· verified {fmtDate(c.last_verified_at)}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Diagnostic({ label, value, healthy, invertHealth }: { label: string; value?: number; healthy: boolean; invertHealth?: boolean }) {
  const ok = invertHealth ? healthy : healthy;
  return (
    <Card className="p-3 border-border">
      <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2 mt-0.5">
        <div className="text-lg font-bold">{value ?? "—"}</div>
        {ok
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
      </div>
    </Card>
  );
}
