import { useState } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Save, RotateCcw, Settings, Plug, Webhook, Workflow, Bell, Lock } from "lucide-react";
import { toast } from "sonner";
import AgentSettingsSection from "@/components/hypermcp/AgentSettingsSection";

interface SettingsState {
  // General
  workspaceName: string;
  environment: "production" | "test";
  timezone: string;
  syncFrequency: string;
  healthMonitoring: boolean;
  failureNotifications: boolean;
  // Integration defaults
  retryAttempts: number;
  retryDelay: number;
  apiTimeout: number;
  autoDisableOnFailure: boolean;
  manualApprovalReauth: boolean;
  // Webhook & event
  webhookRetentionDays: number;
  payloadLogging: "minimal" | "standard" | "full";
  retryFailedWebhooks: boolean;
  deadLetterQueue: boolean;
  storeResponsePayloads: boolean;
  // Automation
  executionMode: "live" | "test" | "manual";
  autoRunApproved: boolean;
  maxConcurrent: number;
  escalateFailed: boolean;
  // Alerts
  alertOnDisconnect: boolean;
  alertOnLatency: boolean;
  alertOnSyncFail: boolean;
  alertOnMappingConflict: boolean;
  alertOnCredExpiring: boolean;
  // Security
  restrictRoleAccess: boolean;
  elevatedApprovalCreds: boolean;
  logAdminActions: boolean;
  sensitiveSessionTimeout: number;
}

const DEFAULTS: SettingsState = {
  workspaceName: "HyperMCP — TruMove",
  environment: "production",
  timezone: "America/New_York",
  syncFrequency: "15m",
  healthMonitoring: true,
  failureNotifications: true,
  retryAttempts: 3,
  retryDelay: 30,
  apiTimeout: 15,
  autoDisableOnFailure: true,
  manualApprovalReauth: true,
  webhookRetentionDays: 30,
  payloadLogging: "standard",
  retryFailedWebhooks: true,
  deadLetterQueue: true,
  storeResponsePayloads: false,
  executionMode: "live",
  autoRunApproved: true,
  maxConcurrent: 25,
  escalateFailed: true,
  alertOnDisconnect: true,
  alertOnLatency: true,
  alertOnSyncFail: true,
  alertOnMappingConflict: true,
  alertOnCredExpiring: true,
  restrictRoleAccess: true,
  elevatedApprovalCreds: true,
  logAdminActions: true,
  sensitiveSessionTimeout: 10,
};

const Section = ({
  icon: Icon, title, description, children,
}: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) => (
  <Card className="border-border/70">
    <CardContent className="p-5">
      <div className="flex items-start gap-3 pb-4 mb-4 border-b border-border/60">
        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </CardContent>
  </Card>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-12 gap-3 items-center py-1.5">
    <div className="col-span-12 sm:col-span-5">
      <Label className="text-xs font-medium">{label}</Label>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
    <div className="col-span-12 sm:col-span-7 flex items-center justify-end">{children}</div>
  </div>
);

const Toggle = ({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-4 py-1.5 border-t border-border/40 first:border-t-0">
    <div>
      <Label className="text-xs font-medium">{label}</Label>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default function AdminHyperMCPSettings() {
  const [s, setS] = useState<SettingsState>(DEFAULTS);
  const set = <K extends keyof SettingsState>(k: K, v: SettingsState[K]) =>
    setS(prev => ({ ...prev, [k]: v }));

  return (
    <HyperMCPShell breadcrumbs={[{ label: "Settings" }]}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure HyperMCP workspace behavior, system defaults, and orchestration preferences.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setS(DEFAULTS); toast.success("Restored defaults"); }}>
              <RotateCcw className="w-4 h-4 mr-1" />Reset to Defaults
            </Button>
            <Button size="sm" onClick={() => toast.success("Settings saved")}>
              <Save className="w-4 h-4 mr-1" />Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* General */}
          <Section icon={Settings} title="General Workspace" description="Identity, environment and baseline operating preferences.">
            <Field label="Workspace Name">
              <Input value={s.workspaceName} onChange={e => set("workspaceName", e.target.value)} className="h-8 text-xs max-w-[260px]" />
            </Field>
            <Field label="Environment Mode">
              <Select value={s.environment} onValueChange={v => set("environment", v as any)}>
                <SelectTrigger className="h-8 text-xs max-w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default Timezone">
              <Select value={s.timezone} onValueChange={v => set("timezone", v)}>
                <SelectTrigger className="h-8 text-xs max-w-[260px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">America/New_York (ET)</SelectItem>
                  <SelectItem value="America/Chicago">America/Chicago (CT)</SelectItem>
                  <SelectItem value="America/Denver">America/Denver (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (PT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default Sync Frequency">
              <Select value={s.syncFrequency} onValueChange={v => set("syncFrequency", v)}>
                <SelectTrigger className="h-8 text-xs max-w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Every 1 minute</SelectItem>
                  <SelectItem value="5m">Every 5 minutes</SelectItem>
                  <SelectItem value="15m">Every 15 minutes</SelectItem>
                  <SelectItem value="30m">Every 30 minutes</SelectItem>
                  <SelectItem value="1h">Every hour</SelectItem>
                  <SelectItem value="manual">Manual only</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="pt-2">
              <Toggle label="Enable system health monitoring" hint="Continuous probes for connected integrations."
                checked={s.healthMonitoring} onChange={v => set("healthMonitoring", v)} />
              <Toggle label="Enable failure notifications" hint="Notify on integration or sync failures."
                checked={s.failureNotifications} onChange={v => set("failureNotifications", v)} />
            </div>
          </Section>

          {/* Integration defaults */}
          <Section icon={Plug} title="Integration Defaults" description="Retry policy and failure handling for connected systems.">
            <Field label="Default retry attempts" hint="Applies to outbound API calls and syncs.">
              <Input type="number" min={0} max={10} value={s.retryAttempts}
                onChange={e => set("retryAttempts", parseInt(e.target.value) || 0)}
                className="h-8 text-xs w-24 text-center" />
            </Field>
            <Field label="Retry delay (seconds)">
              <Input type="number" min={0} value={s.retryDelay}
                onChange={e => set("retryDelay", parseInt(e.target.value) || 0)}
                className="h-8 text-xs w-24 text-center" />
            </Field>
            <Field label="API timeout threshold (seconds)">
              <Input type="number" min={1} value={s.apiTimeout}
                onChange={e => set("apiTimeout", parseInt(e.target.value) || 0)}
                className="h-8 text-xs w-24 text-center" />
            </Field>
            <div className="pt-2">
              <Toggle label="Auto-disable integrations after repeated failures"
                hint="Pauses integration after threshold to prevent cascading errors."
                checked={s.autoDisableOnFailure} onChange={v => set("autoDisableOnFailure", v)} />
              <Toggle label="Require manual approval before re-authentication"
                hint="Admin must approve any OAuth or credential refresh."
                checked={s.manualApprovalReauth} onChange={v => set("manualApprovalReauth", v)} />
            </div>
          </Section>

          {/* Webhook & event */}
          <Section icon={Webhook} title="Webhooks & Events" description="Retention, logging depth and replay behavior.">
            <Field label="Webhook retention (days)">
              <Input type="number" min={1} max={365} value={s.webhookRetentionDays}
                onChange={e => set("webhookRetentionDays", parseInt(e.target.value) || 1)}
                className="h-8 text-xs w-24 text-center" />
            </Field>
            <Field label="Payload logging level">
              <Select value={s.payloadLogging} onValueChange={v => set("payloadLogging", v as any)}>
                <SelectTrigger className="h-8 text-xs max-w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="pt-2">
              <Toggle label="Automatically retry failed webhooks"
                checked={s.retryFailedWebhooks} onChange={v => set("retryFailedWebhooks", v)} />
              <Toggle label="Dead-letter queue enabled"
                hint="Capture exhausted retries for manual review."
                checked={s.deadLetterQueue} onChange={v => set("deadLetterQueue", v)} />
              <Toggle label="Store response payloads"
                hint="Increases storage usage; useful for diagnostics."
                checked={s.storeResponsePayloads} onChange={v => set("storeResponsePayloads", v)} />
            </div>
          </Section>

          {/* Automation */}
          <Section icon={Workflow} title="Automation Defaults" description="Execution mode and concurrency limits for workflows.">
            <Field label="Automation execution mode">
              <Select value={s.executionMode} onValueChange={v => set("executionMode", v as any)}>
                <SelectTrigger className="h-8 text-xs max-w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="manual">Manual Review</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Max concurrent workflows">
              <Input type="number" min={1} max={500} value={s.maxConcurrent}
                onChange={e => set("maxConcurrent", parseInt(e.target.value) || 1)}
                className="h-8 text-xs w-24 text-center" />
            </Field>
            <div className="pt-2">
              <Toggle label="Auto-run approved workflows"
                checked={s.autoRunApproved} onChange={v => set("autoRunApproved", v)} />
              <Toggle label="Escalate failed automations"
                hint="Forwards failures to designated admin reviewers."
                checked={s.escalateFailed} onChange={v => set("escalateFailed", v)} />
            </div>
          </Section>

          {/* Alerts */}
          <Section icon={Bell} title="Alert Preferences" description="Choose which orchestration events generate alerts.">
            <Toggle label="Integration disconnects"
              checked={s.alertOnDisconnect} onChange={v => set("alertOnDisconnect", v)} />
            <Toggle label="API latency spikes"
              checked={s.alertOnLatency} onChange={v => set("alertOnLatency", v)} />
            <Toggle label="Sync job fails"
              checked={s.alertOnSyncFail} onChange={v => set("alertOnSyncFail", v)} />
            <Toggle label="User mapping conflicts found"
              checked={s.alertOnMappingConflict} onChange={v => set("alertOnMappingConflict", v)} />
            <Toggle label="Credential is expiring"
              checked={s.alertOnCredExpiring} onChange={v => set("alertOnCredExpiring", v)} />
          </Section>

          {/* Security */}
          <Section icon={Lock} title="Security & Access" description="Restrict access and harden sensitive surfaces.">
            <Toggle label="Restrict HyperMCP access to role users only"
              hint="Only users with HyperMCP role permissions may enter the workspace."
              checked={s.restrictRoleAccess} onChange={v => set("restrictRoleAccess", v)} />
            <Toggle label="Require elevated approval for credential changes"
              hint="Two-admin approval required before saving credential edits."
              checked={s.elevatedApprovalCreds} onChange={v => set("elevatedApprovalCreds", v)} />
            <Toggle label="Log all admin actions"
              checked={s.logAdminActions} onChange={v => set("logAdminActions", v)} />
            <Field label="Session timeout for credential screens (minutes)"
              hint="Inactive sessions on credential pages auto-lock after this many minutes.">
              <Input type="number" min={1} max={120} value={s.sensitiveSessionTimeout}
                onChange={e => set("sensitiveSessionTimeout", parseInt(e.target.value) || 1)}
                className="h-8 text-xs w-24 text-center" />
            </Field>
          </Section>

          {/* AI Agents */}
          <AgentSettingsSection />
        </div>
      </div>
    </HyperMCPShell>
  );
}
