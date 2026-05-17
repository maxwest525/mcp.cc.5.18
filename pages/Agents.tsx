import { useMemo, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Play, Settings2 } from "lucide-react";

type Category =
  | "core" | "design" | "content" | "marketing" | "communication"
  | "crm" | "data" | "ops" | "research"
  | "setup" | "diagnostics" | "workflow" | "mapping"
  | "compliance" | "deployment" | "executive"
  | "customer" | "dispatch" | "pricing";

type Risk = "low" | "medium" | "high";

interface Agent {
  key: string;
  name: string;
  category: Category;
  description: string;
  provider: string;
  model: string;
  risk: Risk;
  approval: boolean;
  source: "ai_command" | "hyper_mcp" | "runtime";
}

// 25 agents consolidated from TruMove CRM Final
//   15 from ai_command_agent_modules (planner, design, content, marketing, ops, crm, data, research)
//   7  from hyper_mcp_agents (operational HyperMCP agents)
//   3  runtime agents wired across the product (Trudy, Dispatch, Pricing Engine)
const AGENTS: Agent[] = [
  // --- ai_command_agent_modules (15)
  { key: "openai-planner",   name: "OpenAI Planner",          category: "core",          description: "Default reasoning, planning, and CRM logic agent.",                        provider: "OpenAI", model: "gpt-5-mini",        risk: "low",    approval: false, source: "ai_command" },
  { key: "frontend-design",  name: "Frontend Design Agent",   category: "design",        description: "Generates and refines visual design specs, tokens, and Tailwind layouts.", provider: "OpenAI", model: "gpt-5-mini",        risk: "low",    approval: false, source: "ai_command" },
  { key: "ux-ui",            name: "UX/UI Agent",             category: "design",        description: "Reviews user flows, wireframes, and interaction logic.",                   provider: "OpenAI", model: "gpt-5-mini",        risk: "low",    approval: false, source: "ai_command" },
  { key: "copywriting",      name: "Copywriting Agent",       category: "content",       description: "Writes high-converting marketing and product copy.",                       provider: "OpenAI", model: "gpt-5-mini",        risk: "low",    approval: false, source: "ai_command" },
  { key: "blog",             name: "Blog Agent",              category: "content",       description: "Drafts long-form blog articles with SEO structure.",                       provider: "OpenAI", model: "gpt-5-mini",        risk: "low",    approval: false, source: "ai_command" },
  { key: "seo-content",      name: "SEO Content Agent",       category: "marketing",     description: "Optimizes pages and produces SEO briefs and metadata.",                    provider: "OpenAI", model: "gpt-5-mini",        risk: "low",    approval: false, source: "ai_command" },
  { key: "blog-deployment",  name: "Blog Deployment Agent",   category: "ops",           description: "Publishes drafted blog content to the live site.",                         provider: "OpenAI", model: "gpt-5-mini",        risk: "medium", approval: true,  source: "ai_command" },
  { key: "landing-page",     name: "Landing Page Agent",      category: "marketing",     description: "Builds high-conversion landing page specs and copy.",                      provider: "OpenAI", model: "gpt-5-mini",        risk: "low",    approval: false, source: "ai_command" },
  { key: "email-sms",        name: "Email/SMS Agent",         category: "communication", description: "Drafts transactional and campaign Email/SMS sequences.",                   provider: "OpenAI", model: "gpt-5-mini",        risk: "medium", approval: true,  source: "ai_command" },
  { key: "ad-creative",      name: "Ad Creative Agent",       category: "marketing",     description: "Produces ad copy variants for Google and Meta.",                           provider: "OpenAI", model: "gpt-5-mini",        risk: "low",    approval: false, source: "ai_command" },
  { key: "crm-workflow",     name: "CRM Workflow Agent",      category: "crm",           description: "Builds and edits CRM pipelines, automations, and follow-up sequences.",    provider: "OpenAI", model: "gpt-5-mini",        risk: "medium", approval: true,  source: "ai_command" },
  { key: "analytics",        name: "Analytics Agent",         category: "data",          description: "Analyzes KPIs, pipeline performance, and reporting.",                      provider: "OpenAI", model: "gpt-5-mini",        risk: "low",    approval: false, source: "ai_command" },
  { key: "qa",               name: "QA Agent",                category: "ops",           description: "Reviews implementation against requirements and flags issues.",            provider: "OpenAI", model: "gpt-5-mini",        risk: "low",    approval: false, source: "ai_command" },
  { key: "hyper-scraper",    name: "Hyper Scraper Agent",     category: "research",      description: "Scrapes web data, SERP, and browser automation tasks.",                    provider: "Hyper",  model: "hyper/agent-router", risk: "medium", approval: true,  source: "ai_command" },
  { key: "hyper-marketing",  name: "Hyper Marketing Agent",   category: "research",      description: "Marketing research and competitor intelligence via Hyper.",                provider: "Hyper",  model: "hyper/agent-router", risk: "medium", approval: false, source: "ai_command" },

  // --- hyper_mcp_agents (7)
  { key: "setup-agent",      name: "Setup Agent",             category: "setup",         description: "Guides users through configuring integrations, credentials, and workflows.", provider: "Internal", model: "hypermcp-guidance", risk: "low",    approval: false, source: "hyper_mcp" },
  { key: "diagnostics-agent",name: "Diagnostics Agent",       category: "diagnostics",   description: "Investigates failed integrations, webhooks, queues, and system health.",   provider: "Internal", model: "hypermcp-guidance", risk: "low",    approval: false, source: "hyper_mcp" },
  { key: "workflow-agent",   name: "Workflow Agent",          category: "workflow",      description: "Helps create automation rules, templates, routing logic, and retries.",    provider: "Internal", model: "hypermcp-guidance", risk: "low",    approval: false, source: "hyper_mcp" },
  { key: "mapping-agent",    name: "Mapping Agent",           category: "mapping",       description: "Maps fields between systems and resolves schema conflicts.",               provider: "Internal", model: "hypermcp-guidance", risk: "low",    approval: false, source: "hyper_mcp" },
  { key: "compliance-agent", name: "Compliance Agent",        category: "compliance",    description: "Explains vendor guardrails, policy rules, escalation, and audit issues.",  provider: "Internal", model: "hypermcp-guidance", risk: "low",    approval: false, source: "hyper_mcp" },
  { key: "deployment-agent", name: "Deployment Agent",        category: "deployment",    description: "Reviews deployment readiness, promotion risk, and approval needs.",       provider: "Internal", model: "hypermcp-guidance", risk: "medium", approval: true,  source: "hyper_mcp" },
  { key: "executive-agent",  name: "Executive Summary Agent", category: "executive",     description: "Daily operational briefings: health, incidents, top priorities.",          provider: "Internal", model: "hypermcp-guidance", risk: "low",    approval: false, source: "hyper_mcp" },

  // --- runtime agents wired across the product (3)
  { key: "trudy",            name: "Trudy (Customer)",        category: "customer",      description: "Front-of-house chat & voice agent that answers customer questions.",       provider: "ElevenLabs + Gemini", model: "gemini-2.5-flash", risk: "low",    approval: false, source: "runtime" },
  { key: "dispatch-agent",   name: "Dispatch Agent",          category: "dispatch",      description: "Matches moves to carriers using FMCSA + Granot data.",                     provider: "Internal",            model: "dispatch-core",    risk: "medium", approval: true,  source: "runtime" },
  { key: "pricing-agent",    name: "Pricing Engine Agent",    category: "pricing",       description: "Computes tariff-based quotes from cube and route inputs.",                 provider: "Internal",            model: "ai-move-estimate-v2", risk: "low", approval: false, source: "runtime" },
];

const CAT_LABEL: Record<Category, string> = {
  core: "Core", design: "Design", content: "Content", marketing: "Marketing",
  communication: "Comms", crm: "CRM", data: "Data", ops: "Ops", research: "Research",
  setup: "Setup", diagnostics: "Diagnostics", workflow: "Workflow", mapping: "Mapping",
  compliance: "Compliance", deployment: "Deployment", executive: "Executive",
  customer: "Customer", dispatch: "Dispatch", pricing: "Pricing",
};

const SOURCE_LABEL: Record<Agent["source"], string> = {
  ai_command: "AI Command",
  hyper_mcp: "HyperMCP",
  runtime: "Runtime",
};

function RiskBadge({ risk }: { risk: Risk }) {
  const cls =
    risk === "high"   ? "bg-destructive/10 text-destructive border-destructive/30" :
    risk === "medium" ? "bg-warning/10 text-warning-foreground border-warning/30" :
                        "bg-success/10 text-success-foreground border-success/30";
  return (
    <span className={`inline-flex items-center text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${cls}`}>
      {risk}
    </span>
  );
}

export default function Agents() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"all" | Agent["source"]>("all");

  const filtered = useMemo(() => {
    return AGENTS.filter((a) => {
      if (source !== "all" && a.source !== source) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q)
      );
    });
  }, [query, source]);

  const counts = {
    all: AGENTS.length,
    ai_command: AGENTS.filter((a) => a.source === "ai_command").length,
    hyper_mcp: AGENTS.filter((a) => a.source === "hyper_mcp").length,
    runtime: AGENTS.filter((a) => a.source === "runtime").length,
  };

  return (
    <AppShell>
      <PageHeader
        title="Agents"
        description="All AI agents migrated from TruMove CRM Final into this Command Center."
        actions={
          <Button size="sm" className="gap-2">
            <Plus className="h-3.5 w-3.5" /> New Agent
          </Button>
        }
      />

      <div className="p-6 space-y-4 max-w-[1400px]">
        {/* Summary */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Agents", value: counts.all, sub: "Registered in Command Center" },
            { label: "AI Command Modules", value: counts.ai_command, sub: "Reasoning & creative" },
            { label: "HyperMCP Agents", value: counts.hyper_mcp, sub: "Operational guidance" },
            { label: "Runtime Agents", value: counts.runtime, sub: "Live in product surfaces" },
          ].map((k) => (
            <Card key={k.label} className="p-4 border-border bg-card shadow-[var(--shadow-card)]">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">{k.value}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{k.sub}</div>
            </Card>
          ))}
        </section>

        {/* Filter bar */}
        <Card className="p-3 border-border bg-card">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search agents, models, categories..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              {(["all","ai_command","hyper_mcp","runtime"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={source === s ? "default" : "outline"}
                  className="h-7 text-[11px]"
                  onClick={() => setSource(s)}
                >
                  {s === "all" ? "All" : SOURCE_LABEL[s]} · {counts[s]}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Agents table */}
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-2.5 px-4 font-medium">Agent</th>
                  <th className="text-left py-2.5 px-4 font-medium">Category</th>
                  <th className="text-left py-2.5 px-4 font-medium">Provider · Model</th>
                  <th className="text-left py-2.5 px-4 font-medium">Source</th>
                  <th className="text-left py-2.5 px-4 font-medium">Risk</th>
                  <th className="text-left py-2.5 px-4 font-medium">Approval</th>
                  <th className="text-center py-2.5 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.key} className="border-b border-border last:border-0 hover:bg-muted/30 align-top">
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{a.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground max-w-md">{a.description}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-[10px] font-normal">{CAT_LABEL[a.category]}</Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <div className="text-foreground">{a.provider}</div>
                      <code className="text-[10px] font-mono text-muted-foreground">{a.model}</code>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] font-normal">{SOURCE_LABEL[a.source]}</Badge>
                    </td>
                    <td className="py-3 px-4"><RiskBadge risk={a.risk} /></td>
                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      {a.approval ? "Required" : "Auto"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Run"><Play className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Configure"><Settings2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-muted-foreground text-xs">No agents match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
