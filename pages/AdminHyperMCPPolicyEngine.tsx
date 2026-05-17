import { useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import PageIntro from "@/components/hypermcp/PageIntro";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Plus, Search, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type Severity = "low" | "medium" | "high" | "critical";
type Status = "active" | "draft" | "disabled";

interface Policy {
  id: string;
  name: string;
  scope: string;
  severity: Severity;
  status: Status;
  triggers: number;
  blocks: number;
  lastEdited: string;
}

const POLICIES: Policy[] = [
  { id: "pol_001", name: "Block production deploys without approval", scope: "Deployment Center", severity: "critical", status: "active", triggers: 12, blocks: 3, lastEdited: "2d ago" },
  { id: "pol_002", name: "Require credential rotation every 90 days", scope: "Credential Lifecycle", severity: "high", status: "active", triggers: 47, blocks: 9, lastEdited: "5d ago" },
  { id: "pol_003", name: "PII fields must be masked in logs", scope: "Webhook Logs / Event Explorer", severity: "critical", status: "active", triggers: 312, blocks: 0, lastEdited: "1w ago" },
  { id: "pol_004", name: "Disallow webhooks from unverified vendors", scope: "Vendor Registry", severity: "high", status: "active", triggers: 28, blocks: 5, lastEdited: "3d ago" },
  { id: "pol_005", name: "AI agent fallback rate alert > 15%", scope: "AI Orchestration", severity: "medium", status: "active", triggers: 4, blocks: 0, lastEdited: "12h ago" },
  { id: "pol_006", name: "Schema breaking-change requires versioning", scope: "Schema Registry", severity: "high", status: "draft", triggers: 0, blocks: 0, lastEdited: "1d ago" },
  { id: "pol_007", name: "Sync job retries capped at 5 attempts", scope: "Sync Jobs / Task Queue", severity: "low", status: "active", triggers: 89, blocks: 0, lastEdited: "2w ago" },
  { id: "pol_008", name: "Block exports of customer PII to unmapped vendors", scope: "Data Mapping Studio", severity: "critical", status: "disabled", triggers: 0, blocks: 0, lastEdited: "3w ago" },
];

const sevColor: Record<Severity, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const statusColor: Record<Status, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  draft: "bg-blue-100 text-blue-800 border-blue-200",
  disabled: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function AdminHyperMCPPolicyEngine() {
  const [q, setQ] = useState("");
  const filtered = POLICIES.filter((p) =>
    [p.name, p.scope, p.id].some((t) => t.toLowerCase().includes(q.toLowerCase()))
  );

  const active = POLICIES.filter((p) => p.status === "active").length;
  const blocks = POLICIES.reduce((s, p) => s + p.blocks, 0);
  const triggers = POLICIES.reduce((s, p) => s + p.triggers, 0);
  const critical = POLICIES.filter((p) => p.severity === "critical" && p.status === "active").length;

  return (
    <HyperMCPShell breadcrumb="Policy Engine">
      <div className="space-y-5">
        <PageIntro
          title="Policy Engine"
          description="Define guardrails, automated enforcement rules, and compliance policies that apply across every HyperMCP module. Policies run in real time and can warn, require approval, or block sensitive actions."
          nextAction={{
            title: "Enable the recommended baseline policy pack",
            description: "Covers credential rotation, PII masking, deploy approvals, and vendor verification.",
          }}
          actions={
            <>
              <Button variant="outline" size="sm">
                <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Manage Packs
              </Button>
              <Button size="sm" className="bg-[#0F172A] hover:bg-[#1e293b]">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Policy
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Active Policies", value: active, icon: ShieldCheck, tone: "text-[#16A34A]" },
            { label: "Critical Active", value: critical, icon: ShieldAlert, tone: "text-red-600" },
            { label: "Triggers (24h)", value: triggers, icon: ShieldCheck, tone: "text-foreground/70" },
            { label: "Blocks (24h)", value: blocks, icon: ShieldAlert, tone: "text-amber-600" },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</span>
                <k.icon className={`w-4 h-4 ${k.tone}`} />
              </div>
              <div className="text-2xl font-semibold mt-1">{k.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="text-sm font-semibold">Policies</div>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search policies..."
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                  <th className="text-left font-medium px-3 py-2">Policy</th>
                  <th className="text-left font-medium px-3 py-2">Scope</th>
                  <th className="text-left font-medium px-3 py-2">Severity</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                  <th className="text-right font-medium px-3 py-2">Triggers</th>
                  <th className="text-right font-medium px-3 py-2">Blocks</th>
                  <th className="text-right font-medium px-3 py-2">Last Edited</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-muted/30 cursor-pointer">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{p.id}</div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{p.scope}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={`${sevColor[p.severity]} text-[10px] uppercase`}>
                        {p.severity}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={`${statusColor[p.status]} text-[10px] uppercase`}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.triggers}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.blocks}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground text-xs">{p.lastEdited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </HyperMCPShell>
  );
}
