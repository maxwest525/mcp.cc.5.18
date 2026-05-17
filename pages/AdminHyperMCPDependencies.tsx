import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Network, Search, AlertTriangle, CheckCircle2, XCircle, Activity,
  ArrowUp, ArrowDown, RefreshCw, ShieldAlert, Rocket, Download, GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type NodeType = "integration" | "workflow" | "queue" | "ai" | "mapping" | "environment";
type Health = "healthy" | "degraded" | "failing";

interface Node {
  id: string;
  name: string;
  type: NodeType;
  health: Health;
  score: number;
  upstream: string[];
  downstream: string[];
  failures24h: number;
  recentIncidents: { ts: string; text: string }[];
  recentDeployments: { ts: string; version: string }[];
}

const TYPE_LABEL: Record<NodeType, string> = {
  integration: "Integration", workflow: "Workflow", queue: "Queue",
  ai: "AI System", mapping: "Mapping", environment: "Environment",
};

const NODES: Node[] = [
  { id: "n_moverleads", name: "MoverLeads Pro", type: "integration", health: "healthy", score: 98,
    upstream: [], downstream: ["n_intake_router", "n_attribution"],
    failures24h: 2, recentIncidents: [], recentDeployments: [{ ts: "3 d ago", version: "v3.2.0" }] },
  { id: "n_intake_router", name: "Intake Router", type: "workflow", health: "healthy", score: 96,
    upstream: ["n_moverleads"], downstream: ["n_lead_queue", "n_lead_mapping"],
    failures24h: 0, recentIncidents: [], recentDeployments: [] },
  { id: "n_lead_queue", name: "leads.intake.queue", type: "queue", health: "degraded", score: 78,
    upstream: ["n_intake_router"], downstream: ["n_crm_sync", "n_ai_estimate"],
    failures24h: 14, recentIncidents: [{ ts: "1 hr ago", text: "Backlog spike, depth 1.2k" }],
    recentDeployments: [{ ts: "Yesterday", version: "v1.2.0" }] },
  { id: "n_crm_sync", name: "CRM Sync Workflow", type: "workflow", health: "degraded", score: 82,
    upstream: ["n_lead_queue", "n_field_mapping"], downstream: ["n_salesforce"],
    failures24h: 6, recentIncidents: [{ ts: "3 hr ago", text: "Field mismatch on 8 records" }],
    recentDeployments: [] },
  { id: "n_salesforce", name: "Salesforce CRM", type: "integration", health: "healthy", score: 94,
    upstream: ["n_crm_sync"], downstream: [], failures24h: 1, recentIncidents: [], recentDeployments: [] },
  { id: "n_ai_estimate", name: "AI Estimation", type: "ai", health: "healthy", score: 91,
    upstream: ["n_lead_queue"], downstream: ["n_pricing"],
    failures24h: 3, recentIncidents: [], recentDeployments: [{ ts: "2 d ago", version: "v2.0.1" }] },
  { id: "n_pricing", name: "Pricing Engine", type: "workflow", health: "healthy", score: 95,
    upstream: ["n_ai_estimate"], downstream: ["n_dispatch"], failures24h: 0,
    recentIncidents: [], recentDeployments: [] },
  { id: "n_dispatch", name: "Dispatch Engine", type: "workflow", health: "healthy", score: 93,
    upstream: ["n_pricing", "n_carrier_vetting"], downstream: ["n_dispatch_queue"],
    failures24h: 0, recentIncidents: [], recentDeployments: [] },
  { id: "n_dispatch_queue", name: "dispatch.queue", type: "queue", health: "healthy", score: 97,
    upstream: ["n_dispatch"], downstream: [], failures24h: 0, recentIncidents: [], recentDeployments: [] },
  { id: "n_carrier_vetting", name: "Carrier Vetting", type: "workflow", health: "failing", score: 42,
    upstream: ["n_fmcsa"], downstream: ["n_dispatch"],
    failures24h: 28, recentIncidents: [{ ts: "30 min ago", text: "FMCSA timeouts cascading" }],
    recentDeployments: [] },
  { id: "n_fmcsa", name: "FMCSA Safety", type: "integration", health: "failing", score: 38,
    upstream: [], downstream: ["n_carrier_vetting"],
    failures24h: 47, recentIncidents: [{ ts: "1 hr ago", text: "504 Gateway Timeout sustained" }],
    recentDeployments: [] },
  { id: "n_field_mapping", name: "Lead → CRM Mapping", type: "mapping", health: "degraded", score: 76,
    upstream: [], downstream: ["n_crm_sync"],
    failures24h: 8, recentIncidents: [], recentDeployments: [{ ts: "Yesterday", version: "v1.4.0" }] },
  { id: "n_lead_mapping", name: "Lead Schema Mapping", type: "mapping", health: "healthy", score: 99,
    upstream: [], downstream: ["n_intake_router"], failures24h: 0, recentIncidents: [], recentDeployments: [] },
  { id: "n_attribution", name: "Attribution Sync", type: "workflow", health: "healthy", score: 88,
    upstream: ["n_moverleads"], downstream: ["n_ga4"], failures24h: 1, recentIncidents: [], recentDeployments: [] },
  { id: "n_ga4", name: "GA4", type: "integration", health: "healthy", score: 96,
    upstream: ["n_attribution"], downstream: [], failures24h: 0, recentIncidents: [], recentDeployments: [] },
  { id: "n_prod", name: "Production Environment", type: "environment", health: "healthy", score: 97,
    upstream: [], downstream: ["n_intake_router", "n_crm_sync", "n_dispatch"],
    failures24h: 0, recentIncidents: [], recentDeployments: [{ ts: "Today", version: "v2.4.1" }] },
];

const healthBadge = (h: Health) => {
  const map: Record<Health, string> = {
    healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    degraded: "bg-amber-50 text-amber-700 border-amber-200",
    failing: "bg-red-50 text-red-700 border-red-200",
  };
  return <span className={cn("inline-flex px-2 py-0.5 rounded text-[11px] font-medium border capitalize", map[h])}>{h}</span>;
};

const typeColor: Record<NodeType, string> = {
  integration: "bg-blue-50 text-blue-700 border-blue-200",
  workflow: "bg-violet-50 text-violet-700 border-violet-200",
  queue: "bg-amber-50 text-amber-700 border-amber-200",
  ai: "bg-emerald-50 text-emerald-700 border-emerald-200",
  mapping: "bg-cyan-50 text-cyan-700 border-cyan-200",
  environment: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function AdminHyperMCPDependencies() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NodeType | "all">("all");
  const [selected, setSelected] = useState<Node | null>(null);

  const filtered = useMemo(() => NODES.filter(n => {
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (query && !n.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [query, typeFilter]);

  const kpis = {
    total: NODES.length,
    failing: NODES.filter(n => n.health === "failing").length,
    degraded: NODES.filter(n => n.health === "degraded").length,
    avgScore: Math.round(NODES.reduce((a, n) => a + n.score, 0) / NODES.length),
    failures: NODES.reduce((a, n) => a + n.failures24h, 0),
    incidents: NODES.reduce((a, n) => a + n.recentIncidents.length, 0),
  };

  const layers = {
    integrations: NODES.filter(n => n.type === "integration"),
    workflows: NODES.filter(n => n.type === "workflow"),
    queues: NODES.filter(n => n.type === "queue"),
    ai: NODES.filter(n => n.type === "ai"),
    mappings: NODES.filter(n => n.type === "mapping"),
    environments: NODES.filter(n => n.type === "environment"),
  };

  const nodeById = (id: string) => NODES.find(n => n.id === id);

  return (
    <HyperMCPShell>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <Network className="w-6 h-6 text-slate-700" />
              Integration Dependencies
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Relationships and dependencies across integrations, workflows, queues, AI, mappings, and environments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("Dependency graph refreshed")}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Graph exported")}>
              <Download className="w-4 h-4 mr-1.5" /> Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Nodes", value: kpis.total, icon: Network, tone: "text-slate-700" },
            { label: "Failing", value: kpis.failing, icon: XCircle, tone: "text-red-600" },
            { label: "Degraded", value: kpis.degraded, icon: AlertTriangle, tone: "text-amber-600" },
            { label: "Avg Health", value: `${kpis.avgScore}%`, icon: Activity, tone: "text-slate-700" },
            { label: "Failures (24h)", value: kpis.failures, icon: ShieldAlert, tone: "text-red-600" },
            { label: "Active Incidents", value: kpis.incidents, icon: AlertTriangle, tone: "text-amber-600" },
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

        {/* Dependency graph (layered) */}
        <Card className="border-slate-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-slate-900 mb-3">Dependency Graph</p>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {Object.entries(layers).map(([key, items]) => (
              <div key={key} className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{key}</p>
                {items.map(n => (
                  <div key={n.id} onClick={() => setSelected(n)}
                       className={cn("border rounded p-2 cursor-pointer hover:shadow-sm transition-shadow",
                         n.health === "failing" ? "border-red-300 bg-red-50/50"
                         : n.health === "degraded" ? "border-amber-300 bg-amber-50/50"
                         : "border-slate-200 bg-white")}>
                    <p className="text-[11px] font-semibold text-slate-900 truncate">{n.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={cn("text-[9px] uppercase",
                        n.health === "failing" ? "text-red-600" : n.health === "degraded" ? "text-amber-600" : "text-emerald-700")}>
                        {n.health}
                      </span>
                      <span className="text-[10px] tabular-nums text-slate-700">{n.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        {/* Filters + Table */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-3 border-b border-slate-200 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <Input className="pl-8 h-9" placeholder="Search nodes..."
                value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <Button size="sm" variant={typeFilter === "all" ? "default" : "outline"} onClick={() => setTypeFilter("all")}>All</Button>
            {(Object.keys(TYPE_LABEL) as NodeType[]).map(t => (
              <Button key={t} size="sm" variant={typeFilter === t ? "default" : "outline"} onClick={() => setTypeFilter(t)}>
                {TYPE_LABEL[t]}
              </Button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="text-left px-3 py-2 font-medium">Node</th>
                  <th className="text-left px-3 py-2 font-medium">Type</th>
                  <th className="text-right px-3 py-2 font-medium">Upstream</th>
                  <th className="text-right px-3 py-2 font-medium">Downstream</th>
                  <th className="text-right px-3 py-2 font-medium">Failures 24h</th>
                  <th className="text-right px-3 py-2 font-medium">Health Score</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(n => (
                  <tr key={n.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(n)}>
                    <td className="px-3 py-2 text-slate-900 font-medium">{n.name}</td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border", typeColor[n.type])}>
                        {TYPE_LABEL[n.type]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{n.upstream.length}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{n.downstream.length}</td>
                    <td className={cn("px-3 py-2 text-right tabular-nums",
                      n.failures24h > 10 ? "text-red-600 font-semibold" : "text-slate-700")}>{n.failures24h}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn("h-full",
                            n.score >= 90 ? "bg-emerald-500" : n.score >= 70 ? "bg-amber-500" : "bg-red-500")}
                            style={{ width: `${n.score}%` }} />
                        </div>
                        <span className="text-[11px] tabular-nums text-slate-700 w-7 text-right">{n.score}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{healthBadge(n.health)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-slate-200 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600"/> Service Impact Analysis
            </p>
            <div className="space-y-2 text-[12px]">
              {NODES.filter(n => n.health !== "healthy").map(n => (
                <div key={n.id} className="border border-slate-200 rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{n.name}</span>
                    {healthBadge(n.health)}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Impacts {n.downstream.length} downstream services
                  </p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-slate-200 shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600"/> Circular Dependency Warnings
            </p>
            <div className="text-[12px] text-slate-600 space-y-2">
              <div className="border border-slate-200 rounded p-2">
                <p className="text-slate-700">No circular dependencies detected in current topology.</p>
                <p className="text-[11px] text-slate-500 mt-1">Last scan: 2 min ago</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Drawer */}
        <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle>{selected.name}</SheetTitle>
                  <SheetDescription>
                    {TYPE_LABEL[selected.type]} · health score {selected.score}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div>{healthBadge(selected.health)}</div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                        <ArrowUp className="w-3.5 h-3.5"/> Upstream ({selected.upstream.length})
                      </p>
                      <div className="space-y-1">
                        {selected.upstream.map(id => {
                          const n = nodeById(id);
                          return n ? <div key={id} onClick={() => setSelected(n)}
                            className="text-[12px] px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer">{n.name}</div> : null;
                        })}
                        {selected.upstream.length === 0 && <p className="text-[11px] text-slate-500">None</p>}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                        <ArrowDown className="w-3.5 h-3.5"/> Downstream ({selected.downstream.length})
                      </p>
                      <div className="space-y-1">
                        {selected.downstream.map(id => {
                          const n = nodeById(id);
                          return n ? <div key={id} onClick={() => setSelected(n)}
                            className="text-[12px] px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer">{n.name}</div> : null;
                        })}
                        {selected.downstream.length === 0 && <p className="text-[11px] text-slate-500">None</p>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">Related Incidents</p>
                    <div className="border border-slate-200 rounded divide-y divide-slate-100">
                      {selected.recentIncidents.length === 0 && <p className="px-3 py-2 text-[12px] text-slate-500">No active incidents</p>}
                      {selected.recentIncidents.map((i, idx) => (
                        <div key={idx} className="px-3 py-2 text-[12px]">
                          <p className="text-slate-700">{i.text}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{i.ts}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Rocket className="w-3.5 h-3.5"/> Related Deployments
                    </p>
                    <div className="border border-slate-200 rounded divide-y divide-slate-100">
                      {selected.recentDeployments.length === 0 && <p className="px-3 py-2 text-[12px] text-slate-500">No recent deployments</p>}
                      {selected.recentDeployments.map((d, idx) => (
                        <div key={idx} className="px-3 py-2 text-[12px] flex items-center justify-between">
                          <span className="font-mono text-slate-800">{d.version}</span>
                          <span className="text-[11px] text-slate-500">{d.ts}</span>
                        </div>
                      ))}
                    </div>
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
