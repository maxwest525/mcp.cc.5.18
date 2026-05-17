import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, ListTodo } from "lucide-react";

interface Pending {
  id: string;
  tool_name: string;
  summary: string;
  inputs: any;
  status: string;
  risk_level: string;
  expires_at: string;
  created_at: string;
}
interface Task {
  id: string; title: string; description: string | null;
  category: string; priority: string; status: string;
  related_connector: string | null; due_date: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  blocked: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  urgent: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export default function HubTasks() {
  const [pending, setPending] = useState<Pending[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from("ai_hub_pending_actions").select("*")
        .eq("status", "pending_approval").order("created_at", { ascending: false }),
      supabase.from("ai_hub_tasks").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setPending((p as Pending[]) ?? []);
    setTasks((t as Task[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const decide = async (id: string, decision: "approve" | "reject") => {
    setBusy(id);
    try {
      const { data, error } = await supabase.functions.invoke("ai-hub-approve-action", {
        body: { proposal_id: id, decision },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "failed");
      toast({
        title: decision === "approve" ? "Action executed" : "Proposal rejected",
        description: decision === "approve" ? `Created record ${data.record_id}` : undefined,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const updateTaskStatus = async (id: string, status: string) => {
    await supabase.from("ai_hub_tasks").update({ status }).eq("id", id);
    await load();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListTodo className="h-7 w-7" /> AI Hub Tasks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tasks created by the AI Operations Hub and pending action proposals awaiting approval.
        </p>
      </div>

      {/* Pending approvals */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Pending Approvals
          <Badge variant="secondary" className="ml-1">{pending.length}</Badge>
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : pending.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            Nothing waiting. When the AI proposes a write action (e.g. <code>create_ai_task</code>),
            it will appear here for one-click approval.
          </Card>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <Card key={p.id} className="p-4 border-l-4 border-l-amber-500">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-[10px]">{p.tool_name}</Badge>
                      <Badge className={PRIORITY_COLORS[p.risk_level] ?? PRIORITY_COLORS.medium}>
                        risk: {p.risk_level}
                      </Badge>
                    </div>
                    <p className="font-medium">{p.summary}</p>
                    <pre className="mt-2 text-[11px] bg-muted/50 rounded p-2 overflow-x-auto max-h-40">
{JSON.stringify(p.inputs, null, 2)}
                    </pre>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" onClick={() => decide(p.id, "approve")} disabled={busy === p.id}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decide(p.id, "reject")} disabled={busy === p.id}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Tasks */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Tasks <Badge variant="secondary" className="ml-1">{tasks.length}</Badge>
        </h2>
        {tasks.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No tasks yet. Open the AI Operations Hub and ask it to create one.
          </Card>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={STATUS_COLORS[t.status] ?? ""}>{t.status.replace("_", " ")}</Badge>
                      <Badge className={PRIORITY_COLORS[t.priority] ?? ""}>{t.priority}</Badge>
                      <Badge variant="outline">{t.category}</Badge>
                      {t.related_connector && (
                        <Badge variant="outline" className="font-mono text-[10px]">{t.related_connector}</Badge>
                      )}
                    </div>
                    <p className="font-medium">{t.title}</p>
                    {t.description && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{t.description}</p>
                    )}
                  </div>
                  <select
                    className="border rounded px-2 py-1 text-xs bg-background"
                    value={t.status}
                    onChange={(e) => updateTaskStatus(t.id, e.target.value)}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
