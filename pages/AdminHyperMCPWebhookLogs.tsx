import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import {
  Search, RefreshCw, Filter, Calendar as CalendarIcon, ChevronDown,
  CheckCircle2, XCircle, Loader2, Clock, MinusCircle, ArrowLeft, Webhook,
  RotateCcw, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  WEBHOOK_LOGS, SOURCES, EVENT_TYPES, STATUSES,
  type WebhookLog, type WebhookStatus,
} from "@/components/hyper-mcp/webhookLogData";
import { WebhookLogDrawer } from "@/components/hyper-mcp/WebhookLogDrawer";

const STATUS_PILL: Record<WebhookStatus, string> = {
  success:  "bg-[#22C55E]/10 text-[#16A34A] border-[#22C55E]/40",
  failed:   "bg-rose-500/10 text-rose-600 border-rose-500/30",
  retrying: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  pending:  "bg-blue-500/10 text-blue-600 border-blue-500/30",
  ignored:  "bg-slate-500/10 text-slate-600 border-slate-300",
};

function StatusPill({ status }: { status: WebhookStatus }) {
  const Icon =
    status === "success"  ? CheckCircle2 :
    status === "failed"   ? XCircle :
    status === "retrying" ? Loader2 :
    status === "pending"  ? Clock :
    MinusCircle;
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium tracking-wide capitalize", STATUS_PILL[status])}>
      <Icon className={cn("w-2.5 h-2.5", status === "retrying" && "animate-spin")} />
      {status}
    </span>
  );
}

function FilterButton({
  label, value, options, onChange, allLabel = "All",
}: {
  label: string;
  value: string | "all";
  options: readonly string[];
  onChange: (v: string | "all") => void;
  allLabel?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md bg-white border border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#F6F8FB] transition-colors">
          <Filter className="w-3.5 h-3.5 text-[rgba(11,22,36,0.48)]" />
          <span className="text-[rgba(11,22,36,0.62)]">{label}:</span>
          <span className="font-medium capitalize">{value === "all" ? allLabel : value}</span>
          <ChevronDown className="w-3 h-3 text-[rgba(11,22,36,0.48)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1 bg-white border-[rgba(15,23,42,0.10)]">
        <button
          onClick={() => onChange("all")}
          className={cn("w-full text-left px-2 py-1.5 text-[12px] rounded hover:bg-[#F6F8FB]", value === "all" && "bg-[#F6F8FB] font-medium")}
        >
          {allLabel}
        </button>
        <div className="h-px bg-[rgba(15,23,42,0.06)] my-1" />
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn("w-full text-left px-2 py-1.5 text-[12px] rounded hover:bg-[#F6F8FB] capitalize font-mono", value === o && "bg-[#F6F8FB] font-medium")}
          >
            {o}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default function AdminHyperMCPWebhookLogs() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<string | "all">("all");
  const [status, setStatus] = useState<string | "all">("all");
  const [event, setEvent] = useState<string | "all">("all");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [active, setActive] = useState<WebhookLog | null>(null);

  const filtered = useMemo(() => {
    return WEBHOOK_LOGS.filter((l) => {
      if (source !== "all" && l.source !== source) return false;
      if (status !== "all" && l.status !== status) return false;
      if (event !== "all" && l.event !== event) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!l.id.toLowerCase().includes(q)
          && !l.event.toLowerCase().includes(q)
          && !l.source.toLowerCase().includes(q)
          && !l.destination.toLowerCase().includes(q)) return false;
      }
      const t = new Date(l.iso).getTime();
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime() + 86_400_000) return false;
      return true;
    });
  }, [query, source, status, event, from, to]);

  const counts = useMemo(() => {
    const c = { total: filtered.length, success: 0, failed: 0, retrying: 0, pending: 0, ignored: 0 } as Record<string, number>;
    filtered.forEach((l) => { c[l.status]++; });
    return c;
  }, [filtered]);

  return (
    <HyperMCPShell breadcrumb="Hyper MCP / Webhook Logs">
      <div className="-m-3 sm:-m-6 min-h-[calc(100vh-3rem)] bg-[#F6F8FB] text-[#0B1624]">
        <div className="max-w-[1500px] mx-auto p-4 sm:p-6 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3">
              <Link
                to="/hypermcp"
                className="inline-flex items-center gap-1 text-[12px] text-[rgba(11,22,36,0.62)] hover:text-[#0B1624]"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Hyper MCP
              </Link>
              <span className="text-[rgba(11,22,36,0.35)]">/</span>
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-[#16A34A]" />
                <h1 className="text-xl font-semibold tracking-tight text-[#0B1624]">Webhook Logs</h1>
                <span className="text-[11px] text-[rgba(11,22,36,0.48)] tabular-nums">({counts.total})</span>
              </div>
            </div>
            <button
              onClick={() => toast.success("Logs refreshed")}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-md bg-white border border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#F6F8FB]"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {(["success", "failed", "retrying", "pending", "ignored"] as const).map((k) => (
              <Card key={k} className="bg-white border-[rgba(15,23,42,0.06)] rounded-lg px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">{k}</span>
                  <StatusPill status={k} />
                </div>
                <div className="text-lg font-semibold tabular-nums mt-1">{counts[k]}</div>
              </Card>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-[360px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(11,22,36,0.48)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search logs by ID, event, source…"
                className="w-full text-[12px] bg-white border border-[rgba(15,23,42,0.10)] rounded-md pl-8 pr-2.5 py-1.5 text-[#0B1624] placeholder:text-[rgba(11,22,36,0.35)] focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30"
              />
            </div>

            <FilterButton label="Integration" value={source} options={SOURCES} onChange={setSource} />
            <FilterButton label="Status"      value={status} options={STATUSES} onChange={setStatus} />
            <FilterButton label="Event"       value={event}  options={EVENT_TYPES} onChange={setEvent} />

            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md bg-white border border-[rgba(15,23,42,0.10)] text-[#0B1624] hover:bg-[#F6F8FB]">
                  <CalendarIcon className="w-3.5 h-3.5 text-[rgba(11,22,36,0.48)]" />
                  <span className="font-medium">
                    {from ? format(from, "MMM d") : "Any"} → {to ? format(to, "MMM d") : "Any"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[rgba(11,22,36,0.48)]" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0 bg-white border-[rgba(15,23,42,0.10)]">
                <Calendar
                  mode="range"
                  selected={{ from, to }}
                  onSelect={(r) => { setFrom(r?.from); setTo(r?.to); }}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
                <div className="px-3 py-2 border-t border-[rgba(15,23,42,0.06)] flex justify-end">
                  <button onClick={() => { setFrom(undefined); setTo(undefined); }} className="text-[11px] text-[rgba(11,22,36,0.62)] hover:text-[#0B1624]">
                    Clear
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {(query || source !== "all" || status !== "all" || event !== "all" || from || to) && (
              <button
                onClick={() => { setQuery(""); setSource("all"); setStatus("all"); setEvent("all"); setFrom(undefined); setTo(undefined); }}
                className="text-[11px] text-[rgba(11,22,36,0.62)] hover:text-[#0B1624] underline ml-1"
              >
                Reset
              </button>
            )}
          </div>

          {/* Table */}
          <Card className="bg-white border-[rgba(15,23,42,0.06)] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-[#F6F8FB] border-b border-[rgba(15,23,42,0.06)]">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-[rgba(11,22,36,0.48)]">
                    <th className="px-3 py-2 font-medium w-[160px]">Timestamp</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Event</th>
                    <th className="px-3 py-2 font-medium w-[110px]">Status</th>
                    <th className="px-3 py-2 font-medium">Destination</th>
                    <th className="px-3 py-2 font-medium text-right w-[80px]">Latency</th>
                    <th className="px-3 py-2 font-medium text-right w-[60px]">Retry</th>
                    <th className="px-3 py-2 font-medium text-right w-[80px]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-[12px] text-[rgba(11,22,36,0.48)]">
                        No webhook events match these filters.
                      </td>
                    </tr>
                  )}
                  {filtered.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setActive(l)}
                      className="border-b border-[rgba(15,23,42,0.06)] last:border-0 hover:bg-[#F6F8FB] cursor-pointer"
                    >
                      <td className="px-3 py-2 tabular-nums text-[rgba(11,22,36,0.78)]">{l.timestamp}</td>
                      <td className="px-3 py-2 text-[#0B1624]">{l.source}</td>
                      <td className="px-3 py-2 font-mono text-[#0B1624]">{l.event}</td>
                      <td className="px-3 py-2"><StatusPill status={l.status} /></td>
                      <td className="px-3 py-2 text-[rgba(11,22,36,0.78)]">{l.destination}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[rgba(11,22,36,0.78)]">{l.latencyMs} ms</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[rgba(11,22,36,0.78)]">{l.retries}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {(l.status === "failed" || l.status === "retrying") && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toast.success(`Retry queued · ${l.id}`); }}
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-[#22C55E]/10 text-[#16A34A] hover:bg-[#22C55E]/15 border border-[#22C55E]/30"
                            >
                              <RotateCcw className="w-3 h-3" /> Retry
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setActive(l); }}
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md text-[rgba(11,22,36,0.62)] hover:text-[#0B1624] hover:bg-[#EEF2F7]"
                          >
                            <ExternalLink className="w-3 h-3" /> Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="h-4" />
        </div>
      </div>

      <WebhookLogDrawer
        open={!!active}
        onOpenChange={(v) => !v && setActive(null)}
        log={active}
      />
    </HyperMCPShell>
  );
}
