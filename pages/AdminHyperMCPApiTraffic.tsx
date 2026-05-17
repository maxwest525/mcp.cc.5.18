import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Activity, Search, Download, RefreshCw, AlertTriangle, CheckCircle2,
  XCircle, Clock, Gauge, ArrowUpRight, ArrowDownLeft, Zap, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Direction = "inbound" | "outbound";
type Status = "200" | "201" | "204" | "400" | "401" | "404" | "429" | "500" | "502" | "504";

interface Endpoint {
  id: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  direction: Direction;
  integration: string;
  rps: number;
  avgLatency: number;
  p95: number;
  errorRate: number;
  rateLimit: { limit: number; used: number };
  retries24h: number;
  lastStatus: Status;
  recentRequests: { ts: string; status: Status; latency: number; size: string }[];
  samplePayload: string;
  sampleResponse: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    id: "ep_leads_in", path: "/v1/webhooks/leads", method: "POST", direction: "inbound",
    integration: "MoverLeads Pro", rps: 12.4, avgLatency: 84, p95: 210, errorRate: 0.4,
    rateLimit: { limit: 1000, used: 412 }, retries24h: 6, lastStatus: "200",
    recentRequests: [
      { ts: "12s ago", status: "200", latency: 78, size: "1.2 KB" },
      { ts: "24s ago", status: "200", latency: 92, size: "1.1 KB" },
      { ts: "1 min ago", status: "429", latency: 14, size: "0.2 KB" },
      { ts: "2 min ago", status: "200", latency: 81, size: "1.3 KB" },
    ],
    samplePayload: `{ "lead_id": "...", "phone": "+1310...", "origin_zip": "90024" }`,
    sampleResponse: `{ "ok": true, "internal_id": "ld_8f4c..." }`,
  },
  {
    id: "ep_crm_sync", path: "/v1/crm/contacts", method: "PUT", direction: "outbound",
    integration: "Salesforce CRM", rps: 4.1, avgLatency: 312, p95: 940, errorRate: 2.1,
    rateLimit: { limit: 500, used: 318 }, retries24h: 47, lastStatus: "200",
    recentRequests: [
      { ts: "30s ago", status: "200", latency: 280, size: "3.4 KB" },
      { ts: "1 min ago", status: "500", latency: 1820, size: "0.4 KB" },
      { ts: "2 min ago", status: "200", latency: 240, size: "3.1 KB" },
    ],
    samplePayload: `{ "contact_id": "c_91", "phone": "+13105551042" }`,
    sampleResponse: `{ "id": "0033...", "updated": true }`,
  },
  {
    id: "ep_ai_estimate", path: "/v1/ai/estimate", method: "POST", direction: "outbound",
    integration: "Lovable AI Gateway", rps: 2.3, avgLatency: 1180, p95: 2400, errorRate: 0.8,
    rateLimit: { limit: 200, used: 84 }, retries24h: 3, lastStatus: "200",
    recentRequests: [
      { ts: "8s ago", status: "200", latency: 1090, size: "8.4 KB" },
      { ts: "45s ago", status: "200", latency: 1240, size: "7.9 KB" },
    ],
    samplePayload: `{ "rooms": [...], "media": "..." }`,
    sampleResponse: `{ "total_cube_ft": 412, "confidence": 0.87 }`,
  },
  {
    id: "ep_twilio_sms", path: "/v1/sms/send", method: "POST", direction: "outbound",
    integration: "Twilio", rps: 6.8, avgLatency: 220, p95: 480, errorRate: 0.2,
    rateLimit: { limit: 1500, used: 980 }, retries24h: 2, lastStatus: "201",
    recentRequests: [
      { ts: "5s ago", status: "201", latency: 198, size: "0.3 KB" },
      { ts: "20s ago", status: "201", latency: 240, size: "0.3 KB" },
    ],
    samplePayload: `{ "to": "+1310...", "body": "Your move..." }`,
    sampleResponse: `{ "sid": "SM...", "status": "queued" }`,
  },
  {
    id: "ep_fmcsa", path: "/v1/carrier/lookup", method: "GET", direction: "outbound",
    integration: "FMCSA Safety", rps: 0.9, avgLatency: 740, p95: 2100, errorRate: 6.4,
    rateLimit: { limit: 100, used: 92 }, retries24h: 28, lastStatus: "504",
    recentRequests: [
      { ts: "1 min ago", status: "504", latency: 9800, size: "0.1 KB" },
      { ts: "3 min ago", status: "200", latency: 680, size: "4.2 KB" },
      { ts: "5 min ago", status: "429", latency: 12, size: "0.1 KB" },
    ],
    samplePayload: `?dot=1234567`,
    sampleResponse: `{ "safety_rating": "Satisfactory" }`,
  },
  {
    id: "ep_pulse_event", path: "/v1/webhooks/pulse", method: "POST", direction: "inbound",
    integration: "Pulse Compliance", rps: 18.2, avgLatency: 42, p95: 110, errorRate: 0.1,
    rateLimit: { limit: 5000, used: 2140 }, retries24h: 0, lastStatus: "200",
    recentRequests: [
      { ts: "2s ago", status: "200", latency: 38, size: "2.8 KB" },
    ],
    samplePayload: `{ "call_id": "...", "transcript": "..." }`,
    sampleResponse: `{ "ok": true }`,
  },
];

const statusBadge = (s: Status) => {
  const code = parseInt(s);
  const cls = code < 300 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : code < 500 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";
  return <span className={cn("inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border", cls)}>{s}</span>;
};

const methodBadge = (m: string) => {
  const map: Record<string, string> = {
    GET: "bg-blue-50 text-blue-700 border-blue-200",
    POST: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PUT: "bg-amber-50 text-amber-700 border-amber-200",
    DELETE: "bg-red-50 text-red-700 border-red-200",
    PATCH: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return <span className={cn("inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border", map[m])}>{m}</span>;
};

export default function AdminHyperMCPApiTraffic() {
  const [query, setQuery] = useState("");
  const [dirFilter, setDirFilter] = useState<Direction | "all">("all");
  const [selected, setSelected] = useState<Endpoint | null>(null);

  const filtered = useMemo(() => ENDPOINTS.filter(e => {
    if (dirFilter !== "all" && e.direction !== dirFilter) return false;
    if (query && !e.path.toLowerCase().includes(query.toLowerCase()) &&
        !e.integration.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [query, dirFilter]);

  const kpis = {
    totalRps: ENDPOINTS.reduce((a, e) => a + e.rps, 0).toFixed(1),
    avgLatency: Math.round(ENDPOINTS.reduce((a, e) => a + e.avgLatency, 0) / ENDPOINTS.length),
    failures: ENDPOINTS.filter(e => e.errorRate > 1).length,
    retries: ENDPOINTS.reduce((a, e) => a + e.retries24h, 0),
    rateLimited: ENDPOINTS.filter(e => e.rateLimit.used / e.rateLimit.limit > 0.8).length,
    inbound: ENDPOINTS.filter(e => e.direction === "inbound").length,
  };

  return (
    <HyperMCPShell>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-slate-700" />
              API Traffic Monitor
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Monitor inbound and outbound API traffic, throughput, rate limits, retries, and latency.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("Traffic refreshed")}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Traffic exported")}>
              <Download className="w-4 h-4 mr-1.5" /> Export
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total RPS", value: kpis.totalRps, icon: Zap, tone: "text-slate-700" },
            { label: "Avg Latency", value: `${kpis.avgLatency}ms`, icon: Gauge, tone: "text-slate-700" },
            { label: "Failing Endpoints", value: kpis.failures, icon: XCircle, tone: "text-red-600" },
            { label: "Retries (24h)", value: kpis.retries, icon: RefreshCw, tone: "text-amber-600" },
            { label: "Near Rate Limit", value: kpis.rateLimited, icon: ShieldAlert, tone: "text-amber-600" },
            { label: "Inbound Endpoints", value: kpis.inbound, icon: ArrowDownLeft, tone: "text-slate-700" },
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

        {/* Request timeline */}
        <Card className="border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Request Timeline (last 60 min)</p>
              <p className="text-[11px] text-slate-500">Throughput by direction</p>
            </div>
            <div className="flex gap-3 text-[11px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm"/>Inbound</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-sm"/>Outbound</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-sm"/>Errors</span>
            </div>
          </div>
          <div className="flex items-end gap-1 h-24">
            {Array.from({ length: 60 }, (_, i) => {
              const h1 = 30 + Math.sin(i / 4) * 20 + Math.random() * 20;
              const h2 = 20 + Math.cos(i / 5) * 15 + Math.random() * 15;
              const err = Math.random() > 0.85 ? Math.random() * 12 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col-reverse gap-px">
                  <div className="bg-emerald-500/70" style={{ height: `${h1}%` }} />
                  <div className="bg-blue-500/70" style={{ height: `${h2}%` }} />
                  {err > 0 && <div className="bg-red-500" style={{ height: `${err}%` }} />}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Filters + endpoints table */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-3 border-b border-slate-200 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <Input className="pl-8 h-9" placeholder="Search endpoints or integrations..."
                value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            {(["all", "inbound", "outbound"] as const).map(d => (
              <Button key={d} size="sm"
                variant={dirFilter === d ? "default" : "outline"}
                onClick={() => setDirFilter(d)}>
                {d === "all" ? "All" : d === "inbound" ? "Inbound" : "Outbound"}
              </Button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="text-left px-3 py-2 font-medium">Method</th>
                  <th className="text-left px-3 py-2 font-medium">Endpoint</th>
                  <th className="text-left px-3 py-2 font-medium">Integration</th>
                  <th className="text-right px-3 py-2 font-medium">RPS</th>
                  <th className="text-right px-3 py-2 font-medium">Avg / p95</th>
                  <th className="text-right px-3 py-2 font-medium">Err %</th>
                  <th className="text-right px-3 py-2 font-medium">Rate Limit</th>
                  <th className="text-right px-3 py-2 font-medium">Retries 24h</th>
                  <th className="text-right px-3 py-2 font-medium">Last</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelected(e)}>
                    <td className="px-3 py-2">{methodBadge(e.method)}</td>
                    <td className="px-3 py-2 font-mono text-[12px] text-slate-800">{e.path}</td>
                    <td className="px-3 py-2 text-slate-700">{e.integration}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.rps.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{e.avgLatency} / {e.p95}ms</td>
                    <td className={cn("px-3 py-2 text-right tabular-nums",
                      e.errorRate > 1 ? "text-red-600 font-medium" : "text-slate-600")}>
                      {e.errorRate.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn("h-full",
                            e.rateLimit.used / e.rateLimit.limit > 0.8 ? "bg-red-500"
                              : e.rateLimit.used / e.rateLimit.limit > 0.5 ? "bg-amber-500" : "bg-emerald-500")}
                            style={{ width: `${(e.rateLimit.used / e.rateLimit.limit) * 100}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-600 tabular-nums">{e.rateLimit.used}/{e.rateLimit.limit}</span>
                      </div>
                    </td>
                    <td className={cn("px-3 py-2 text-right tabular-nums",
                      e.retries24h > 20 ? "text-red-600 font-medium" : "text-slate-600")}>{e.retries24h}</td>
                    <td className="px-3 py-2 text-right">{statusBadge(e.lastStatus)}</td>
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
              <ArrowUpRight className="w-4 h-4 text-slate-700"/> Top Endpoints (RPS)
            </p>
            <div className="space-y-2">
              {[...ENDPOINTS].sort((a, b) => b.rps - a.rps).slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center justify-between text-[12px]">
                  <span className="font-mono text-slate-700 truncate">{e.path}</span>
                  <span className="tabular-nums text-slate-900 font-medium">{e.rps.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-slate-200 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600"/> Failure Analysis
            </p>
            <div className="space-y-2 text-[12px]">
              {ENDPOINTS.filter(e => e.errorRate > 0.5).map(e => (
                <div key={e.id} className="flex items-center justify-between">
                  <span className="font-mono text-slate-700 truncate">{e.path}</span>
                  <span className="tabular-nums text-red-600 font-medium">{e.errorRate.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-slate-200 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-amber-600"/> Retry Spikes
            </p>
            <div className="space-y-2 text-[12px]">
              {[...ENDPOINTS].sort((a, b) => b.retries24h - a.retries24h).slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center justify-between">
                  <span className="font-mono text-slate-700 truncate">{e.path}</span>
                  <span className="tabular-nums text-amber-700 font-medium">{e.retries24h}</span>
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
                  <SheetTitle className="flex items-center gap-2">
                    {methodBadge(selected.method)}
                    <span className="font-mono text-[15px]">{selected.path}</span>
                  </SheetTitle>
                  <SheetDescription>{selected.integration} · {selected.direction}</SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { l: "RPS", v: selected.rps.toFixed(1) },
                      { l: "Avg", v: `${selected.avgLatency}ms` },
                      { l: "p95", v: `${selected.p95}ms` },
                      { l: "Err", v: `${selected.errorRate.toFixed(1)}%` },
                    ].map((s, i) => (
                      <div key={i} className="p-2 border border-slate-200 rounded">
                        <p className="text-[10px] uppercase text-slate-500">{s.l}</p>
                        <p className="text-sm font-semibold text-slate-900">{s.v}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">Recent Requests</p>
                    <div className="border border-slate-200 rounded divide-y divide-slate-100">
                      {selected.recentRequests.map((r, i) => (
                        <div key={i} className="px-3 py-2 flex items-center justify-between text-[12px]">
                          <span className="text-slate-600">{r.ts}</span>
                          <span className="flex items-center gap-2">
                            {statusBadge(r.status)}
                            <span className="tabular-nums text-slate-700">{r.latency}ms</span>
                            <span className="text-slate-500">{r.size}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">Request Payload</p>
                    <pre className="text-[11px] bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto font-mono">{selected.samplePayload}</pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">Response</p>
                    <pre className="text-[11px] bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto font-mono">{selected.sampleResponse}</pre>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => toast.success("Endpoint refreshed")}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5"/> Refresh
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success("Rate limit increased")}>
                      <Gauge className="w-3.5 h-3.5 mr-1.5"/> Adjust Limits
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
