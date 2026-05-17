import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { BackendRequired } from "@/components/shell/BackendRequired";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare } from "lucide-react";

export default function AiChat() {
  return (
    <AppShell>
      <PageHeader
        title="AI Chat"
        description="Operator chat with the orchestrator. Routes through Hyper MCP."
        actions={<BackendRequired label="Model not connected" />}
      />
      <div className="flex-1 p-6 max-w-[1100px] w-full flex flex-col gap-4 min-h-0">
        <Card className="flex-1 border-border bg-card flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-8 flex items-center justify-center">
            <div className="text-center max-w-md">
              <MessageSquare className="h-6 w-6 text-muted-foreground mx-auto" strokeWidth={1.5} />
              <p className="mt-3 text-sm font-medium text-foreground">No conversation yet</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Connect an AI model gateway to enable chat. Messages will route through Hyper MCP
                so the assistant can call registered tools and agents.
              </p>
            </div>
          </div>
          <div className="border-t border-border p-3 flex items-center gap-2">
            <Input
              placeholder="Send a message…"
              disabled
              className="bg-background border-border text-sm"
            />
            <Button size="sm" disabled className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Send
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
