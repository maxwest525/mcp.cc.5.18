import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { BackendRequiredCard } from "@/components/shell/BackendRequired";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Automation() {
  return (
    <AppShell>
      <PageHeader
        title="Automation"
        description="Scheduled jobs, triggers, and automation flows."
        actions={
          <Button size="sm" className="gap-2">
            <Plus className="h-3.5 w-3.5" /> New Automation
          </Button>
        }
      />
      <div className="p-6 space-y-4 max-w-[1400px]">
        <Card className="p-0 border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Active Automations</h2>
            <p className="text-[11px] text-muted-foreground">Trigger, target, schedule, last run</p>
          </div>
          <div className="p-5">
            <BackendRequiredCard
              title="No automations configured"
              description="Define triggers and target workflows once the automation engine is connected."
            />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
