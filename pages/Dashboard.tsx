import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { BackendRequired } from "@/components/shell/BackendRequired";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Bot, Cpu, Workflow, Zap, RefreshCw } from "lucide-react";

const KPIS = [
  { label: "MCP Servers", value: "—", icon: Cpu },
  { label: "Active Agents", value: "—", icon: Bot },
  { label: "Workflows Today", value: "—", icon: Workflow },
  { label: "Automations Running", value: "—", icon: Zap },
];

export default function Dashboard() {
  return (
    <AppShell>
      <PageHeader
        title="Command Center"
        description="Operational overview of agents, workflows, and MCP routing."
        actions={
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      <div className="p-6 space-y-6 max-w-[1400px]">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KPIS.map((k) => {
            const Icon = k.icon;
            return (
              <Card key={k.label} className="p-4 border-border bg-card shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {k.label}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="text-2xl font-semibold tabular-nums text-foreground">{k.value}</div>
                  <BackendRequired label="Live" />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">Awaiting data source</div>
              </Card>
            );
          })}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="lg:col-span-2 p-5 border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">System Activity</h2>
                <p className="text-[11px] text-muted-foreground">Live stream of orchestration events</p>
              </div>
              <StatusBadge tone="neutral">Idle</StatusBadge>
            </div>
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
              <Activity className="h-5 w-5 text-muted-foreground mx-auto" strokeWidth={1.5} />
              <p className="mt-2 text-sm text-foreground">No events yet</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Connect agents and MCP servers to begin streaming activity.
              </p>
              <div className="mt-3"><BackendRequired /></div>
            </div>
          </Card>

          <Card className="p-5 border-border bg-card">
            <h2 className="text-sm font-semibold text-foreground mb-1">System Health</h2>
            <p className="text-[11px] text-muted-foreground mb-4">Subsystem status</p>
            <ul className="space-y-2.5 text-[13px]">
              {[
                { name: "MCP Router", tone: "neutral" as const, value: "Unknown" },
                { name: "Agent Runtime", tone: "neutral" as const, value: "Unknown" },
                { name: "Workflow Engine", tone: "neutral" as const, value: "Unknown" },
                { name: "Event Bus", tone: "neutral" as const, value: "Unknown" },
              ].map((s) => (
                <li key={s.name} className="flex items-center justify-between">
                  <span className="text-foreground">{s.name}</span>
                  <StatusBadge tone={s.tone}>{s.value}</StatusBadge>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
