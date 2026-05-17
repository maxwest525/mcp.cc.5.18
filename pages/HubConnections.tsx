import { useEffect, useMemo, useState } from "react";
import {
  listProviders as sdkListProviders,
  listConnections as sdkListConnections,
  listTools as sdkListTools,
  verifyProvider as sdkVerifyProvider,
  invalidateProvidersCache,
  invalidateConnectionsCache,
} from "@/lib/ai-hub";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HubStatusBadge } from "@/components/ai-command/HubStatusBadge";
import { toast } from "@/hooks/use-toast";
import { Sparkles, RefreshCw, ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";

type Connection = {
  key: string; name: string; kind: string; category: string; status: string;
  description: string; enables: string; setup_help: string;
  required_secrets: string[]; tags: string[]; priority: number;
  provider_url?: string | null; last_verified_at?: string | null;
};
type Provider = Connection & { default_model?: string | null };

const CATEGORY_LABELS: Record<string, string> = {
  ai_models: "AI Models & Providers",
  mcp_agents: "MCP / Agent Platforms",
  marketing_intelligence: "Marketing Intelligence",
  ads_analytics: "Ads & Analytics",
  crm_sales: "CRM / Lead / Sales",
  communications: "Communications",
  maps_logistics: "Maps / Logistics / Data",
  development: "Development / Publishing",
  automation_webhooks: "Automation / Webhooks",
  internal_tools: "Internal CRM Tools",
  other: "Other",
};

const TAG_LABEL: Record<string, string> = {
  core_ai_runtime: "Core AI Runtime",
  marketing_brain: "Marketing Brain",
  research_data: "Research / Data",
  execution_layer: "Execution Layer",
  publishing_deployment: "Publishing / Deployment",
  crm_operations: "CRM Operations",
  communications: "Communications",
  optional_enhancement: "Optional",
};

function askAI(connection: Connection) {
  const msg = `Help me connect ${connection.name}. What do you need from me, what credentials are required, and what will this unlock for the AI Operations Hub once it's connected?`;
  window.dispatchEvent(new CustomEvent("ai-hub:open-with-message", { detail: { message: msg, connection_key: connection.key } }));
}

export default function HubConnections() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      invalidateProvidersCache();
      invalidateConnectionsCache();
      const [prov, conns, tls] = await Promise.all([
        sdkListProviders(true),
        sdkListConnections(true),
        sdkListTools(true),
      ]);
      setProviders(prov as unknown as Provider[]);
      setConnections(conns as unknown as Connection[]);
      setTools(tls);
    } catch (e: any) {
      toast({ title: "Failed to load registry", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const verifyProvider = async (key: string) => {
    setVerifying(key);
    const result = await sdkVerifyProvider(key);
    setVerifying(null);
    toast({
      title: result.ok ? "Verified" : "Verification failed",
      description: result.error ?? `${key} is now ${result.provider?.status ?? "updated"}`,
      variant: result.ok ? "default" : "destructive",
    });
    load();
  };

  const summary = useMemo(() => {
    const ok = connections.filter(c => ["configured","active","verified"].includes(c.status));
    const need = connections.filter(c => c.status === "not_configured");
    const verified = providers.filter(p => p.status === "verified").length;
    return { connected: ok.length, needSetup: need.length, providersVerified: verified, totalProviders: providers.length, tools: tools.length };
  }, [connections, providers, tools]);

  const grouped = useMemo(() => {
    const g: Record<string, Connection[]> = {};
    [...connections].sort((a,b) => (a.priority - b.priority) || a.name.localeCompare(b.name)).forEach(c => {
      const cat = c.category || "other"; (g[cat] ??= []).push(c);
    });
    return g;
  }, [connections]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Connections</h1>
          <p className="text-muted-foreground text-sm mt-1">Every platform, API, and provider available to the AI Operations Hub.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Connected & Ready", value: summary.connected, hint: "Secrets present" },
          { label: "Setup Required", value: summary.needSetup, hint: "Awaiting credentials" },
          { label: "Providers Verified", value: `${summary.providersVerified}/${summary.totalProviders}`, hint: "Real ping ok" },
          { label: "AI Tools Available", value: summary.tools, hint: "Read-only inspection" },
          { label: "Total Connectors", value: connections.length, hint: "Across all categories" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="text-2xl font-semibold">{s.value}</div>
              <div className="text-sm font-medium mt-1">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Providers */}
      <section>
        <h2 className="text-xl font-semibold mb-3">LLM Providers</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {providers.map(p => (
            <Card key={p.key}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <HubStatusBadge status={p.status as any} />
                </div>
                <CardDescription className="text-xs">{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {p.enables && <div className="text-xs"><span className="font-medium">Enables:</span> {p.enables}</div>}
                {p.default_model && <div className="text-xs text-muted-foreground">Default: <code>{p.default_model}</code></div>}
                <div className="flex flex-wrap gap-1">
                  {(p.tags ?? []).map(t => <Badge key={t} variant="secondary" className="text-[10px]">{TAG_LABEL[t] ?? t}</Badge>)}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => verifyProvider(p.key)} disabled={verifying === p.key}>
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" />{verifying === p.key ? "Verifying…" : "Verify"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => askAI(p as any)}>
                    <Sparkles className="h-3.5 w-3.5 mr-1" />Ask AI
                  </Button>
                </div>
                {p.last_verified_at && <div className="text-[10px] text-muted-foreground">Last verified: {new Date(p.last_verified_at).toLocaleString()}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Categorized connections */}
      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat}>
          <h2 className="text-xl font-semibold mb-3">{CATEGORY_LABELS[cat] ?? cat}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(c => (
              <Card key={c.key} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <HubStatusBadge status={c.status as any} />
                  </div>
                  <CardDescription className="text-xs">{c.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 flex-1 flex flex-col">
                  {c.enables && (
                    <div className="text-xs"><span className="font-medium">What this lets the AI do:</span> {c.enables}</div>
                  )}
                  {c.required_secrets?.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Needs:</span> {c.required_secrets.join(", ")}
                    </div>
                  )}
                  {c.status === "not_configured" && c.setup_help && (
                    <div className="text-xs flex items-start gap-1 text-amber-700 dark:text-amber-400">
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /><span>{c.setup_help}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {(c.tags ?? []).map(t => <Badge key={t} variant="secondary" className="text-[10px]">{TAG_LABEL[t] ?? t}</Badge>)}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" variant="default" onClick={() => askAI(c)}>
                      <Sparkles className="h-3.5 w-3.5 mr-1" />Ask AI to Help Set Up
                    </Button>
                    {c.provider_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={c.provider_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" />Open</a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
