# HyperMCP — Pulled from TruMove CRM Final

Source project: `TruMove CRM Final` (`128b488c-44b4-491c-81db-13ee1d434085`)

These are the original HyperMCP files preserved verbatim from the source
project's git history. They are NOT wired into the app — the active
implementation lives at `src/pages/HyperMcp.tsx`. Use these as reference
when porting features.

## Files

| Original path | Local copy |
|---|---|
| `crm/src/pages/HyperMCP.tsx` | `HyperMCP.tsx.txt` — Connection Hub: Map / Connections / Routing / Workflows / Logs / Cost tabs (dark, mock data) |
| `crm/src/pages/AdminHyperMCP.tsx` | `AdminHyperMCP.tsx.txt` — Orchestration Hub: Connections / Workflows / Routing / Logs / Settings tabs (shadcn) |
| `crm/supabase/migrations/hub_orchestration_schema.sql` | `hub_orchestration_schema.sql` — `hub_connections`, `hub_workflows`, `hub_logs`, `hub_costs`, `hub_audit_trail` |

## Notes
- `.tsx.txt` extension prevents TS compilation; these files reference
  `@/integrations/supabase/client` and shadcn primitives not present here.
- The source project also has 8 `hyper_mcp_*` tables defined in
  `src/integrations/supabase/types.ts` (agents, agent_logs, agent_memory,
  agent_providers, agent_action_plans, audit_logs, conversations,
  credentials, integrations, messages, sync_jobs).
