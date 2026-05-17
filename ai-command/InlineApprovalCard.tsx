import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, ChevronDown, ChevronUp, Check, X as XIcon, Pencil,
  Loader2, CheckCircle2, AlertOctagon, ExternalLink,
} from "lucide-react";

export interface PendingAction {
  id: string;
  tool_name: string;
  summary: string;
  inputs: Record<string, any>;
  status: "pending_approval" | "approved" | "executed" | "rejected" | "failed" | "expired";
  risk_level: "low" | "medium" | "high";
  expires_at?: string | null;
  created_at: string;
  result?: any;
  result_record_id?: string | null;
  error?: string | null;
}

const RISK_COLOR: Record<string, string> = {
  low: "#39FF14",
  medium: "#f59e0b",
  high: "#ef4444",
};

const TOOL_LABEL: Record<string, string> = {
  create_ai_task: "Create AI Hub task",
};

interface Props {
  action: PendingAction;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onModify: (id: string, modifiedInputs: Record<string, any>, modifiedSummary: string) => Promise<void>;
}

export function InlineApprovalCard({ action, onApprove, onReject, onModify }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<"approve" | "reject" | "modify" | null>(null);

  const [draft, setDraft] = useState({
    title: action.inputs?.title ?? "",
    description: action.inputs?.description ?? "",
    priority: action.inputs?.priority ?? "medium",
    category: action.inputs?.category ?? "general",
    due_date: action.inputs?.due_date ?? "",
  });

  const isTerminal = action.status !== "pending_approval";
  const risk = action.risk_level ?? "medium";
  const accent = RISK_COLOR[risk] ?? "#f59e0b";
  const toolLabel = TOOL_LABEL[action.tool_name] ?? action.tool_name;

  const handle = async (op: "approve" | "reject") => {
    setBusy(op);
    try { op === "approve" ? await onApprove(action.id) : await onReject(action.id); }
    finally { setBusy(null); }
  };

  const submitModify = async () => {
    setBusy("modify");
    try {
      const newInputs = {
        ...action.inputs,
        title: draft.title,
        description: draft.description || null,
        priority: draft.priority,
        category: draft.category,
        due_date: draft.due_date || null,
      };
      const newSummary = `${toolLabel}: ${draft.title}`;
      await onModify(action.id, newInputs, newSummary);
      setEditing(false);
    } finally { setBusy(null); }
  };

  // Executed result card
  if (action.status === "executed") {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-3.5 text-xs">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4" style={{ color: "#39FF14" }} />
          <span className="font-semibold">Action executed</span>
          <Badge variant="outline" className="text-[9px]">{toolLabel}</Badge>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {new Date(action.created_at).toLocaleTimeString()}
          </span>
        </div>
        <div className="text-foreground/90">{action.result?.title ?? action.summary}</div>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>status: <span className="text-foreground/80">{action.result?.status ?? "open"}</span></span>
          {action.result_record_id && (
            <span className="font-mono">id: {action.result_record_id.slice(0, 8)}…</span>
          )}
          <a href="/hub/tasks" className="ml-auto inline-flex items-center gap-1 text-foreground hover:underline">
            View in Tasks <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  if (action.status === "rejected") {
    return (
      <div className="rounded-xl border border-border bg-muted/10 px-3.5 py-2.5 text-xs flex items-center gap-2 opacity-70">
        <XIcon className="h-3.5 w-3.5" />
        <span>Proposal rejected</span>
        <span className="text-muted-foreground">— {action.summary}</span>
      </div>
    );
  }

  if (action.status === "failed" || action.status === "expired") {
    return (
      <div className="rounded-xl border p-3 text-xs" style={{ borderColor: "#ef4444" }}>
        <div className="flex items-center gap-2">
          <AlertOctagon className="h-4 w-4" style={{ color: "#ef4444" }} />
          <span className="font-semibold">{action.status === "failed" ? "Execution failed" : "Proposal expired"}</span>
        </div>
        {action.error && <div className="mt-1 text-[11px] text-muted-foreground">{action.error}</div>}
      </div>
    );
  }

  // Pending approval card
  return (
    <div
      className="rounded-xl border bg-background overflow-hidden"
      style={{ borderColor: accent + "55", boxShadow: `0 0 0 1px ${accent}22` }}
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 flex items-center gap-2 border-b border-border bg-muted/20">
        <ShieldCheck className="h-4 w-4" style={{ color: accent }} />
        <span className="text-xs font-semibold">Approval required</span>
        <Badge
          variant="outline"
          className="text-[9px] uppercase"
          style={{ borderColor: accent, color: accent }}
        >
          {risk} risk
        </Badge>
        <Badge variant="outline" className="text-[9px]">{toolLabel}</Badge>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {new Date(action.created_at).toLocaleTimeString()}
        </span>
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        {!editing ? (
          <>
            <div className="text-sm font-medium leading-snug">{action.inputs?.title ?? action.summary}</div>
            {action.inputs?.description && (
              <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{action.inputs.description}</div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
              {action.inputs?.priority && <Badge variant="outline" className="text-[9px]">priority: {action.inputs.priority}</Badge>}
              {action.inputs?.category && <Badge variant="outline" className="text-[9px]">{action.inputs.category}</Badge>}
              {action.inputs?.due_date && <Badge variant="outline" className="text-[9px]">due {action.inputs.due_date}</Badge>}
            </div>

            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Hide details" : "Show proposed inputs"}
            </button>

            {expanded && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/40 p-2 text-[10px] font-mono text-foreground/80">
{JSON.stringify(action.inputs, null, 2)}
              </pre>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Title</div>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Description</div>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="min-h-[60px] text-xs"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Priority</div>
                <select
                  value={draft.priority}
                  onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                  className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Category</div>
                <Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Due date</div>
                <Input
                  type="date" value={draft.due_date}
                  onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3.5 py-2.5 border-t border-border bg-muted/10 flex items-center gap-2">
        {!editing ? (
          <>
            <Button
              size="sm" onClick={() => handle("approve")} disabled={busy !== null || isTerminal}
              style={{ backgroundColor: "#39FF14", color: "#000" }}
              className="h-7 px-3 text-xs"
            >
              {busy === "approve" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
              Approve & execute
            </Button>
            <Button
              size="sm" variant="outline" onClick={() => setEditing(true)}
              disabled={busy !== null} className="h-7 px-3 text-xs"
            >
              <Pencil className="h-3 w-3 mr-1" /> Modify
            </Button>
            <Button
              size="sm" variant="ghost" onClick={() => handle("reject")}
              disabled={busy !== null} className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              {busy === "reject" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XIcon className="h-3 w-3 mr-1" />}
              Reject
            </Button>
            <span className="ml-auto text-[10px] text-muted-foreground">
              Human-in-the-loop · awaits your approval
            </span>
          </>
        ) : (
          <>
            <Button size="sm" onClick={submitModify} disabled={busy !== null || !draft.title.trim()}
              style={{ backgroundColor: "#39FF14", color: "#000" }} className="h-7 px-3 text-xs">
              {busy === "modify" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
              Save & re-propose
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy !== null}
              className="h-7 px-3 text-xs">Cancel</Button>
          </>
        )}
      </div>
    </div>
  );
}
