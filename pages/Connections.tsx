import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { BackendRequiredCard } from "@/components/shell/BackendRequired";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Connections() {
  return (
    <AppShell>
      <PageHeader
        title="Connections"
        description="External tools, APIs, and credentials exposed to agents via MCP."
        actions={
          <Button size="sm" className="gap-2">
            <Plus className="h-3.5 w-3.5" /> Add Connection
          </Button>
        }
      />
      <div className="p-6 space-y-4 max-w-[1400px]">
        <Card className="p-0 border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Connected Systems</h2>
            <p className="text-[11px] text-muted-foreground">Provider, auth state, scopes, last sync</p>
          </div>
          <div className="p-5">
            <BackendRequiredCard
              title="No connections configured"
              description="Add provider credentials so MCP can expose them as tools to agents and workflows."
            />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
