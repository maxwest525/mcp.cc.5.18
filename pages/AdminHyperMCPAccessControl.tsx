import { useMemo, useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  KeyRound, Search, Download, Plus, ShieldCheck, ShieldAlert, Users,
  UserCog, Clock, AlertTriangle, CheckCircle2, XCircle, Lock, Unlock,
  ArrowUpRight, History, FileText, Crown, Eye, Wrench, Plug, Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ─────────── Types ─────────── */

type AccessGroup =
  | "view_only" | "operator" | "integration_admin"
  | "security_admin" | "deployment_admin" | "owner";

type AccessLevel = "standard" | "elevated" | "privileged" | "restricted";
type UserStatus = "active" | "suspended" | "review_required" | "expired";

interface SensitiveAction {
  key: string;
  label: string;
  allowed: boolean;
}

interface AccessUser {
  id: string;
  name: string;
  email: string;
  role: string;
  group: AccessGroup;
  level: AccessLevel;
  status: UserStatus;
  lastLogin: string;
  allowedModules: string[];
  restrictedModules: string[];
  sensitive: SensitiveAction[];
  recentSecurity: { ts: string; text: string; severity: "info" | "warn" | "alert" }[];
  approvals: { ts: string; action: string; by: string }[];
  changeHistory: { ts: string; field: string; from: string; to: string; by: string }[];
  reviewDue?: string;
  expiresAt?: string;
  conflicts?: string[];
  recentlyChanged?: boolean;
}

const GROUP_LABEL: Record<AccessGroup, string> = {
  view_only: "View Only",
  operator: "Operator",
  integration_admin: "Integration Admin",
  security_admin: "Security Admin",
  deployment_admin: "Deployment Admin",
  owner: "Owner",
};

const GROUP_ICON: Record<AccessGroup, any> = {
  view_only: Eye,
  operator: Wrench,
  integration_admin: Plug,
  security_admin: ShieldCheck,
  deployment_admin: Rocket,
  owner: Crown,
};

const SENSITIVE_KEYS = [
  { key: "credential_change", label: "Credential changes" },
  { key: "workflow_deploy", label: "Workflow deployments" },
  { key: "production_change", label: "Production changes" },
  { key: "policy_change", label: "Policy changes" },
  { key: "bulk_retry", label: "Bulk retries" },
  { key: "integration_disconnect", label: "Integration disconnects" },
  { key: "ai_action_approval", label: "AI action approvals" },
];

const mkSensitive = (allowed: string[]): SensitiveAction[] =>
  SENSITIVE_KEYS.map(s => ({ key: s.key, label: s.label, allowed: allowed.includes(s.key) }));

/* ─────────── Mock data ─────────── */

const USERS: AccessUser[] = [
  {
    id: "u_001", name: "Marcus Reyes", email: "marcus@trumoveinc.com",
    role: "Platform Owner", group: "owner", level: "privileged", status: "active",
    lastLogin: "8 min ago",
    allowedModules: ["All HyperMCP modules", "Billing", "Workspace Settings"],
    restrictedModules: [],
    sensitive: mkSensitive(SENSITIVE_KEYS.map(s => s.key)),
    recentSecurity: [
      { ts: "Today 09:14", text: "MFA challenge passed", severity: "info" },
      { ts: "Yesterday", text: "Approved production deploy v2.4.1", severity: "info" },
    ],
    approvals: [
      { ts: "Yesterday 17:02", action: "Approve deploy: lead-router v2.4.1", by: "self" },
      { ts: "3d ago", action: "Approve credential rotation: Twilio", by: "self" },
    ],
    changeHistory: [],
  },
  {
    id: "u_002", name: "Priya Natarajan", email: "priya@trumoveinc.com",
    role: "Security Admin", group: "security_admin", level: "elevated", status: "active",
    lastLogin: "32 min ago",
    allowedModules: ["Credentials Vault", "Audit Logs", "Approvals", "Access Control"],
    restrictedModules: ["Deployment Center"],
    sensitive: mkSensitive(["credential_change", "policy_change", "ai_action_approval"]),
    recentSecurity: [
      { ts: "Today 08:40", text: "Reviewed 4 access requests", severity: "info" },
      { ts: "2d ago", text: "Rotated Resend API key", severity: "warn" },
    ],
    approvals: [
      { ts: "2d ago", action: "Approve credential rotation: Resend", by: "Marcus Reyes" },
    ],
    changeHistory: [
      { ts: "2d ago", field: "sensitive.policy_change", from: "false", to: "true", by: "Marcus Reyes" },
    ],
    recentlyChanged: true,
  },
  {
    id: "u_003", name: "Devon Hayes", email: "devon@trumoveinc.com",
    role: "Deployment Admin", group: "deployment_admin", level: "elevated", status: "active",
    lastLogin: "1 hr ago",
    allowedModules: ["Deployment Center", "Environment Manager", "Schema Registry", "Observability"],
    restrictedModules: ["Credentials Vault"],
    sensitive: mkSensitive(["workflow_deploy", "production_change", "bulk_retry"]),
    recentSecurity: [{ ts: "1 hr ago", text: "Pushed staging deploy: webhook-router", severity: "info" }],
    approvals: [{ ts: "Yesterday", action: "Approve rollback: vendor-attribution v1.0.2", by: "Marcus Reyes" }],
    changeHistory: [],
  },
  {
    id: "u_004", name: "Sasha Lin", email: "sasha@trumoveinc.com",
    role: "Integration Admin", group: "integration_admin", level: "standard", status: "active",
    lastLogin: "4 hr ago",
    allowedModules: ["Integrations", "Integration Builder", "Webhook Logs", "Data Mapping"],
    restrictedModules: ["Credentials Vault", "Deployment Center"],
    sensitive: mkSensitive(["integration_disconnect"]),
    recentSecurity: [{ ts: "Today 06:12", text: "Edited mapping: lead.inbound.v3", severity: "info" }],
    approvals: [],
    changeHistory: [],
  },
  {
    id: "u_005", name: "Jordan Kim", email: "jordan@trumoveinc.com",
    role: "Operator", group: "operator", level: "standard", status: "active",
    lastLogin: "12 min ago",
    allowedModules: ["Task Queue", "Notifications", "Sync Jobs", "Event Explorer"],
    restrictedModules: ["Credentials Vault", "Deployment Center", "Access Control"],
    sensitive: mkSensitive(["bulk_retry"]),
    recentSecurity: [{ ts: "Today 10:01", text: "Retried 28 failed sync jobs", severity: "info" }],
    approvals: [],
    changeHistory: [],
  },
  {
    id: "u_006", name: "Avery Brooks", email: "avery@trumoveinc.com",
    role: "Operator (Contractor)", group: "operator", level: "elevated", status: "review_required",
    lastLogin: "2 days ago",
    allowedModules: ["Task Queue", "Notifications", "Webhook Logs"],
    restrictedModules: ["Credentials Vault", "Access Control", "Audit Logs"],
    sensitive: mkSensitive(["bulk_retry", "workflow_deploy"]),
    recentSecurity: [
      { ts: "2d ago", text: "Login from unusual IP", severity: "warn" },
      { ts: "5d ago", text: "Quarterly access review overdue", severity: "alert" },
    ],
    approvals: [],
    changeHistory: [
      { ts: "10d ago", field: "level", from: "standard", to: "elevated", by: "Devon Hayes" },
    ],
    reviewDue: "Overdue 5d",
    conflicts: ["Operator + workflow_deploy"],
  },
  {
    id: "u_007", name: "Reese Walker", email: "reese@trumoveinc.com",
    role: "Analyst", group: "view_only", level: "standard", status: "active",
    lastLogin: "20 min ago",
    allowedModules: ["Observability", "Audit Logs (read)", "Event Explorer (read)"],
    restrictedModules: ["All write actions"],
    sensitive: mkSensitive([]),
    recentSecurity: [{ ts: "Today 09:55", text: "Exported observability report", severity: "info" }],
    approvals: [],
    changeHistory: [],
  },
  {
    id: "u_008", name: "Omar Idris", email: "omar@vendor-partner.com",
    role: "External Partner", group: "view_only", level: "restricted", status: "expired",
    lastLogin: "21 days ago",
    allowedModules: ["Vendor Registry (own vendor)"],
    restrictedModules: ["All other modules"],
    sensitive: mkSensitive([]),
    recentSecurity: [{ ts: "21d ago", text: "Access expired", severity: "alert" }],
    approvals: [],
    changeHistory: [],
    expiresAt: "Expired 21d ago",
  },
  {
    id: "u_009", name: "Taylor Nguyen", email: "taylor@trumoveinc.com",
    role: "Integration Admin", group: "integration_admin", level: "elevated", status: "active",
    lastLogin: "1 hr ago",
    allowedModules: ["Integrations", "Credentials Vault (read)", "Webhook Logs", "Schema Registry"],
    restrictedModules: ["Deployment Center"],
    sensitive: mkSensitive(["credential_change", "integration_disconnect"]),
    recentSecurity: [{ ts: "Today", text: "Granted credential.read on FMCSA", severity: "warn" }],
    approvals: [{ ts: "Today", action: "Approve credential.read scope", by: "Priya Natarajan" }],
    changeHistory: [
      { ts: "Today", field: "sensitive.credential_change", from: "false", to: "true", by: "Priya Natarajan" },
    ],
    recentlyChanged: true,
  },
];

/* ─────────── Helpers ─────────── */

const statusBadge = (s: UserStatus) => {
  const map: Record<UserStatus, { cls: string; label: string }> = {
    active: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Active" },
    suspended: { cls: "bg-slate-100 text-slate-600 border-slate-200", label: "Suspended" },
    review_required: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Review required" },
    expired: { cls: "bg-red-50 text-red-700 border-red-200", label: "Expired" },
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border", map[s].cls)}>{map[s].label}</span>;
};

const levelBadge = (l: AccessLevel) => {
  const map: Record<AccessLevel, string> = {
    standard: "bg-slate-50 text-slate-700 border-slate-200",
    elevated: "bg-blue-50 text-blue-700 border-blue-200",
    privileged: "bg-violet-50 text-violet-700 border-violet-200",
    restricted: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border capitalize", map[l])}>{l}</span>;
};

const groupBadge = (g: AccessGroup) => {
  const Icon = GROUP_ICON[g];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border bg-slate-50 text-slate-700 border-slate-200">
      <Icon className="w-3 h-3" /> {GROUP_LABEL[g]}
    </span>
  );
};

/* ─────────── Page ─────────── */

export default function AdminHyperMCPAccessControl() {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<AccessGroup | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [selected, setSelected] = useState<AccessUser | null>(null);

  const filtered = useMemo(() =>
    USERS.filter(u => {
      if (groupFilter !== "all" && u.group !== groupFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.role.toLowerCase().includes(q)) return false;
      }
      return true;
    }), [query, groupFilter, statusFilter]);

  const kpis = {
    total: USERS.length,
    admins: USERS.filter(u => ["owner", "security_admin", "integration_admin", "deployment_admin"].includes(u.group)).length,
    elevated: USERS.filter(u => u.level === "elevated" || u.level === "privileged").length,
    pendingReviews: USERS.filter(u => u.status === "review_required" || u.reviewDue).length,
    restrictedActions: USERS.reduce((acc, u) => acc + u.sensitive.filter(s => !s.allowed).length, 0),
    recentChanges: USERS.filter(u => u.recentlyChanged).length,
  };

  const guardrails = {
    review: USERS.filter(u => u.status === "review_required" || u.reviewDue),
    elevated: USERS.filter(u => u.level === "elevated" || u.level === "privileged"),
    expired: USERS.filter(u => u.status === "expired" || u.expiresAt),
    conflicts: USERS.filter(u => u.conflicts && u.conflicts.length > 0),
    changed: USERS.filter(u => u.recentlyChanged),
  };

  const toggleSensitive = (key: string) => {
    if (!selected) return;
    const updated: AccessUser = {
      ...selected,
      sensitive: selected.sensitive.map(s => s.key === key ? { ...s, allowed: !s.allowed } : s),
    };
    setSelected(updated);
    toast.success(`Permission ${updated.sensitive.find(s => s.key === key)?.allowed ? "granted" : "revoked"}`);
  };

  return (
    <HyperMCPShell>
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-6 h-6 text-slate-700" />
              Access Control
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage role access, permissions, sensitive actions, and security controls.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => toast.success("Permission review queued")}>
              <ShieldCheck className="w-4 h-4 mr-1.5" /> Review Permissions
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Access report exported")}>
              <Download className="w-4 h-4 mr-1.5" /> Export Access Report
            </Button>
            <Button size="sm" onClick={() => toast.success("Access rule draft created")}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Access Rule
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "HyperMCP Users", value: kpis.total, icon: Users, tone: "text-slate-700" },
            { label: "Admin Users", value: kpis.admins, icon: ShieldCheck, tone: "text-violet-600" },
            { label: "Elevated Access", value: kpis.elevated, icon: UserCog, tone: "text-blue-600" },
            { label: "Pending Reviews", value: kpis.pendingReviews, icon: Clock, tone: "text-amber-600" },
            { label: "Restricted Actions", value: kpis.restrictedActions, icon: Lock, tone: "text-slate-700" },
            { label: "Recent Changes", value: kpis.recentChanges, icon: History, tone: "text-emerald-600" },
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

        {/* Permission groups */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-3 border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-700" /> Permission Groups
            </p>
            <p className="text-[11px] text-slate-500">Predefined role bundles applied to users</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-200">
            {(Object.keys(GROUP_LABEL) as AccessGroup[]).map(g => {
              const Icon = GROUP_ICON[g];
              const count = USERS.filter(u => u.group === g).length;
              return (
                <button
                  key={g}
                  onClick={() => setGroupFilter(g)}
                  className={cn(
                    "p-3 text-left hover:bg-slate-50 transition-colors",
                    groupFilter === g && "bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-700" />
                    <p className="text-sm font-medium text-slate-900">{GROUP_LABEL[g]}</p>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{count} user{count === 1 ? "" : "s"}</p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Filters + User Table */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-3 border-b border-slate-200 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search users, emails, roles..." className="pl-8 h-9 text-sm" />
            </div>
            <select value={groupFilter} onChange={e => setGroupFilter(e.target.value as AccessGroup | "all")}
              className="h-9 px-2 text-sm border border-slate-200 rounded bg-white text-slate-700">
              <option value="all">All groups</option>
              {(Object.keys(GROUP_LABEL) as AccessGroup[]).map(g => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as UserStatus | "all")}
              className="h-9 px-2 text-sm border border-slate-200 rounded bg-white text-slate-700">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="review_required">Review required</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
            <span className="text-xs text-slate-500 ml-auto">{filtered.length} of {USERS.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Role / Group</th>
                  <th className="px-3 py-2 font-medium">Access Level</th>
                  <th className="px-3 py-2 font-medium">Last Login</th>
                  <th className="px-3 py-2 font-medium">Sensitive Actions</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const allowedCount = u.sensitive.filter(s => s.allowed).length;
                  return (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(u)}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">{u.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{u.id}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-700 font-mono text-xs">{u.email}</td>
                      <td className="px-3 py-2">
                        <p className="text-slate-900">{u.role}</p>
                        <div className="mt-0.5">{groupBadge(u.group)}</div>
                      </td>
                      <td className="px-3 py-2">{levelBadge(u.level)}</td>
                      <td className="px-3 py-2 text-slate-600">{u.lastLogin}</td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-slate-700">
                          <span className="font-medium">{allowedCount}</span>
                          <span className="text-slate-400"> / {u.sensitive.length}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2">{statusBadge(u.status)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={ev => { ev.stopPropagation(); setSelected(u); }}>
                          Manage <ArrowUpRight className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Sensitive Action Controls + Guardrails */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-700" /> Sensitive Action Controls
              </p>
              <p className="text-[11px] text-slate-500">Coverage of sensitive actions across all users</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">Action</th>
                    <th className="px-3 py-2 font-medium">Allowed Users</th>
                    <th className="px-3 py-2 font-medium">Coverage</th>
                    <th className="px-3 py-2 font-medium text-right">Policy</th>
                  </tr>
                </thead>
                <tbody>
                  {SENSITIVE_KEYS.map(s => {
                    const allowed = USERS.filter(u => u.sensitive.find(x => x.key === s.key)?.allowed);
                    const pct = Math.round((allowed.length / USERS.length) * 100);
                    return (
                      <tr key={s.key} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-900 font-medium">{s.label}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {allowed.length === 0
                            ? <span className="text-slate-400">No users</span>
                            : allowed.slice(0, 3).map(u => u.name.split(" ")[0]).join(", ") + (allowed.length > 3 ? ` +${allowed.length - 3}` : "")}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-slate-100 rounded overflow-hidden">
                              <div className="h-full bg-slate-700" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => toast.info(`Editing policy: ${s.label}`)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <div className="p-3 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Review & Guardrails
              </p>
              <p className="text-[11px] text-slate-500">Items requiring administrator attention</p>
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              {[
                { label: "Requires access review", icon: Clock, tone: "text-amber-600", items: guardrails.review },
                { label: "Elevated permissions", icon: UserCog, tone: "text-blue-600", items: guardrails.elevated },
                { label: "Expired access", icon: XCircle, tone: "text-red-600", items: guardrails.expired },
                { label: "Conflicting permissions", icon: AlertTriangle, tone: "text-amber-600", items: guardrails.conflicts },
                { label: "Recently changed", icon: History, tone: "text-emerald-600", items: guardrails.changed },
              ].map((row, i) => (
                <div key={i} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <row.icon className={cn("w-4 h-4", row.tone)} />
                      <p className="text-slate-900 font-medium text-xs">{row.label}</p>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">{row.items.length}</span>
                  </div>
                  {row.items.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {row.items.slice(0, 4).map(u => (
                        <button key={u.id} onClick={() => setSelected(u)}
                          className="text-[11px] px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                          {u.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-slate-700" />
                  {selected.name}
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">{selected.email} · {selected.id}</SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-5">
                {/* Identity */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                    <p className="text-[11px] uppercase text-slate-500 font-medium">Role</p>
                    <p className="text-slate-900 mt-0.5">{selected.role}</p>
                  </div>
                  <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                    <p className="text-[11px] uppercase text-slate-500 font-medium">Group</p>
                    <div className="mt-1">{groupBadge(selected.group)}</div>
                  </div>
                  <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                    <p className="text-[11px] uppercase text-slate-500 font-medium">Access Level</p>
                    <div className="mt-1">{levelBadge(selected.level)}</div>
                  </div>
                  <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                    <p className="text-[11px] uppercase text-slate-500 font-medium">Status</p>
                    <div className="mt-1">{statusBadge(selected.status)}</div>
                  </div>
                </div>

                {/* Modules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="border border-slate-200 rounded">
                    <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                      <p className="text-xs font-semibold text-slate-900">Allowed Modules</p>
                    </div>
                    <ul className="p-2 space-y-1">
                      {selected.allowedModules.map((m, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border border-slate-200 rounded">
                    <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-red-600" />
                      <p className="text-xs font-semibold text-slate-900">Restricted Modules</p>
                    </div>
                    <ul className="p-2 space-y-1">
                      {selected.restrictedModules.length === 0 ? (
                        <li className="text-xs text-slate-400">No restrictions</li>
                      ) : selected.restrictedModules.map((m, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-center gap-1.5">
                          <XCircle className="w-3 h-3 text-red-600" /> {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Sensitive actions */}
                <div className="border border-slate-200 rounded">
                  <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                    <p className="text-xs font-semibold text-slate-900">Sensitive Action Permissions</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {selected.sensitive.map(s => (
                      <div key={s.key} className="px-3 py-2 flex items-center justify-between">
                        <p className="text-xs text-slate-800">{s.label}</p>
                        <button
                          onClick={() => toggleSensitive(s.key)}
                          className={cn(
                            "text-[11px] px-2 py-0.5 rounded border font-medium",
                            s.allowed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          )}
                        >
                          {s.allowed ? "Allowed" : "Blocked"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent security activity */}
                <div className="border border-slate-200 rounded">
                  <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-slate-700" />
                    <p className="text-xs font-semibold text-slate-900">Recent Security Activity</p>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {selected.recentSecurity.length === 0 && (
                      <li className="px-3 py-2 text-xs text-slate-400">No recent activity</li>
                    )}
                    {selected.recentSecurity.map((e, i) => (
                      <li key={i} className="px-3 py-2 flex items-start gap-2">
                        <span className={cn(
                          "mt-0.5 w-1.5 h-1.5 rounded-full",
                          e.severity === "info" && "bg-slate-400",
                          e.severity === "warn" && "bg-amber-500",
                          e.severity === "alert" && "bg-red-500",
                        )} />
                        <div className="flex-1">
                          <p className="text-xs text-slate-800">{e.text}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{e.ts}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Approval history */}
                <div className="border border-slate-200 rounded">
                  <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-700" />
                    <p className="text-xs font-semibold text-slate-900">Approval History</p>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {selected.approvals.length === 0 && (
                      <li className="px-3 py-2 text-xs text-slate-400">No approvals</li>
                    )}
                    {selected.approvals.map((a, i) => (
                      <li key={i} className="px-3 py-2">
                        <p className="text-xs text-slate-800">{a.action}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{a.ts} · by {a.by}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Permission change history */}
                <div className="border border-slate-200 rounded">
                  <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-slate-700" />
                    <p className="text-xs font-semibold text-slate-900">Permission Change History</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-white border-b border-slate-100">
                        <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-1.5 font-medium">When</th>
                          <th className="px-3 py-1.5 font-medium">Field</th>
                          <th className="px-3 py-1.5 font-medium">From</th>
                          <th className="px-3 py-1.5 font-medium">To</th>
                          <th className="px-3 py-1.5 font-medium">By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.changeHistory.length === 0 && (
                          <tr><td colSpan={5} className="px-3 py-2 text-slate-400">No changes recorded</td></tr>
                        )}
                        {selected.changeHistory.map((c, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="px-3 py-1.5 text-slate-600 font-mono">{c.ts}</td>
                            <td className="px-3 py-1.5 text-slate-800 font-mono">{c.field}</td>
                            <td className="px-3 py-1.5 text-slate-600 font-mono">{c.from}</td>
                            <td className="px-3 py-1.5 text-slate-900 font-mono">{c.to}</td>
                            <td className="px-3 py-1.5 text-slate-700">{c.by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                  <Button size="sm" variant="outline" onClick={() => toast.success("Access review requested")}>
                    <ShieldCheck className="w-4 h-4 mr-1.5" /> Request Review
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Session revoked")}>
                    <Lock className="w-4 h-4 mr-1.5" /> Revoke Sessions
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Audit log opened")}>
                    <FileText className="w-4 h-4 mr-1.5" /> View Audit Trail
                  </Button>
                  {selected.status !== "suspended" ? (
                    <Button size="sm" variant="destructive" onClick={() => toast.success("User suspended")}>
                      <XCircle className="w-4 h-4 mr-1.5" /> Suspend
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => toast.success("User reinstated")}>
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Reinstate
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}
