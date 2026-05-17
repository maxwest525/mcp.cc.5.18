import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, Activity, Plug, Webhook, Zap, CheckCircle2, XCircle, Clock,
  Cog, FlaskConical, ScrollText, AlertTriangle, RefreshCw, UserX, Sparkles,
  Cpu, Gauge, TrendingUp, Users, UserCheck, AlertOctagon, Loader2, PauseCircle,
  PlayCircle, RotateCcw, ChevronRight, Stethoscope, FileDown, ShieldCheck, Siren,
  KeyRound, GitBranch, ArrowRight,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { BrandLogo, brandColor } from "@/components/hyper-mcp/BrandLogo";
import { IntegrationDetailDrawer, type IntegrationDetail } from "@/components/hyper-mcp/IntegrationDetailDrawer";
import { useHyperMCPIntegrations, relativeTime, type HyperMCPIntegrationRow } from "@/hooks/useHyperMCP";
import Recommendations from "@/components/hypermcp/Recommendations";
import RelatedItems from "@/components/hypermcp/RelatedItems";
import { getRecommendations, getRelatedFor } from "@/components/hypermcp/relationships";

type Status = "connected" | "disconnected" | "needs_setup";
type Health = "healthy" | "degraded" | "down" | "—";

interface SystemCard {
  name: string;
  category: string;
  status: Status;
  lastSync: string;
  health: Health;
  webhooks: number;
  latencyMs: number | null;
}

function normalizeStatus(s: string): Status {
  if (s === "connected") return "connected";
  if (s === "needs_setup") return "needs_setup";
  return "disconnected";
}
function normalizeHealth(h: string): Health {
  if (h === "healthy" || h === "degraded" || h === "down") return h;
  return "—";
}
function prettyCategory(c: string): string {
  return c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function rowToCard(row: HyperMCPIntegrationRow): SystemCard {
  return {
    name: row.name,
    category: prettyCategory(row.category),
    status: normalizeStatus(row.status),
    lastSync: relativeTime(row.last_sync_at),
    health: normalizeHealth(row.health_status),
    webhooks: 0,
    latencyMs: row.api_latency_ms,
  };
}

const FALLBACK_SYSTEMS: SystemCard[] = [
  { name: "HyperFX",       category: "Internal AI",    status: "connected",   lastSync: "2 min ago",  health: "healthy",  webhooks: 4, latencyMs: 88 },
  { name: "Lovable",       category: "Platform",       status: "connected",   lastSync: "5 min ago",  health: "healthy",  webhooks: 2, latencyMs: 124 },
  { name: "Granot CRM",    category: "Brokerage",      status: "connected",   lastSync: "12 min ago", health: "healthy",  webhooks: 6, latencyMs: 211 },
  { name: "Zapier",        category: "Automation",     status: "needs_setup", lastSync: "—",          health: "—",        webhooks: 0, latencyMs: null },
  { name: "SearchAtlas",   category: "SEO",            status: "connected",   lastSync: "1 hr ago",   health: "degraded", webhooks: 1, latencyMs: 482 },
  { name: "Google Ads",    category: "Advertising",    status: "connected",   lastSync: "8 min ago",  health: "healthy",  webhooks: 3, latencyMs: 167 },
  { name: "Meta Ads",      category: "Advertising",    status: "disconnected",lastSync: "3 d ago",    health: "down",     webhooks: 0, latencyMs: null },
  { name: "TikTok Ads",    category: "Advertising",    status: "needs_setup", lastSync: "—",          health: "—",        webhooks: 0, latencyMs: null },
  { name: "Microsoft Ads", category: "Advertising",    status: "needs_setup", lastSync: "—",          health: "—",        webhooks: 0, latencyMs: null },
  { name: "RingCentral",   category: "Telephony",      status: "connected",   lastSync: "3 min ago",  health: "healthy",  webhooks: 5, latencyMs: 142 },
  { name: "Convoso",       category: "Dialer",         status: "connected",   lastSync: "1 min ago",  health: "healthy",  webhooks: 4, latencyMs: 96 },
  { name: "Supabase",      category: "Infrastructure", status: "connected",   lastSync: "Live",       health: "healthy",  webhooks: 8, latencyMs: 41 },
  { name: "GitHub",        category: "DevOps",         status: "connected",   lastSync: "22 min ago", health: "healthy",  webhooks: 2, latencyMs: 188 },
  { name: "Vercel",        category: "Infrastructure", status: "disconnected",lastSync: "—",          health: "down",     webhooks: 0, latencyMs: null },
  { name: "Twilio",        category: "Messaging",      status: "connected",   lastSync: "Just now",   health: "healthy",  webhooks: 3, latencyMs: 109 },
  { name: "Gmail",         category: "Email",          status: "connected",   lastSync: "4 min ago",  health: "healthy",  webhooks: 1, latencyMs: 154 },
  { name: "Stripe",        category: "Payments",       status: "connected",   lastSync: "9 min ago",  health: "healthy",  webhooks: 4, latencyMs: 132 },
  { name: "OpenAI",        category: "AI",             status: "connected",   lastSync: "Live",       health: "healthy",  webhooks: 2, latencyMs: 312 },
];

function buildStats(systems: SystemCard[]) {
  const total = systems.length;
  const active = systems.filter((s) => s.status === "connected").length;
  const failed = systems.filter((s) => s.status === "disconnected" || s.health === "down").length;
  const latencies = systems.map((s) => s.latencyMs).filter((n): n is number => n != null);
  const avgLatency = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;
  return [
    { label: "Total Connections",  value: String(total),       icon: Plug,         tone: "neutral" },
    { label: "Active Systems",     value: String(active),      icon: CheckCircle2, tone: "good" },
    { label: "Failed Systems",     value: String(failed),      icon: XCircle,      tone: "bad" },
    { label: "Running Automations",value: "27",                icon: Zap,          tone: "good" },
    { label: "Active Webhooks",    value: "38",                icon: Webhook,      tone: "neutral" },
    { label: "Queue Errors",       value: "4",                 icon: AlertOctagon, tone: "warn" },
    { label: "Sync Success",       value: "99.2%",             icon: TrendingUp,   tone: "good" },
    { label: "API Latency",        value: `${avgLatency} ms`,  icon: Gauge,        tone: "neutral" },
  ] as const;
}

const ACTIVITY = [
  { icon: Webhook,       text: "Webhook received · RingCentral · call.completed",        time: "12s ago",  tone: "good" },
  { icon: RefreshCw,     text: "Sync completed · Granot CRM (412 records)",              time: "3m ago",   tone: "good" },
  { icon: AlertTriangle, text: "Authentication expired · Meta Ads OAuth token",          time: "14m ago",  tone: "bad" },
  { icon: Sparkles,      text: "Automation triggered · Lead → SMS welcome sequence",     time: "22m ago",  tone: "good" },
  { icon: RotateCcw,     text: "Queue retry · Convoso lead push (attempt 2/3)",          time: "31m ago",  tone: "warn" },
  { icon: UserX,         text: "Mapping issue detected · 2 unmatched agent IDs",         time: "38m ago",  tone: "warn" },
  { icon: Webhook,       text: "Webhook received · Stripe · invoice.paid",               time: "1h ago",   tone: "good" },
];

interface QueueJob {
  id: string;
  workflow: string;
  system: string;
  state: "pending" | "running" | "failed";
  duration: string;
}

const QUEUE: QueueJob[] = [
  { id: "JOB-8821", workflow: "Lead → CRM enrichment",       system: "Granot CRM",  state: "running", duration: "00:02" },
  { id: "JOB-8820", workflow: "Call recording transcription", system: "Convoso",     state: "running", duration: "00:14" },
  { id: "JOB-8819", workflow: "Daily SEO snapshot",           system: "SearchAtlas", state: "pending", duration: "—" },
  { id: "JOB-8818", workflow: "Ad spend reconciliation",      system: "Google Ads",  state: "pending", duration: "—" },
  { id: "JOB-8817", workflow: "Token refresh",                system: "Meta Ads",    state: "failed",  duration: "00:04" },
  { id: "JOB-8816", workflow: "Inventory media upload",       system: "Supabase",    state: "failed",  duration: "00:11" },
];

const QUEUE_STATS = [
  { label: "Pending",  value: 12, tone: "warn" as const, icon: Clock },
  { label: "Running",  value: 3,  tone: "good" as const, icon: PlayCircle },
  { label: "Failed",   value: 4,  tone: "bad"  as const, icon: XCircle },
  { label: "Retrying", value: 2,  tone: "warn" as const, icon: RotateCcw },
];

const MAPPING_STATS = [
  { label: "Mapped Users",      value: 142, icon: UserCheck,    tone: "good"    as const },
  { label: "Unmapped",          value: 8,   icon: Users,        tone: "warn"    as const },
  { label: "Duplicate Conflicts", value: 3, icon: AlertOctagon, tone: "bad"     as const },
  { label: "Manual Review",     value: 5,   icon: AlertTriangle,tone: "warn"    as const },
];

const UNMAPPED_SAMPLE = [
  { external: "convoso:agent_4421", system: "Convoso",    issue: "No internal match" },
  { external: "ringc:user_8812",    system: "RingCentral", issue: "Duplicate email" },
  { external: "google:cust_91x4",   system: "Google Ads",  issue: "Pending review" },
  { external: "granot:user_771",    system: "Granot CRM",  issue: "Role conflict" },
];

const statusLabel: Record<Status, string> = {
  connected: "Connected",
  disconnected: "Disconnected",
  needs_setup: "Needs Setup",
};

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    connected: "bg-[#22C55E]/10 text-[#16A34A] border-[#22C55E]/40",
    disconnected: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    needs_setup: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium tracking-wide whitespace-nowrap", map[status])}>
      <span className={cn("w-1.5 h-1.5 rounded-full",
        status === "connected" && "bg-[#22C55E] ",
        status === "disconnected" && "bg-rose-400",
        status === "needs_setup" && "bg-amber-400")} />
      {statusLabel[status]}
    </span>
  );
}

function HealthDot({ health }: { health: Health }) {
  const map = {
    healthy: "bg-[#22C55E]",
    degraded: "bg-amber-400",
    down: "bg-rose-400",
    "—": "bg-zinc-600",
  } as const;
  const label = { healthy: "Healthy", degraded: "Degraded", down: "Down", "—": "Unknown" }[health];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[rgba(11,22,36,0.62)]">
      <span className={cn("w-1.5 h-1.5 rounded-full", map[health], health === "healthy" && "")} />
      {label}
    </span>
  );
}

function toneText(tone: string) {
  return tone === "good" ? "text-[#16A34A]"
    : tone === "bad" ? "text-rose-400"
    : tone === "warn" ? "text-amber-400"
    : "text-[rgba(11,22,36,0.78)]";
}

function QueueStateBadge({ state }: { state: QueueJob["state"] }) {
  if (state === "running") return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#16A34A]">
      <Loader2 className="w-3 h-3 animate-spin" /> Running
    </span>
  );
  if (state === "pending") return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-amber-400">
      <PauseCircle className="w-3 h-3" /> Pending
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-rose-400">
      <XCircle className="w-3 h-3" /> Failed
    </span>
  );
}

export default function AdminHyperMCP() {
  const [active, setActive] = useState<IntegrationDetail | null>(null);
  const { data: integrationRows, loading, error } = useHyperMCPIntegrations();
  const systems = useMemo<SystemCard[]>(
    () => (integrationRows.length ? integrationRows.map(rowToCard) : FALLBACK_SYSTEMS),
    [integrationRows],
  );
  const stats = useMemo(() => buildStats(systems), [systems]);
  return (
    <HyperMCPShell breadcrumb="Hyper MCP">
      <div className="-m-3 sm:-m-6 min-h-[calc(100vh-3rem)] bg-[#F6F8FB] text-[#0B1624]">
        {/* ambient glow */}
        <div
          className="relative"
          
        >
          <div className="max-w-[1500px] mx-auto p-4 sm:p-6 space-y-6">

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[rgba(15,23,42,0.06)]">
              <div className="flex items-start gap-3">
                <Cpu className="w-7 h-7 text-[#16A34A] shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-[#0B1624]">Hyper MCP</h1>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#16A34A] bg-[#22C55E]/10 border border-[#22C55E]/40 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" /> LIVE
                    </span>
                  </div>
                  <p className="text-sm text-[rgba(11,22,36,0.62)] mt-0.5 max-w-2xl">
                    Centralized automation, integrations, and workflow orchestration.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-transparent border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#EEF2F7] hover:text-[#0B1624]">
                      <Stethoscope className="w-4 h-4 mr-1.5" /> Diagnostics
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">Operational checks</DropdownMenuLabel>
                    <DropdownMenuItem><Activity className="w-4 h-4 mr-2" /> Run Health Check</DropdownMenuItem>
                    <DropdownMenuItem><RefreshCw className="w-4 h-4 mr-2" /> Refresh Systems</DropdownMenuItem>
                    <DropdownMenuItem><FileDown className="w-4 h-4 mr-2" /> Export Status Report</DropdownMenuItem>
                    <DropdownMenuItem><ShieldCheck className="w-4 h-4 mr-2" /> Validate Integrations</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/hypermcp/incident-response"><Siren className="w-4 h-4 mr-2" /> View Active Incidents</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" className="bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium ">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Connection
                </Button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <Card key={s.label} className="bg-white border-[rgba(15,23,42,0.06)] rounded-xl p-4 hover:border-[rgba(15,23,42,0.10)] transition-colors shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">{s.label}</span>
                      <Icon className={cn("w-4 h-4", toneText(s.tone))} />
                    </div>
                    <div className="mt-2 text-xl font-semibold text-[#0B1624] tabular-nums">{s.value}</div>
                  </Card>
                );
              })}
            </div>


            {/* Recommended Actions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-[#0B1624] tracking-tight">Recommended Actions</h2>
                  <p className="text-[11px] text-[rgba(11,22,36,0.48)] mt-0.5">Items that need operator attention</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {[
                  { icon: Plug,         tone: "warn", title: "3 integrations require review", sub: "Auth or mapping issues",  href: "/hypermcp" },
                  { icon: Zap,          tone: "bad",  title: "2 workflows failing validation", sub: "Last run produced errors", href: "/hypermcp/automation-flows" },
                  { icon: ShieldCheck,  tone: "warn", title: "Vendor risk elevated for 1 source", sub: "Review vendor registry",  href: "/hypermcp/vendor-registry" },
                  { icon: KeyRound,     tone: "warn", title: "Credentials expiring in 5 days", sub: "Rotate before expiry",      href: "/hypermcp/credentials" },
                  { icon: AlertOctagon, tone: "bad",  title: "Queue backlog increasing",        sub: "Pending jobs above threshold", href: "/hypermcp/automation-flows" },
                ].map((r) => {
                  const Icon = r.icon;
                  return (
                    <Link
                      key={r.title}
                      to={r.href}
                      className="group bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-3.5 hover:border-[rgba(15,23,42,0.12)] hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.10)] transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Icon className={cn("w-4 h-4 mt-0.5", toneText(r.tone))} />
                        <ArrowRight className="w-3.5 h-3.5 text-[rgba(11,22,36,0.32)] group-hover:text-[#0B1624] transition-colors" />
                      </div>
                      <div className="mt-2 text-[12.5px] font-medium text-[#0B1624] leading-snug">{r.title}</div>
                      <div className="mt-1 text-[11px] text-[rgba(11,22,36,0.55)]">{r.sub}</div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Operational context — recommendations + cross-links + recent activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <Recommendations items={getRecommendations("integration")} />
                {/* Recent Activity */}
                <Card className="bg-white border-[rgba(15,23,42,0.06)] rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="px-4 py-3 border-b border-[rgba(15,23,42,0.06)] flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0B1624] tracking-tight">Recent Activity</h3>
                      <p className="text-[11px] text-[rgba(11,22,36,0.48)] mt-0.5">Operational feed across HyperMCP</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">Live</span>
                  </div>
                  <div className="divide-y divide-[rgba(15,23,42,0.05)]">
                    {[
                      { icon: GitBranch,     text: "Deployment completed · marketing-site v1.42",        time: "2m ago",  tone: "good", href: "/hypermcp/deployment-control" },
                      { icon: XCircle,       text: "Workflow failed · Lead → CRM enrichment",           time: "9m ago",  tone: "bad",  href: "/hypermcp/automation-flows" },
                      { icon: CheckCircle2,  text: "Approval granted · Convoso credential rotation",     time: "21m ago", tone: "good", href: "/hypermcp/credentials" },
                      { icon: Siren,         text: "Incident opened · Meta Ads OAuth expired",          time: "34m ago", tone: "bad",  href: "/hypermcp/incident-response" },
                      { icon: KeyRound,      text: "Credential updated · Stripe webhook secret",        time: "1h ago",  tone: "warn", href: "/hypermcp/credentials" },
                      { icon: Sparkles,      text: "AI execution failed · summarize-call (timeout)",    time: "2h ago",  tone: "bad",  href: "/hypermcp/automation-flows" },
                    ].map((a, i) => {
                      const Icon = a.icon;
                      return (
                        <Link key={i} to={a.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F6F8FB] transition-colors">
                          <Icon className={cn("w-3.5 h-3.5 shrink-0", toneText(a.tone))} />
                          <span className="text-[12.5px] text-[#0B1624] flex-1 truncate">{a.text}</span>
                          <span className="text-[11px] text-[rgba(11,22,36,0.48)] tabular-nums">{a.time}</span>
                        </Link>
                      );
                    })}
                  </div>
                </Card>
              </div>
              <RelatedItems
                title="Connected Across HyperMCP"
                subtitle="What this workspace touches"
                items={getRelatedFor("integration")}
              />
            </div>

            {/* Integrations */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-[#0B1624] tracking-tight">Integrations</h2>
                  <p className="text-[11px] text-[rgba(11,22,36,0.48)] mt-0.5">External platform connections and API tools</p>
                </div>
                <span className="text-[11px] text-[rgba(11,22,36,0.48)] inline-flex items-center gap-2">
                  {loading && <Loader2 className="w-3 h-3 animate-spin text-[rgba(11,22,36,0.48)]" />}
                  {error && <span className="text-rose-500">Live data unavailable — showing cached</span>}
                  {systems.length} systems
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {systems.map((sys) => {
                  const c = brandColor(sys.name);
                  const connected = sys.status === "connected";
                  const latencyTone =
                    sys.latencyMs == null ? "text-[rgba(11,22,36,0.48)] bg-[#EEF2F7] border-[rgba(15,23,42,0.10)]"
                    : sys.latencyMs < 150 ? "text-[#16A34A] bg-[#22C55E]/10 border-[#22C55E]/30"
                    : sys.latencyMs < 300 ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    : "text-rose-400 bg-rose-500/10 border-rose-500/20";
                  return (
                    <Card
                      key={sys.name}
                      onClick={() => setActive(sys)}
                      className="group relative bg-white border-[rgba(15,23,42,0.06)] rounded-xl p-4 cursor-pointer transition-all duration-300 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.10)] hover:-translate-y-0.5 hover:border-[rgba(15,23,42,0.10)]"
                      style={connected ? {
                        boxShadow: `0 1px 2px rgba(15,23,42,0.05), 0 0 0 1px ${c}1F`,
                      } : undefined}
                    >
                      {/* connection indicator */}
                      <span className="absolute top-3 right-3 flex items-center gap-1">
                        {connected && (
                          <span className="relative flex w-1.5 h-1.5">
                            <span className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping" style={{ backgroundColor: c }} />
                            <span className="relative inline-flex w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c, boxShadow: `0 0 8px ${c}` }} />
                          </span>
                        )}
                      </span>

                      <div className="flex items-start gap-3 pr-4">
                        <BrandLogo name={sys.name} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[#0B1624] truncate leading-tight">{sys.name}</div>
                          <div className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)] mt-0.5">{sys.category}</div>
                          <div className="mt-1.5"><StatusPill status={sys.status} /></div>
                        </div>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between text-[11px]">
                        <div className="inline-flex items-center gap-1.5 text-[rgba(11,22,36,0.62)]">
                          <Clock className="w-3 h-3 text-[rgba(11,22,36,0.48)]" />
                          <span className="truncate">{sys.lastSync}</span>
                        </div>
                        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium tabular-nums", latencyTone)}>
                          <Gauge className="w-2.5 h-2.5" />
                          {sys.latencyMs != null ? `${sys.latencyMs} ms` : "—"}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <HealthDot health={sys.health} />
                        <span className="inline-flex items-center gap-1 text-[rgba(11,22,36,0.62)]">
                          <Webhook className="w-3 h-3 text-[rgba(11,22,36,0.48)]" />
                          <span className="tabular-nums">{sys.webhooks}</span>
                          <span className="text-[rgba(11,22,36,0.35)]">hooks</span>
                        </span>
                      </div>

                      {/* hover-revealed actions */}
                      <div className="mt-3 grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-out">
                        <div className="overflow-hidden">
                          <div className="pt-3 border-t border-[rgba(15,23,42,0.06)] flex items-center gap-1.5">
                            <button className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-md bg-[#EEF2F7] hover:bg-[#E6EBF2] text-[#0B1624] transition-colors">
                              <Cog className="w-3 h-3" /> Configure
                            </button>
                            <button className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-md bg-[#EEF2F7] hover:bg-[#E6EBF2] text-[#0B1624] transition-colors">
                              <FlaskConical className="w-3 h-3" /> Test
                            </button>
                            <button className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-md bg-[#EEF2F7] hover:bg-[#E6EBF2] text-[#0B1624] transition-colors">
                              <ScrollText className="w-3 h-3" /> Logs
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Activity + Automation Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Live Activity */}
              <Card className="bg-white border-[rgba(15,23,42,0.06)] rounded-xl overflow-hidden lg:col-span-1">
                <div className="px-4 py-3 border-b border-[rgba(15,23,42,0.06)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-60 animate-ping" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-[#22C55E]" />
                    </span>
                    <h2 className="text-sm font-semibold text-[#0B1624] tracking-tight">Live Activity</h2>
                  </div>
                  <button className="text-[11px] text-[rgba(11,22,36,0.62)] hover:text-[#16A34A] transition-colors">View all</button>
                </div>
                <div className="divide-y divide-[rgba(15,23,42,0.06)] max-h-[420px] overflow-y-auto">
                  {ACTIVITY.map((a, i) => {
                    const Icon = a.icon;
                    const tone = a.tone === "good" ? "text-[#16A34A]"
                      : a.tone === "bad" ? "text-rose-500"
                      : "text-amber-500";
                    return (
                      <div key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-[#F6F8FB]">
                        <Icon className={cn("w-4 h-4 shrink-0", tone)} />
                        <div className="flex-1 min-w-0 text-[12px] text-[#0B1624] truncate">{a.text}</div>
                        <div className="text-[10px] text-[rgba(11,22,36,0.48)] shrink-0 tabular-nums">{a.time}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Automation Queue */}
              <Card className="bg-white border-[rgba(15,23,42,0.06)] rounded-xl overflow-hidden lg:col-span-2">
                <div className="px-4 py-3 border-b border-[rgba(15,23,42,0.06)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#16A34A]" />
                    <h2 className="text-sm font-semibold text-[#0B1624] tracking-tight">Automation Queue</h2>
                  </div>
                  <button className="text-[11px] text-[rgba(11,22,36,0.62)] hover:text-[#16A34A] transition-colors inline-flex items-center gap-1">
                    Open queue <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-px bg-[#EEF2F7]">
                  {QUEUE_STATS.map((q) => {
                    const Icon = q.icon;
                    return (
                      <div key={q.label} className="bg-white px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">{q.label}</span>
                          <Icon className={cn("w-3.5 h-3.5", toneText(q.tone))} />
                        </div>
                        <div className="text-lg font-semibold text-[#0B1624] tabular-nums mt-1">{q.value}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="divide-y divide-[rgba(15,23,42,0.06)]">
                  {QUEUE.map((j) => (
                    <div key={j.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-[#F6F8FB]">
                      <code className="text-[10px] text-[rgba(11,22,36,0.48)] tabular-nums shrink-0">{j.id}</code>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] text-[#0B1624] truncate">{j.workflow}</div>
                        <div className="text-[10px] text-[rgba(11,22,36,0.48)] truncate">{j.system}</div>
                      </div>
                      <div className="text-[10px] text-[rgba(11,22,36,0.62)] tabular-nums shrink-0 w-12 text-right">{j.duration}</div>
                      <div className="w-20 shrink-0"><QueueStateBadge state={j.state} /></div>
                      <button
                        className={cn(
                          "shrink-0 inline-flex items-center justify-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors",
                          j.state === "failed"
                            ? "bg-[#22C55E]/10 text-[#16A34A] hover:bg-[#22C55E]/15 border border-[#22C55E]/40"
                            : "bg-[#EEF2F7] text-[rgba(11,22,36,0.62)] hover:bg-[#E6EBF2]"
                        )}
                      >
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* User Mapping */}
            <Card className="bg-white border-[rgba(15,23,42,0.06)] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[rgba(15,23,42,0.06)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#16A34A]" />
                  <h2 className="text-sm font-semibold text-[#0B1624] tracking-tight">User Mapping Status</h2>
                </div>
                <button className="text-[11px] text-[rgba(11,22,36,0.62)] hover:text-[#16A34A] transition-colors inline-flex items-center gap-1">
                  Manage mappings <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3">
                <div className="grid grid-cols-2 gap-px bg-[#EEF2F7] lg:col-span-1 border-r border-[rgba(15,23,42,0.06)]">
                  {MAPPING_STATS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <div key={m.label} className="bg-white p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)] leading-tight">{m.label}</span>
                          <Icon className={cn("w-3.5 h-3.5", toneText(m.tone))} />
                        </div>
                        <div className="text-2xl font-semibold text-[#0B1624] tabular-nums mt-1">{m.value}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="lg:col-span-2 divide-y divide-[rgba(15,23,42,0.06)]">
                  <div className="px-4 py-2.5 grid grid-cols-12 gap-3 text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">
                    <div className="col-span-5">External ID</div>
                    <div className="col-span-3">System</div>
                    <div className="col-span-3">Issue</div>
                    <div className="col-span-1 text-right">Action</div>
                  </div>
                  {UNMAPPED_SAMPLE.map((u) => (
                    <div key={u.external} className="px-4 py-2.5 grid grid-cols-12 gap-3 items-center hover:bg-[#F6F8FB]">
                      <code className="col-span-5 text-[11px] text-[rgba(11,22,36,0.78)] truncate">{u.external}</code>
                      <div className="col-span-3 text-[11px] text-[rgba(11,22,36,0.62)] truncate">{u.system}</div>
                      <div className="col-span-3 text-[11px] text-amber-400 truncate">{u.issue}</div>
                      <div className="col-span-1 text-right">
                        <button className="text-[10px] px-2 py-1 rounded-md bg-[#22C55E]/10 text-[#16A34A] hover:bg-[#22C55E]/15 border border-[#22C55E]/40">
                          Map
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className="h-4" />
          </div>
        </div>
      </div>
      <IntegrationDetailDrawer
        open={!!active}
        onOpenChange={(v) => !v && setActive(null)}
        integration={active}
      />
    </HyperMCPShell>
  );
}
