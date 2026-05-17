import { useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { BackendRequired } from "@/components/shell/BackendRequired";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, Stethoscope, Plus, Search, Download, Eye, RotateCw, AlertCircle,
  Network, Plug, Workflow as WorkflowIcon, Activity, DollarSign, Settings as SettingsIcon,
  GitBranch, Zap,
} from "lucide-react";

type Status = "ok" | "idle" | "degraded" | "error" | "disconnected" | "active" | "paused";

interface Connection {
  id: string;
  name: string;
  category: string;
  status: Status;
  auth_type: string;
  last_used: string;
  requests_24h: number;
  error_rate: number;
  cost_24h: number;
  credentials_masked: string;
}

const CONNECTIONS: Connection[] = [
  { id: "1", name: "Claude (Hyper)", category: "LLM", status: "ok", auth_type: "API Key", last_used: "12s ago", requests_24h: 1423, error_rate: 0.2, cost_24h: 12.34, credentials_masked: "sk-...3a9f" },
  { id: "2", name: "Gemini 2.5 Pro", category: "LLM / Vision", status: "ok", auth_type: "API Key", last_used: "3m ago", requests_24h: 2891, error_rate: 0.8, cost_24h: 19.87, credentials_masked: "AIza...YjZk" },
  { id: "3", name: "Authorize.net", category: "Payment Gateway", status: "ok", auth_type: "OAuth", last_used: "8m ago", requests_24h: 142, error_rate: 0.0, cost_24h: 0.0, credentials_masked: "••••3421" },
  { id: "4", name: "Granot (Supreme)", category: "Tariff Carrier", status: "disconnected", auth_type: "Manual", last_used: "2d ago", requests_24h: 0, error_rate: 0, cost_24h: 0, credentials_masked: "N/A" },
  { id: "5", name: "FMCSA Safety", category: "Regulatory", status: "ok", auth_type: "Public API", last_used: "1h ago", requests_24h: 38, error_rate: 0, cost_24h: 0, credentials_masked: "public" },
  { id: "6", name: "Supabase", category: "Database", status: "ok", auth_type: "Service Key", last_used: "1s ago", requests_24h: 14820, error_rate: 0.04, cost_24h: 2.10, credentials_masked: "sb-...c1d2" },
  { id: "7", name: "Lovable", category: "Deployment", status: "ok", auth_type: "GitHub", last_used: "live", requests_24h: 0, error_rate: 0, cost_24h: 0, credentials_masked: "linked" },
];

const ROUTING_RULES = [
  { task: "inventory_detection_photo", primary: "Gemini 2.5 Flash", fallback: "Claude (vision)", timeout: "8s", costCap: "$0.05" },
  { task: "pricing_calculation", primary: "ai-move-estimate-v2", fallback: "None", timeout: "100ms", costCap: "$0.001" },
  { task: "lead_enrichment", primary: "Hyper workflow", fallback: "Manual", timeout: "30s", costCap: "$0.50" },
  { task: "carrier_dispatch", primary: "FMCSA + Granot", fallback: "Manual queue", timeout: "12s", costCap: "$0.10" },
];

const WORKFLOWS = [
  { name: "intake_router", trigger: "Event — customer_form_submitted", status: "active" as Status, owner: "lead-enrichment-v1", lastRun: "47s ago", actions: ["validate_address", "enrich_lead", "estimate_pricing"] },
  { name: "pricing_engine", trigger: "Event — inventory_detected", status: "active" as Status, owner: "pricing-v2", lastRun: "2m ago", actions: ["calculate_cf", "lookup_tariff", "generate_quote"] },
  { name: "carrier_dispatch", trigger: "Event — move_booked", status: "active" as Status, owner: "dispatch-core", lastRun: "11m ago", actions: ["match_carrier", "verify_fmcsa", "send_offer"] },
  { name: "compliance_automation", trigger: "Event — quote_generated", status: "active" as Status, owner: "compliance", lastRun: "14m ago", actions: ["generate_work_file", "audit_trail", "archive"] },
  { name: "daily_health_check", trigger: "Scheduled — Daily 6am", status: "active" as Status, owner: "system", lastRun: "Today 6:00am", actions: ["ping_all", "rotate_logs"] },
];

const LOGS = [
  { time: "04:12:47", provider: "Gemini 2.5", task: "inventory_detection_photo", status: "ok", latency: "734ms", cost: "$0.008" },
  { time: "04:12:46", provider: "Google Maps", task: "distance_calculation", status: "ok", latency: "87ms", cost: "$0.005" },
  { time: "04:12:46", provider: "Pricing v2", task: "pricing_calculation", status: "ok", latency: "42ms", cost: "—" },
  { time: "04:12:41", provider: "Claude", task: "lead_enrichment", status: "ok", latency: "1.2s", cost: "$0.012" },
  { time: "04:12:30", provider: "Granot", task: "tariff_lookup", status: "error", latency: "—", cost: "—" },
];

const COSTS = [
  { provider: "Gemini 2.5 Pro", cost: "$487.23", pct: 34 },
  { provider: "Claude", cost: "$389.12", pct: 27 },
  { provider: "Google Maps", cost: "$312.45", pct: 22 },
  { provider: "Authorize.net", cost: "$156.78", pct: 11 },
  { provider: "Other", cost: "$73.04", pct: 6 },
];

function StatusDot({ status }: { status: Status }) {
  const tone: Record<Status, string> = {
    ok: "bg-success", active: "bg-success",
    idle: "bg-muted-foreground", paused: "bg-muted-foreground",
    degraded: "bg-warning",
    error: "bg-destructive",
    disconnected: "bg-muted-foreground/50",
  };
  const label: Record<Status, string> = {
    ok: "OK", idle: "IDLE", degraded: "DEGRADED", error: "ERROR",
    disconnected: "DISCONNECTED", active: "ACTIVE", paused: "PAUSED",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${tone[status]}`} />
      {label[status]}
    </span>
  );
}

const KPIS = [
  { label: "MCP Connection", value: "Online", sub: "All transports healthy" },
  { label: "Requests Routed (24h)", value: "19,314", sub: "+8.2% vs yesterday" },
  { label: "Avg Routing Latency", value: "184ms", sub: "p95 642ms" },
  { label: "Routing Errors (24h)", value: "0.31%", sub: "60 of 19,314" },
];

export default function HyperMcp() {
  const [tab, setTab] = useState("map");

  return (
    <AppShell>
      <PageHeader
        title="Hyper MCP"
        description="Central control plane for multi-channel orchestration, routing, and observability."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Stethoscope className="h-3.5 w-3.5" /> Test Routing
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6 max-w-[1400px]">
        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KPIS.map((k) => (
            <Card key={k.label} className="p-4 border-border bg-card shadow-[var(--shadow-card)]">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="text-2xl font-semibold tabular-nums text-foreground">{k.value}</div>
                <BackendRequired label="Live" />
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">{k.sub}</div>
            </Card>
          ))}
        </section>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="map" className="gap-1.5"><Network className="h-3.5 w-3.5" /> Map</TabsTrigger>
            <TabsTrigger value="connections" className="gap-1.5"><Plug className="h-3.5 w-3.5" /> Connections</TabsTrigger>
            <TabsTrigger value="routing" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Routing</TabsTrigger>
            <TabsTrigger value="workflows" className="gap-1.5"><WorkflowIcon className="h-3.5 w-3.5" /> Workflows</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Logs</TabsTrigger>
            <TabsTrigger value="cost" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Cost</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><SettingsIcon className="h-3.5 w-3.5" /> Settings</TabsTrigger>
          </TabsList>

          {/* MAP */}
          <TabsContent value="map" className="mt-4">
            <Card className="p-5 border-border bg-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Connection Graph</h3>
                  <p className="text-[11px] text-muted-foreground">Visual map of every system reachable through MCP</p>
                </div>
                <BackendRequired label="Reactflow graph" />
              </div>
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-8">
                <div className="grid grid-cols-3 gap-6">
                  {["Customer Intake", "Trudy Voice", "Lead Enrich"].map((n) => (
                    <div key={n} className="rounded border border-border bg-card p-3 text-center text-[11px] font-mono text-foreground">{n}</div>
                  ))}
                </div>
                <div className="my-4 text-center text-[10px] uppercase tracking-wider text-muted-foreground">↓ routed via MCP ↓</div>
                <div className="grid grid-cols-4 gap-6">
                  {["Claude", "Gemini", "Google Maps", "Pricing Engine"].map((n) => (
                    <div key={n} className="rounded border border-primary/30 bg-primary-soft p-3 text-center text-[11px] font-mono text-foreground">{n}</div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* CONNECTIONS */}
          <TabsContent value="connections" className="mt-4">
            <Card className="border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
                <div className="relative max-w-xs flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search connections..." className="pl-8 h-8 text-xs" />
                </div>
                <Button size="sm" className="gap-1.5 h-8"><Plus className="h-3.5 w-3.5" /> Add Connection</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-border bg-muted/30">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-2.5 px-4 font-medium">Name</th>
                      <th className="text-left py-2.5 px-4 font-medium">Category</th>
                      <th className="text-left py-2.5 px-4 font-medium">Status</th>
                      <th className="text-left py-2.5 px-4 font-medium">Auth</th>
                      <th className="text-right py-2.5 px-4 font-medium">Last Used</th>
                      <th className="text-right py-2.5 px-4 font-medium">Req 24h</th>
                      <th className="text-right py-2.5 px-4 font-medium">Err %</th>
                      <th className="text-right py-2.5 px-4 font-medium">Cost</th>
                      <th className="text-center py-2.5 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CONNECTIONS.map((c) => (
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 px-4 font-medium text-foreground">{c.name}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{c.category}</td>
                        <td className="py-2.5 px-4"><StatusDot status={c.status} /></td>
                        <td className="py-2.5 px-4 text-muted-foreground">{c.auth_type}</td>
                        <td className="py-2.5 px-4 text-right text-muted-foreground tabular-nums">{c.last_used}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-foreground">{c.requests_24h.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-foreground">{c.error_rate.toFixed(1)}%</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-foreground">${c.cost_24h.toFixed(2)}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><RotateCw className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><AlertCircle className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ROUTING */}
          <TabsContent value="routing" className="mt-4 space-y-3">
            {ROUTING_RULES.map((r) => (
              <Card key={r.task} className="p-5 border-border bg-card">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Task</div>
                    <code className="text-xs font-mono text-foreground">{r.task}</code>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Primary</div>
                    <Badge variant="secondary" className="font-mono text-[11px]">{r.primary}</Badge>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Fallback</div>
                    <Badge variant="outline" className="font-mono text-[11px]">{r.fallback}</Badge>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Timeout</div>
                    <div className="text-xs font-mono text-foreground">{r.timeout}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cost Cap</div>
                    <div className="text-xs font-mono text-foreground">{r.costCap}</div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* WORKFLOWS */}
          <TabsContent value="workflows" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="p-4 border-border bg-card">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Workflows</div>
                <div className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{WORKFLOWS.length}</div>
              </Card>
              <Card className="p-4 border-border bg-card">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Runs 24h</div>
                <div className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">487</div>
              </Card>
              <Card className="p-4 border-border bg-card">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Success Rate</div>
                <div className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">99.4%</div>
              </Card>
              <Card className="p-4 border-border bg-card">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Duration</div>
                <div className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">2.1s</div>
              </Card>
            </div>

            {WORKFLOWS.map((w) => (
              <Card key={w.name} className="p-5 border-border bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <code className="text-sm font-mono font-semibold text-foreground">{w.name}</code>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{w.trigger}</p>
                  </div>
                  <StatusDot status={w.status} />
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {w.actions.map((a) => (
                    <Badge key={a} variant="outline" className="font-mono text-[10px]">{a}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Owner: <code className="font-mono">{w.owner}</code> · Last run: {w.lastRun}</span>
                  <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"><Zap className="h-3 w-3" /> Trigger Now</Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* LOGS */}
          <TabsContent value="logs" className="mt-4">
            <Card className="border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
                <div className="relative max-w-xs flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search logs..." className="pl-8 h-8 text-xs" />
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 h-8"><Download className="h-3.5 w-3.5" /> Export</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-border bg-muted/30">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-2.5 px-4 font-medium">Time</th>
                      <th className="text-left py-2.5 px-4 font-medium">Provider</th>
                      <th className="text-left py-2.5 px-4 font-medium">Task</th>
                      <th className="text-left py-2.5 px-4 font-medium">Status</th>
                      <th className="text-right py-2.5 px-4 font-medium">Latency</th>
                      <th className="text-right py-2.5 px-4 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LOGS.map((l, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 px-4 font-mono text-muted-foreground tabular-nums">{l.time}</td>
                        <td className="py-2.5 px-4 text-foreground">{l.provider}</td>
                        <td className="py-2.5 px-4 font-mono text-foreground">{l.task}</td>
                        <td className="py-2.5 px-4"><StatusDot status={l.status as Status} /></td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-foreground">{l.latency}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-foreground">{l.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* COST */}
          <TabsContent value="cost" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Today", value: "$47.32" },
                { label: "7-Day Avg", value: "$44.60" },
                { label: "30-Day Total", value: "$1,418.62" },
                { label: "Budget Cap", value: "$2,000" },
              ].map((k) => (
                <Card key={k.label} className="p-4 border-border bg-card">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
                  <div className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{k.value}</div>
                </Card>
              ))}
            </div>
            <Card className="p-5 border-border bg-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Cost by Provider (30 days)</h3>
              <div className="space-y-3">
                {COSTS.map((c) => (
                  <div key={c.provider} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground">{c.provider}</span>
                        <span className="font-mono text-muted-foreground tabular-nums">{c.cost}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${c.pct}%` }} />
                      </div>
                    </div>
                    <span className="w-10 text-right text-[11px] font-mono text-muted-foreground tabular-nums">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings" className="mt-4">
            <Card className="p-5 border-border bg-card max-w-2xl">
              <h3 className="text-sm font-semibold text-foreground mb-1">Orchestration Configuration</h3>
              <p className="text-[11px] text-muted-foreground mb-5">Defaults applied to every routed request</p>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">Primary AI Model</label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option>Claude Opus 4.7 (Active)</option>
                    <option>Gemini 2.5 Pro</option>
                    <option>GPT-5</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">Payment Gateway</label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option>Authorize.net (Active)</option>
                    <option>Stripe (Variable)</option>
                    <option>Custom Gateway</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">Tariff Provider</label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option>Granot Supreme (Pending API)</option>
                    <option>Custom Tariff</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">Global Budget Cap (daily)</label>
                  <Input defaultValue="$2,000" className="h-9 text-sm" />
                </div>
                <div className="pt-2">
                  <Button size="sm">Save Configuration</Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
