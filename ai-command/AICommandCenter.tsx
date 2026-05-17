import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Sparkles, X, Maximize2, Minimize2, Send, Plus, History, Bot, Workflow,
  Plug, KeyRound, Megaphone, Database, Globe, ShieldCheck, ScrollText,
  FileCode, Settings, Loader2, Mic, Zap, AlertTriangle, CheckCircle2, BookOpen, Trash2, RefreshCw,
  PanelLeftClose, PanelLeftOpen, Menu, Hand, Eye,
} from "lucide-react";

const FOOTER_OFFSET = 56; // TruMove Backend footer height
const PANEL_MARGIN = 16;
const MOBILE_EXTERNAL_NAV_W = 56;
const MOBILE_EXPANDED_NAV_W = 224;
const MOBILE_PREVIEW_CHROME_OFFSET = 320;
const COMPACT_VIEWPORT_W = 700;
const TOUCH_VIEWPORT_W = 980;
const getBottomLimit = () =>
  typeof window === "undefined" ? 800 : window.innerHeight - FOOTER_OFFSET;
const getVisibleViewport = () => {
  if (typeof window === "undefined") return { left: 0, top: 0, width: 1024, height: 768 };
  const vv = window.visualViewport;
  return {
    // CSS fixed positioning is viewport-based. Do not add page scroll offsets here,
    // or the AI Hub gets pushed below the visible mobile window while the page is scrolled.
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
};
const isCompactViewport = (vp = getVisibleViewport()) => {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  return vp.width < COMPACT_VIEWPORT_W || window.innerWidth < COMPACT_VIEWPORT_W || (coarsePointer && vp.width < TOUCH_VIEWPORT_W);
};
import { toast } from "@/hooks/use-toast";
import { HubStatusBadge } from "./HubStatusBadge";
import { InlineApprovalCard, type PendingAction } from "./InlineApprovalCard";
import { useAssistantContext } from "@/components/hypermcp/assistantContext";
import { getModuleByPath, getRelatedModules } from "@/components/hypermcp/moduleKnowledge";

type Provider = "auto" | "openai" | "lovable" | "hyper";
type Mode = "closed" | "panel" | "full";

interface Msg {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string | null;
  agent?: string | null;
  created_at?: string;
}

interface Thread {
  id: string;
  title: string;
  last_model: string | null;
  last_agent: string | null;
  updated_at: string;
}

interface RouteCard {
  provider: "openai" | "lovable" | "hyper";
  model: string;
  agent: string;
  agent_key?: string;
  category?: string;
  execution_type: string;
  tools: string[];
  estimated_cost_cents: number;
  requires_approval: boolean;
  risk_level: "low" | "medium" | "high";
  reasoning: string;
}

export interface AgentModule {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string | null;
  icon: string | null;
  provider: string;
  model: string;
  allowed_tools: string[];
  templates: unknown[];
  integration_requirements: string[];
  routing_keywords: string[];
  approval_rules: { requires_approval?: boolean; risk_level?: "low" | "medium" | "high" };
  execution_type: string;
  status: string;
  enabled: boolean;
}

const SIDEBAR_SECTIONS = [
  { id: "new", label: "New Task", icon: Plus },
  { id: "history", label: "Chat History", icon: History },
  { id: "agents", label: "Active Agents", icon: Bot },
  { id: "automations", label: "Automations", icon: Workflow },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "apis", label: "APIs & OAuth", icon: KeyRound },
  { id: "marketing", label: "Marketing Ops", icon: Megaphone },
  { id: "crm", label: "CRM Actions", icon: Database },
  { id: "scrapers", label: "Scrapers", icon: Globe },
  { id: "approvals", label: "Approvals", icon: ShieldCheck },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "templates", label: "Templates", icon: FileCode },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type SectionId = (typeof SIDEBAR_SECTIONS)[number]["id"];

const ACTIVE_THREAD_KEY = "ai-hub:active-thread-id";

export default function AICommandCenter() {
  const location = useLocation();
  const { highestRole } = useUserRole();
  const pageCtx = useAssistantContext();
  const currentModule = useMemo(() => getModuleByPath(location.pathname), [location.pathname]);
  const relatedModules = useMemo(
    () => (currentModule ? getRelatedModules(currentModule.id).slice(0, 6) : []),
    [currentModule],
  );
  const isHyperMcpRoute = location.pathname.startsWith("/hypermcp");
  const quickPrompts = useMemo<string[]>(() => {
    if (isHyperMcpRoute) {
      return [
        "Explain this page in plain English",
        "What should I do next here?",
        "Diagnose a failed connection",
        "Generate a setup checklist for this module",
        "Show me the related modules I should configure next",
        "Summarize recent activity on this page",
        "What are the most common errors here and how do I fix them?",
        "Draft a runbook for this workflow",
      ];
    }
    return [
      // Sales / CRM
      "Find leads that haven't been contacted in 7+ days and draft follow-ups",
      "Write a re-engagement SMS for cold leads from last month",
      "Summarize today's pipeline activity and flag deals at risk",
      "Score my open leads by likelihood to close",
      // Operations
      "Show jobs scheduled this week with missing carrier assignments",
      "Diagnose why a carrier failed our vetting and suggest fixes",
      "Draft a dispatch update SMS for tomorrow's moves",
      // Marketing / SEO
      "Audit our top 5 SEO landing pages and list quick wins",
      "Suggest 10 long-tail blog topics with low competition",
      "Scrape competitor pricing pages and compare to ours",
      // Admin / Insight
      "Build a weekly KPI report for the manager dashboard",
      "What automations should I turn on first to save the most time?",
    ];
  }, [isHyperMcpRoute]);
  const [mode, setMode] = useState<Mode>("closed");
  const [section, setSection] = useState<SectionId>("new");
  const [threadId, setThreadIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACTIVE_THREAD_KEY);
  });
  const setThreadId = useCallback((id: string | null) => {
    setThreadIdState(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(ACTIVE_THREAD_KEY, id);
      else window.localStorage.removeItem(ACTIVE_THREAD_KEY);
    }
  }, []);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<Provider>("auto");
  const [route, setRoute] = useState<RouteCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("openai/gpt-5");
  const [activeAgent, setActiveAgent] = useState<string>("OpenAI Planner");
  const [activeTasks, setActiveTasks] = useState(0);
  const [modules, setModules] = useState<AgentModule[]>([]);
  const [registry, setRegistry] = useState<{ providers: any[]; connections: any[]; tools: any[] }>({ providers: [], connections: [], tools: [] });
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Internal AI Hub sidebar: collapsed icon rail by default, expands outward to the LEFT when toggled.
  const [sidebarPinned, setSidebarPinned] = useState<boolean>(false);
  const togglePinned = useCallback(() => {
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 768px)").matches) {
      setMobileNavOpen((p) => !p);
      return;
    }
    setSidebarPinned((p) => !p);
  }, []);
  const sidebarExpanded = sidebarPinned;

  const resetLayout = useCallback(() => {
    setSidebarPinned(false);
    setMobileNavOpen(false);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(PANEL_SIZE_KEY);
        window.localStorage.removeItem(PANEL_POS_KEY);
      } catch {}
      setPanelSize(DEFAULT_PANEL);
      setPanelPos({
        x: Math.max(12, window.innerWidth - DEFAULT_PANEL.w - 24),
        y: Math.max(12, window.innerHeight - DEFAULT_PANEL.h - 24),
      });
    }
    toast({ title: "AI Hub layout reset", description: "Re-anchored to bottom-right, opening upward." });
  }, []);

  /* Resizable + draggable panel (panel mode only). Persisted. */
  const PANEL_SIZE_KEY = "ai-hub:panel-size:v4";
  const PANEL_POS_KEY = "ai-hub:panel-pos:v2";
  const DEFAULT_PANEL = { w: 600, h: 400 };
  const MIN_W = 360;
  const MIN_H = 320;
  const [panelSize, setPanelSize] = useState<{ w: number; h: number }>(() => {
    if (typeof window === "undefined") return DEFAULT_PANEL;
    try {
      const raw = window.localStorage.getItem(PANEL_SIZE_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v?.w === "number" && typeof v?.h === "number") return v;
      }
    } catch {}
    return DEFAULT_PANEL;
  });
  const [panelPos, setPanelPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 24, y: 24 };
    try {
      const raw = window.localStorage.getItem(PANEL_POS_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v?.x === "number" && typeof v?.y === "number") return v;
      }
    } catch {}
    // Default: anchored to bottom-right corner with 24px margin
    return {
      x: Math.max(12, window.innerWidth - panelSize.w - 24),
      y: Math.max(12, window.innerHeight - panelSize.h - 24),
    };
  });

  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number; startPosX: number; startPosY: number; dir: "right" | "bottom" | "corner" } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  const onResizeStart = useCallback((e: React.PointerEvent, dir: "right" | "bottom" | "corner") => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelSize.w, startH: panelSize.h, startPosX: panelPos.x, startPosY: panelPos.y, dir };
  }, [panelSize.w, panelSize.h, panelPos.x, panelPos.y]);

  const onDragStart = useCallback((e: React.PointerEvent) => {
    // Ignore drags that originate on interactive header controls (buttons, selects)
    const target = e.target as HTMLElement;
    if (target.closest("button, select, input, a, [role='button']")) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: panelPos.x, startPosY: panelPos.y };
  }, [panelPos.x, panelPos.y]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = resizeRef.current;
      const d = dragRef.current;
      const bottomLimit = getBottomLimit();
      if (r) {
        const maxW = window.innerWidth - r.startPosX - 12;
        const maxH = bottomLimit - r.startPosY - 12;
        let w = r.startW;
        let h = r.startH;
        if (r.dir === "right" || r.dir === "corner") w = Math.min(maxW, Math.max(MIN_W, r.startW + (e.clientX - r.startX)));
        if (r.dir === "bottom" || r.dir === "corner") h = Math.min(maxH, Math.max(MIN_H, r.startH + (e.clientY - r.startY)));
        setPanelSize({ w, h });
      } else if (d) {
        const maxX = window.innerWidth - panelSize.w - 8;
        const maxY = bottomLimit - panelSize.h - 8;
        const x = Math.min(maxX, Math.max(8, d.startPosX + (e.clientX - d.startX)));
        const y = Math.min(maxY, Math.max(8, d.startPosY + (e.clientY - d.startY)));
        setPanelPos({ x, y });
      }
    };
    const onUp = () => {
      if (resizeRef.current) {
        resizeRef.current = null;
        try { window.localStorage.setItem(PANEL_SIZE_KEY, JSON.stringify(panelSize)); } catch {}
      }
      if (dragRef.current) {
        dragRef.current = null;
        try { window.localStorage.setItem(PANEL_POS_KEY, JSON.stringify(panelPos)); } catch {}
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [panelSize, panelPos]);

  /* Auto-clamp size + position to current viewport so it never overflows. */
  useEffect(() => {
    const clamp = () => {
      const bottomLimit = getBottomLimit();
      const maxW = Math.max(MIN_W, window.innerWidth - 24);
      const maxH = Math.max(MIN_H, bottomLimit - 24);
      setPanelSize((p) => {
        const w = Math.min(p.w, maxW);
        const h = Math.min(p.h, maxH);
        return w === p.w && h === p.h ? p : { w, h };
      });
      setPanelPos((p) => {
        const w = Math.min(panelSize.w, maxW);
        const h = Math.min(panelSize.h, maxH);
        const maxX = Math.max(8, window.innerWidth - w - 8);
        const maxY = Math.max(8, bottomLimit - h - 8);
        const x = Math.min(maxX, Math.max(8, p.x));
        const y = Math.min(maxY, Math.max(8, p.y));
        return x === p.x && y === p.y ? p : { x, y };
      });
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [panelSize.w, panelSize.h]);

  const scrollRef = useRef<HTMLDivElement>(null);

  /* modules registry */
  useEffect(() => {
    if (mode === "closed") return;
    (async () => {
      const { data } = await supabase
        .from("ai_command_agent_modules")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      setModules((data as unknown as AgentModule[]) ?? []);
    })();
  }, [mode]);

  /* listen for "Ask AI to Help Set Up" prefill events from Connections page */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string } | undefined;
      if (!detail?.message) return;
      setMode("full");
      setSection("new");
      setThreadId(null);
      setInput(detail.message);
    };
    window.addEventListener("ai-hub:open-with-message", handler);
    return () => window.removeEventListener("ai-hub:open-with-message", handler);
  }, []);

  /* hub registry: providers, connections, tools (real, honest statuses) */
  useEffect(() => {
    if (mode === "closed") return;
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ai-hub-registry", { body: { action: "list" } });
        if (error) throw error;
        if (alive && data) setRegistry({ providers: data.providers ?? [], connections: data.connections ?? [], tools: data.tools ?? [] });
      } catch (e) {
        console.warn("ai-hub-registry list failed", e);
      }
    })();
    return () => { alive = false; };
  }, [mode]);
  const loadThreads = useCallback(async () => {
    const { data } = await supabase
      .from("ai_command_threads")
      .select("id,title,last_model,last_agent,updated_at")
      .eq("archived", false)
      .order("updated_at", { ascending: false })
      .limit(40);
    setThreads((data as Thread[]) ?? []);
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("ai_command_messages")
      .select("id,role,content,model,agent,created_at")
      .eq("thread_id", id)
      .order("created_at", { ascending: true });
    setMessages((data as Msg[]) ?? []);
    const { data: pa } = await supabase
      .from("ai_hub_pending_actions")
      .select("id,tool_name,summary,inputs,status,risk_level,expires_at,created_at,result,result_record_id,error")
      .eq("thread_id", id)
      .order("created_at", { ascending: true });
    setPendingActions((pa as PendingAction[]) ?? []);
  }, []);

  useEffect(() => {
    if (mode !== "closed") loadThreads();
  }, [mode, loadThreads]);

  useEffect(() => {
    if (threadId) loadMessages(threadId);
    else { setMessages([]); setPendingActions([]); }
  }, [threadId, loadMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Wait for layout/paint so scrollHeight reflects newly added messages,
    // then jump instantly to the bottom (smooth + stale height was landing at top).
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
      (el as any).__raf2 = raf2;
    });
    return () => {
      cancelAnimationFrame(raf1);
      if ((el as any).__raf2) cancelAnimationFrame((el as any).__raf2);
    };
  }, [messages, route, pendingActions, executing]);

  /* count running */
  useEffect(() => {
    if (mode === "closed") return;
    let alive = true;
    const tick = async () => {
      const { count } = await supabase
        .from("ai_command_executions")
        .select("id", { count: "exact", head: true })
        .in("status", ["running", "queued", "waiting_approval"]);
      if (alive) setActiveTasks(count ?? 0);
    };
    tick();
    const t = setInterval(tick, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [mode]);

  /* preview routing */
  const handlePreview = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-command-router", {
        body: { message: input, thread_id: threadId, preferred_provider: provider },
      });
      if (error) throw error;
      setRoute(data.route);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* execute */
  const handleExecute = async (forceRoute?: RouteCard) => {
    const useRoute = forceRoute ?? route;
    if (!input.trim()) return;
    setExecuting(true);
    const userMessage = input;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: userMessage }]);
    setInput("");
    try {
      let r = useRoute;
      if (!r) {
        const { data } = await supabase.functions.invoke("ai-command-router", {
          body: { message: userMessage, thread_id: threadId, preferred_provider: provider },
        });
        r = data.route;
      }
      if (!r) throw new Error("Routing failed");

      const { data, error } = await supabase.functions.invoke("ai-command-execute", {
        body: {
          thread_id: threadId,
          message: userMessage,
          route: r,
          client_context: {
            sidebar_section: section,
            current_route: location.pathname,
            user_role: highestRole ?? "unknown",
            pending_action_count: pendingActions.filter((p) => p.status === "pending_approval").length,
            page_context: pageCtx,
            current_module: currentModule
              ? {
                  id: currentModule.id,
                  label: currentModule.label,
                  group: currentModule.group,
                  what: currentModule.what,
                }
              : null,
            related_modules: relatedModules.map((m) => ({
              id: m.id,
              label: m.label,
              group: m.group,
            })),
          },
        },
      });
      if (error) throw error;
      if (!threadId) setThreadId(data.thread_id);
      setActiveModel(data.model);
      setActiveAgent(data.agent);
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant", content: data.reply,
        model: data.model, agent: data.agent,
      }]);
      if (Array.isArray(data.pending_actions) && data.pending_actions.length > 0) {
        setPendingActions((prev) => [...prev, ...(data.pending_actions as PendingAction[])]);
      }
      setRoute(null);
      loadThreads();
    } catch (e: any) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant",
        content: `⚠ Error: ${e.message ?? e}`,
      }]);
    } finally {
      setExecuting(false);
    }
  };

  /* approval handlers */
  const decideAction = async (
    id: string,
    decision: "approve" | "reject" | "modify",
    extras?: { modified_inputs?: any; modified_summary?: string },
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke("ai-hub-approve-action", {
        body: { proposal_id: id, decision, ...(extras ?? {}) },
      });
      if (error) throw error;
      if (decision === "modify" && data?.proposal) {
        setPendingActions((prev) => prev.map((p) => p.id === id ? { ...p, ...data.proposal } : p));
        return;
      }
      if (decision === "approve") {
        setPendingActions((prev) => prev.map((p) => p.id === id
          ? { ...p, status: "executed", result: data.record, result_record_id: data.record_id }
          : p));
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(), role: "assistant", agent: "approval-executor",
          content: `Action executed. Created task **${data.record?.title ?? "(untitled)"}** (status: ${data.record?.status ?? "open"}).`,
        }]);
        toast({ title: "Action executed", description: data.record?.title ?? "Task created" });
      } else if (decision === "reject") {
        setPendingActions((prev) => prev.map((p) => p.id === id ? { ...p, status: "rejected" } : p));
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(), role: "assistant", agent: "approval-executor",
          content: `Proposal rejected. No action taken.`,
        }]);
      }
    } catch (e: any) {
      toast({ title: "Approval action failed", description: e?.message ?? String(e), variant: "destructive" as any });
    }
  };

  /* Launcher: single fixed bottom-right pill, always collapsed until clicked. */
  if (mode === "closed") {
    return createPortal(
      <button
        onClick={() => setMode("panel")}
        aria-label="Open AI Hub"
        className="fixed right-4 z-[60] rounded-xl bg-foreground text-background border-2 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.45)] flex items-center gap-2 px-3 py-2 max-w-[140px] transition-all duration-300 ease-out hover:shadow-[0_12px_40px_-4px_rgba(57,255,20,0.35)] focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{ borderColor: "rgba(57,255,20,0.55)", bottom: FOOTER_OFFSET + 12 }}
      >
        <div className="relative flex items-center justify-center w-7 h-7 rounded-md bg-background/10 border border-background/30 shrink-0">
          <Hand className="w-4 h-4 animate-wave" style={{ color: "#39FF14" }} />
        </div>
        <span className="text-sm font-bold leading-tight text-background break-words text-left">AI Hub</span>
      </button>,
      document.body,
    );
  }

  const isPanel = mode === "panel";
  const containerClasses = mode === "full"
    ? "fixed inset-0 sm:inset-4 z-[70] min-w-[280px]"
    : "fixed z-[70] min-w-[280px]";
  const containerStyle: React.CSSProperties = {
    boxShadow: "0 30px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(57,255,20,0.08)",
  };
  if (isPanel) {
    // Docked right-sidebar workspace (Cursor/Claude style): full viewport height, anchored to right edge.
    containerStyle.top = "0px";
    containerStyle.right = "0px";
    containerStyle.left = "auto";
    containerStyle.bottom = "auto";
    containerStyle.transformOrigin = "top right";
    containerStyle.borderRadius = "0px";

    if (typeof window !== "undefined") {
      const vp = getVisibleViewport();
      const isCompactPanel = isCompactViewport(vp);
      const availH = Math.max(320, vp.height - FOOTER_OFFSET);
      // Desktop: respect user-resized width but clamp to a sensible docked range (380–720).
      // Mobile: take most of the viewport.
      const desktopW = Math.min(720, Math.max(380, panelSize.w));
      const w = isCompactPanel ? Math.min(vp.width - 16, 380) : desktopW;
      containerStyle.width = `${w}px`;
      containerStyle.height = `${availH}px`;
      containerStyle.maxWidth = `100vw`;
      containerStyle.maxHeight = `${availH}px`;
    }
  }

  return createPortal(
    <div
      className={cn(
        containerClasses,
        "rounded-2xl flex bg-background border border-border shadow-2xl relative",
        (sidebarExpanded || mobileNavOpen) ? "overflow-visible" : "overflow-hidden",
      )}
      style={containerStyle}
    >
      {/* Resize handles (panel mode, sm+ only) on right / bottom / bottom-right corner. */}
      {isPanel && (
        <>
          <div
            onPointerDown={(e) => onResizeStart(e, "right")}
            className="hidden sm:block absolute right-0 top-2 bottom-2 w-2 cursor-ew-resize hover:bg-foreground/20 z-[73] rounded-l"
            aria-label="Resize panel width"
            role="separator"
          />
          <div
            onPointerDown={(e) => onResizeStart(e, "bottom")}
            className="hidden sm:block absolute bottom-0 left-2 right-2 h-2 cursor-ns-resize hover:bg-foreground/20 z-[73] rounded-t"
            aria-label="Resize panel height"
            role="separator"
          />
          <button
            type="button"
            onPointerDown={(e) => onResizeStart(e, "corner")}
            className="hidden sm:flex absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-[74] items-center justify-center rounded-tl-md bg-foreground/10 hover:bg-foreground/30 border-l border-t border-border/60"
            aria-label="Resize panel from corner"
            title="Drag to resize"
          >
            <span className="block w-2 h-2 border-r-2 border-b-2 border-foreground/70 rounded-br-sm" />
          </button>
        </>
      )}

      {/* Sidebar rail — always 48px icon strip. Expanded sidebar slides OUT to the LEFT of the panel. */}
      <aside
        aria-label="AI Hub navigation"
        className={cn(
          "shrink-0 flex flex-col border-r w-12 relative z-[5]",
        )}
        style={{ backgroundColor: "#0a0a0a", borderColor: "rgba(57,255,20,0.25)" }}
      >
        <div className="flex items-center justify-center px-1.5 py-3 border-b" style={{ borderColor: "rgba(57,255,20,0.18)" }}>
          <button
            type="button"
            onClick={togglePinned}
            aria-label={sidebarPinned ? "Close sidebar" : "Open sidebar"}
            aria-pressed={sidebarPinned}
            className="h-7 w-7 rounded-md flex items-center justify-center shrink-0 hover:bg-white/10"
            style={{ backgroundColor: "rgba(57,255,20,0.12)", border: "1px solid rgba(57,255,20,0.4)", color: "#39FF14" }}
            title={sidebarPinned ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarPinned || mobileNavOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
        </div>
        <ScrollArea className="flex-1">
          <nav className="py-2 space-y-1 px-1.5">
            {SIDEBAR_SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSection(s.id); if (s.id === "new") { setThreadId(null); setMessages([]); } setMobileNavOpen(false); }}
                  title={s.label}
                  aria-label={s.label}
                  className={cn(
                    "w-full flex items-center justify-center rounded-md transition-colors min-h-9 px-0 py-2",
                    active ? "text-black" : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                  style={active ? { backgroundColor: "#39FF14" } : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                </button>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>

      {/* Expanded sidebar — outside the chat shell, opening LEFT from the rail so the chat box never changes or gets covered. */}
      <div
        className={cn(
          "absolute top-0 bottom-0 right-full z-[6] flex flex-col border-r overflow-hidden transition-all duration-300 ease-out shadow-2xl",
          (sidebarExpanded || mobileNavOpen) ? "w-56 opacity-100 pointer-events-auto" : "w-0 opacity-0 pointer-events-none",
        )}
        style={{
          backgroundColor: "#0a0a0a",
          borderColor: "rgba(57,255,20,0.35)",
        }}
        aria-hidden={!(sidebarExpanded || mobileNavOpen)}
      >
        <div className="border-b flex items-center gap-2 px-3 py-3" style={{ borderColor: "rgba(57,255,20,0.18)" }}>
          <div className="h-7 w-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(57,255,20,0.12)", border: "1px solid rgba(57,255,20,0.4)" }}>
            <Sparkles className="h-4 w-4" style={{ color: "#39FF14" }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold leading-tight truncate text-white">AI Hub</div>
            <div className="text-[10px] leading-tight truncate font-semibold tracking-wide" style={{ color: "#39FF14" }}>VOICE OR TEXT, 24/7</div>
          </div>
          <button
            type="button"
            onClick={resetLayout}
            aria-label="Reset AI Hub layout"
            title="Reset AI Hub layout"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => { setSidebarPinned(false); setMobileNavOpen(false); }}
            aria-label="Close sidebar"
            aria-pressed={sidebarPinned || mobileNavOpen}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <ScrollArea className="flex-1">
          <nav className="py-2 space-y-0.5 px-2">
            {SIDEBAR_SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSection(s.id); if (s.id === "new") { setThreadId(null); setMessages([]); } }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left min-h-9",
                    active
                      ? "text-black"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                  style={active ? { backgroundColor: "#39FF14" } : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </nav>
        </ScrollArea>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 w-full min-h-0">
        {/* Header */}
        <header
          className={cn("h-14 border-b border-border flex items-center justify-between px-3 sm:px-4 bg-background/80 backdrop-blur gap-2 select-none")}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 md:hidden shrink-0"
              onClick={() => setMobileNavOpen((p) => !p)}
              aria-label="Open AI Hub menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate">AI Hub</h2>
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                Plan, automate, execute, integrate, and monitor operations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <select
              value={threadId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__new__") { setThreadId(null); setMessages([]); setSection("new"); }
                else if (v) { setThreadId(v); setSection("new"); }
              }}
              className="text-[11px] bg-muted/40 border border-border rounded-md px-2 py-1 max-w-[140px] sm:max-w-[180px] truncate"
              title="Active thread"
            >
              <option value="__new__">＋ New thread</option>
              {threadId && !threads.find((t) => t.id === threadId) && (
                <option value={threadId}>(current)</option>
              )}
              {threads.map((t) => (
                <option key={t.id} value={t.id}>{t.title || "Untitled"}</option>
              ))}
            </select>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="text-[11px] bg-muted/40 border border-border rounded-md px-2 py-1"
              title="Model / routing"
            >
              <option value="auto">Auto-route</option>
              <option value="openai">GPT-5</option>
              <option value="lovable">Gemini 2.5</option>
              <option value="hyper">Hyper Agent</option>
            </select>
            <Badge variant="outline" className="text-[10px] gap-1 border-border">
              <span className={cn("h-1.5 w-1.5 rounded-full", activeTasks > 0 ? "bg-green-500 animate-pulse" : "bg-muted-foreground")} />
              {activeTasks}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" onClick={() => setMode(mode === "full" ? "panel" : "full")}>
              {mode === "full" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMode("closed")}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-hidden min-h-0">
          {section === "new" || section === "history" ? (
            <ChatView
              messages={messages}
              route={route}
              loading={loading}
              executing={executing}
              input={input}
              setInput={setInput}
              provider={provider}
              setProvider={setProvider}
              onPreview={handlePreview}
              onExecute={() => handleExecute()}
              onClearRoute={() => setRoute(null)}
              scrollRef={scrollRef}
              threads={threads}
              showHistory={section === "history"}
              onPickThread={(id) => { setThreadId(id); setSection("new"); }}
              pendingActions={pendingActions}
              onApprove={(id) => decideAction(id, "approve")}
              onReject={(id) => decideAction(id, "reject")}
              onModify={(id, inputs, summary) => decideAction(id, "modify", { modified_inputs: inputs, modified_summary: summary })}
              quickPrompts={quickPrompts}
            />
          ) : (
            <SectionShell id={section} modules={modules} registry={registry} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─────────── Chat ─────────── */
function ChatView(props: {
  messages: Msg[];
  route: RouteCard | null;
  loading: boolean;
  executing: boolean;
  input: string;
  setInput: (s: string) => void;
  provider: Provider;
  setProvider: (p: Provider) => void;
  onPreview: () => void;
  onExecute: () => void;
  onClearRoute: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  threads: Thread[];
  showHistory: boolean;
  onPickThread: (id: string) => void;
  pendingActions: PendingAction[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onModify: (id: string, inputs: Record<string, any>, summary: string) => Promise<void>;
  quickPrompts: string[];
}) {
  const { messages, route, executing, loading, input, setInput, pendingActions, quickPrompts } = props;
  return (
    <div className="h-full min-w-[280px] flex overflow-hidden">
      {props.showHistory && (
        <div className="hidden md:block w-64 border-r border-border bg-muted/10 overflow-y-auto p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1">Recent threads</div>
          {props.threads.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 py-4">No threads yet.</div>
          )}
          {props.threads.map((t) => (
            <button key={t.id} onClick={() => props.onPickThread(t.id)}
              className="w-full text-left px-2 py-2 rounded-md hover:bg-accent text-xs">
              <div className="font-medium truncate">{t.title || "Untitled"}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {t.last_agent ?? "—"} · {new Date(t.updated_at).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      )}



      <div className="flex-1 flex flex-col min-w-[280px] min-h-0 overflow-hidden">
        <div ref={props.scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 space-y-4 pb-4">
          {messages.length === 0 && !route && (
            <div className="h-full box-border flex flex-col items-center justify-end sm:justify-center text-center max-w-md mx-auto px-2 py-3 sm:py-8">
              <div className="h-12 w-12 rounded-xl bg-foreground flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6" style={{ color: "#39FF14" }} />
              </div>
              <h3 className="text-base font-semibold mb-1">What should we run?</h3>
              <p className="text-xs text-muted-foreground mb-4 sm:mb-5">
                OpenAI handles reasoning, planning, copy & CRM logic. Hyper agents are escalated only for scraping, SERP, and browser automation.
              </p>
              <div className="ai-hub-prompt-chips flex w-full gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0">
                {quickPrompts.map((p) => (
                  <button key={p} onClick={() => setInput(p)}
                    className="min-w-[220px] sm:min-w-0 text-left text-xs p-2.5 rounded-md border border-border hover:border-foreground/40 hover:bg-accent/50 transition">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-muted/50 border border-border",
              )}>
                {m.role === "assistant" && m.agent && (
                  <div className="text-[10px] text-muted-foreground mb-1 flex gap-2">
                    <span>{m.agent}</span>
                    {m.model && <span className="opacity-60">{m.model.split("/").pop()}</span>}
                  </div>
                )}
                {m.content}
              </div>
            </div>
          ))}

          {pendingActions.length > 0 && (
            <div className="space-y-2.5">
              {pendingActions.map((pa) => (
                <InlineApprovalCard
                  key={pa.id}
                  action={pa}
                  onApprove={props.onApprove}
                  onReject={props.onReject}
                  onModify={props.onModify}
                />
              ))}
            </div>
          )}

          {executing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Executing…
            </div>
          )}

          {route && (
            <div className="rounded-xl border p-4 bg-muted/30"
              style={{ borderColor: route.risk_level === "high" ? "#ef4444" : route.risk_level === "medium" ? "#f59e0b" : "#39FF14" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {route.requires_approval
                    ? <AlertTriangle className="h-4 w-4 text-amber-500" />
                    : <CheckCircle2 className="h-4 w-4" style={{ color: "#39FF14" }} />}
                  <span className="text-xs font-bold uppercase tracking-wide">Routing Plan</span>
                </div>
                <button onClick={props.onClearRoute} className="text-[10px] text-muted-foreground hover:text-foreground">dismiss</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                <Field label="Provider" value={route.provider.toUpperCase()} />
                <Field label="Model" value={route.model.split("/").pop() ?? route.model} />
                <Field label="Agent" value={route.agent} />
                <Field label="Type" value={route.execution_type} />
                <Field label="Tools" value={route.tools.join(", ") || "—"} />
                <Field label="Est. cost" value={`${route.estimated_cost_cents}¢`} />
                <Field label="Risk" value={route.risk_level} />
                <Field label="Approval" value={route.requires_approval ? "Required" : "Auto"} />
              </div>
              <div className="mt-3 text-[11px] text-muted-foreground italic">{route.reasoning}</div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={props.onExecute} disabled={executing}
                  style={{ backgroundColor: "#39FF14", color: "#000" }}>
                  Execute
                </Button>
                <Button size="sm" variant="outline" onClick={props.onClearRoute}>Modify</Button>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-background/95 backdrop-blur p-3 pb-[max(env(safe-area-inset-bottom),12px)] shrink-0 w-full min-w-[280px]">
          <div className="relative rounded-xl border border-border bg-muted/30 focus-within:border-foreground/40 transition-colors">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!route) props.onPreview(); else props.onExecute();
                }
              }}
              placeholder="Tell the AI what to plan, research, build, integrate, or execute…"
              className="w-full min-h-[88px] max-h-[200px] resize-none text-[16px] sm:text-sm leading-6 border-0 bg-transparent pl-12 pr-28 pt-3 pb-10 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {/* + upload (bottom-left) */}
            <input
              id="ai-hub-upload"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) toast({ title: `${files.length} file(s) attached`, description: files.map((f) => f.name).join(", ") });
                e.currentTarget.value = "";
              }}
            />
            <label
              htmlFor="ai-hub-upload"
              title="Attach files"
              className="absolute bottom-2 left-2 h-8 w-8 rounded-md flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
            </label>
            {/* mic / preview / send (bottom-right, inside textarea) */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <button
                type="button"
                title="Voice dictation (coming soon)"
                className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
                disabled
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Preview routing"
                onClick={props.onPreview}
                disabled={loading || !input.trim()}
                className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                type="button"
                title="Send"
                onClick={props.onExecute}
                disabled={executing || !input.trim()}
                className="h-8 w-8 rounded-md flex items-center justify-center disabled:opacity-50"
                style={{ backgroundColor: "#39FF14", color: "#000" }}
              >
                {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-foreground">{value}</div>
    </div>
  );
}

/* ─────────── Section shells ─────────── */
function SectionShell({ id, modules, registry }: { id: SectionId; modules: AgentModule[]; registry: { providers: any[]; connections: any[]; tools: any[] } }) {
  if (id === "agents") return <AgentsSection modules={modules} />;
  if (id === "templates") return <TemplatesSection modules={modules} />;
  if (id === "approvals") return <ApprovalsSection modules={modules} />;
  if (id === "knowledge") return <KnowledgeSection modules={modules} />;

  if (id === "integrations" || id === "apis") {
    const items = id === "integrations"
      ? [...registry.providers.map((p) => ({ key: p.key, name: p.name, status: p.status, sub: p.kind })), ...registry.connections.map((c) => ({ key: c.key, name: c.name, status: c.status, sub: c.kind }))]
      : registry.connections.filter((c) => c.auth_type === "api_key" || c.auth_type === "oauth2").map((c) => ({ key: c.key, name: c.name, status: c.status, sub: c.auth_type }));
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-3xl">
          <h3 className="text-lg font-bold">{id === "integrations" ? "Integrations" : "APIs & OAuth"}</h3>
          <p className="text-xs text-muted-foreground mt-1">Live registry. Statuses reflect what is actually configured in this environment.</p>
          {items.length === 0 ? (
            <p className="mt-6 text-[11px] text-muted-foreground">Registry empty or still loading.</p>
          ) : (
            <div className="mt-5 grid sm:grid-cols-2 gap-2">
              {items.map((it) => (
                <div key={it.key} className="px-3 py-2.5 rounded-md border border-border bg-muted/20 text-xs flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate">{it.sub}</div>
                  </div>
                  <HubStatusBadge status={it.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (id === "automations") return <AutomationsSection modules={modules} />;
  if (id === "logs") return <LogsSection />;
  if (id === "settings") return <SettingsSection registry={registry} />;
  if (id === "marketing" || id === "crm" || id === "scrapers") {
    return <CategoryModulesSection id={id} modules={modules} />;
  }
  return null;
}

function CategoryModulesSection({ id, modules }: { id: SectionId; modules: AgentModule[] }) {
  const titleMap: Record<string, { title: string; desc: string; match: (m: AgentModule) => boolean }> = {
    marketing: {
      title: "Marketing Ops",
      desc: "Live marketing-category agent modules registered in the Hub.",
      match: (m) => /market|seo|ppc|content|growth/i.test(m.category) || /market|seo|ppc/i.test(m.key),
    },
    crm: {
      title: "CRM Actions",
      desc: "Live CRM/sales agent modules registered in the Hub.",
      match: (m) => /crm|sales|lead|customer/i.test(m.category) || /crm|sales|lead|customer/i.test(m.key),
    },
    scrapers: {
      title: "Scrapers",
      desc: "Scraper / browser-automation modules.",
      match: (m) => /scrap|crawl|browser|fmcsa|firecrawl/i.test(m.category) || /scrap|crawl|browser|fmcsa|firecrawl/i.test(m.key),
    },
  };
  const cfg = titleMap[id];
  const items = modules.filter(cfg.match);
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl">
        <h3 className="text-lg font-bold">{cfg.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{cfg.desc}</p>
        {items.length === 0 ? (
          <div className="mt-6 px-3 py-4 rounded-md border border-dashed border-border text-xs text-muted-foreground">
            No {cfg.title.toLowerCase()} modules registered. Add rows to <code className="font-mono">ai_command_agent_modules</code> with a matching category to enable them here.
          </div>
        ) : (
          <div className="mt-5 grid sm:grid-cols-2 gap-2">
            {items.map((m) => (
              <div key={m.id} className="px-3 py-2.5 rounded-md border border-border bg-muted/20 text-xs flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{m.key}</div>
                </div>
                <HubStatusBadge status={m.enabled ? "ready" : "disabled"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AutomationsSection({ modules }: { modules: AgentModule[] }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ai_hub_tasks")
        .select("id,title,status,category,priority,updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      setTasks((data as any[]) ?? []);
      setLoading(false);
    })();
  }, []);
  const automationModules = modules.filter((m) => /automation|workflow|schedule|cron/i.test(m.execution_type) || /automation|workflow/i.test(m.category));
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl space-y-6">
        <div>
          <h3 className="text-lg font-bold">Automations</h3>
          <p className="text-xs text-muted-foreground mt-1">Scheduled tasks and automation-type agent modules. Reflects live database state.</p>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Open Tasks</div>
          {loading ? (
            <div className="text-xs text-muted-foreground">Loading…</div>
          ) : tasks.length === 0 ? (
            <div className="px-3 py-3 rounded-md border border-dashed border-border text-xs text-muted-foreground">
              No tasks queued. Nothing is running.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {tasks.map((t) => (
                <div key={t.id} className="px-3 py-2.5 rounded-md border border-border bg-muted/20 text-xs flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.title ?? "Untitled task"}</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate">{t.category} · {t.priority}</div>
                  </div>
                  <HubStatusBadge status={t.status ?? "open"} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Automation-type Modules</div>
          {automationModules.length === 0 ? (
            <div className="px-3 py-3 rounded-md border border-dashed border-border text-xs text-muted-foreground">
              No automation-type modules registered.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {automationModules.map((m) => (
                <div key={m.id} className="px-3 py-2.5 rounded-md border border-border bg-muted/20 text-xs flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate">{m.execution_type}</div>
                  </div>
                  <HubStatusBadge status={m.enabled ? "ready" : "disabled"} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LogsSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ai_command_executions")
      .select("id,status,agent,model,tools,risk_level,elapsed_ms,actual_cost_cents,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setRows((data as any[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Execution Logs</h3>
            <p className="text-xs text-muted-foreground mt-1">Most recent 50 AI Hub executions. Live from the database.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-7 text-xs gap-1">
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} /> Refresh
          </Button>
        </div>
        {loading ? (
          <div className="mt-6 text-xs text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="mt-6 px-3 py-4 rounded-md border border-dashed border-border text-xs text-muted-foreground">
            No executions recorded yet.
          </div>
        ) : (
          <div className="mt-5 space-y-1.5">
            {rows.map((r) => (
              <div key={r.id} className="px-3 py-2 rounded-md border border-border bg-muted/20 text-[11px] flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{r.agent ?? "execution"}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">
                    {r.model ?? "—"} · {new Date(r.created_at).toLocaleString()}
                    {typeof r.elapsed_ms === "number" ? ` · ${r.elapsed_ms}ms` : ""}
                    {typeof r.actual_cost_cents === "number" ? ` · ${r.actual_cost_cents}¢` : ""}
                  </div>
                </div>
                <HubStatusBadge status={r.status ?? "unknown"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsSection({ registry }: { registry: { providers: any[]; connections: any[]; tools: any[] } }) {
  const providerCount = registry.providers.length;
  const readyProviders = registry.providers.filter((p) => p.status === "ready" || p.status === "connected").length;
  const readyConnections = registry.connections.filter((c) => c.status === "ready" || c.status === "connected").length;
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl space-y-4">
        <div>
          <h3 className="text-lg font-bold">Settings & Status</h3>
          <p className="text-xs text-muted-foreground mt-1">Live system state. No demo values.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <StatusRow label="Providers ready" value={`${readyProviders} / ${providerCount}`} ok={readyProviders > 0} />
          <StatusRow label="Connections ready" value={`${readyConnections} / ${registry.connections.length}`} ok={readyConnections > 0} />
          <StatusRow label="Tools registered" value={`${registry.tools.length}`} ok={registry.tools.length > 0} />
          <StatusRow label="Voice dictation" value="Not configured" ok={false} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          To change defaults, edit rows in <code className="font-mono">ai_hub_providers</code>, <code className="font-mono">ai_hub_connections</code>, and <code className="font-mono">ai_command_agent_modules</code>.
        </p>
      </div>
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="px-3 py-2.5 rounded-md border border-border bg-muted/20 text-xs flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono">{value}</span>
        <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-green-500" : "bg-muted-foreground/60")} />
      </span>
    </div>
  );
}

function AgentsSection({ modules }: { modules: AgentModule[] }) {
  const grouped = modules.reduce<Record<string, AgentModule[]>>((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl">
        <h3 className="text-lg font-bold">Active Agents</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {modules.length} modules registered. Each is a standalone unit with its own model, tools, approval rules, and integration requirements. Add more in the database to extend the hub without code changes.
        </p>
        {Object.entries(grouped).map(([cat, mods]) => (
          <div key={cat} className="mt-6">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{cat}</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {mods.map((m) => (
                <div key={m.id} className="rounded-lg border border-border bg-muted/10 p-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{m.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">{m.key}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[9px] shrink-0"
                      style={m.approval_rules?.requires_approval
                        ? { borderColor: "#f59e0b", color: "#f59e0b" }
                        : { borderColor: "#39FF14", color: "#39FF14" }}
                    >
                      {m.approval_rules?.requires_approval ? "approval" : "auto"}
                    </Badge>
                  </div>
                  {m.description && <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{m.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="secondary" className="text-[9px] font-mono">{m.provider}</Badge>
                    <Badge variant="secondary" className="text-[9px] font-mono">{m.execution_type}</Badge>
                    {(m.allowed_tools ?? []).slice(0, 3).map((t) => (
                      <Badge key={t} variant="outline" className="text-[9px] font-mono">{t}</Badge>
                    ))}
                    {(m.integration_requirements ?? []).map((r) => (
                      <Badge key={r} variant="outline" className="text-[9px]" style={{ borderColor: "#3b82f6", color: "#3b82f6" }}>
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplatesSection({ modules }: { modules: AgentModule[] }) {
  const items = modules.flatMap((m) => (m.templates ?? []).map((t, i) => ({ key: `${m.key}-${i}`, agent: m.name, t })));
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl">
        <h3 className="text-lg font-bold">Templates</h3>
        <p className="text-xs text-muted-foreground mt-1">Reusable prompts and playbooks attached to agent modules.</p>
        {items.length === 0 ? (
          <p className="mt-6 text-[11px] text-muted-foreground">No templates yet. Add JSON entries to a module's <code>templates</code> column.</p>
        ) : (
          <div className="mt-5 grid sm:grid-cols-2 gap-2">
            {items.map((it) => (
              <div key={it.key} className="px-3 py-2.5 rounded-md border border-border bg-muted/20 text-xs">
                <div className="font-semibold">{it.agent}</div>
                <pre className="text-[10px] mt-1 overflow-x-auto">{JSON.stringify(it.t, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalsSection({ modules }: { modules: AgentModule[] }) {
  const gated = modules.filter((m) => m.approval_rules?.requires_approval);
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl">
        <h3 className="text-lg font-bold">Approval Rules</h3>
        <p className="text-xs text-muted-foreground mt-1">Modules that require explicit approval before executing.</p>
        <div className="mt-5 space-y-2">
          {gated.length === 0 && <p className="text-[11px] text-muted-foreground">No modules currently require approval.</p>}
          {gated.map((m) => (
            <div key={m.id} className="px-3 py-2.5 rounded-md border border-border bg-muted/20 text-xs flex items-center justify-between">
              <div>
                <div className="font-semibold">{m.name}</div>
                <div className="text-[10px] text-muted-foreground">Risk: {m.approval_rules?.risk_level ?? "medium"}</div>
              </div>
              <Badge variant="outline" className="text-[9px]" style={{ borderColor: "#f59e0b", color: "#f59e0b" }}>approval</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Knowledge (Hub-scoped KB, isolated) ─────────── */
interface KbSource {
  id: string;
  module_key: string;
  title: string;
  source_type: "text" | "url";
  source_url: string | null;
  status: "pending" | "processing" | "ready" | "error";
  error: string | null;
  chunk_count: number;
  updated_at: string;
}

function KnowledgeSection({ modules }: { modules: AgentModule[] }) {
  const [sources, setSources] = useState<KbSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<string>("shared");
  const [type, setType] = useState<"text" | "url">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const SUPPORTED = [".txt", ".md", ".csv", ".json", ".html", ".htm", ".xml", ".docx", ".pdf"];

  const handleFile = async (file: File) => {
    setExtracting(true);
    try {
      const lower = file.name.toLowerCase();
      if (!SUPPORTED.some((ext) => lower.endsWith(ext))) {
        throw new Error(`Unsupported file type. Allowed: ${SUPPORTED.join(", ")}`);
      }
      if (file.size > 15 * 1024 * 1024) {
        throw new Error("File too large (max 15MB)");
      }
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));

      // Read as base64 and let the edge function parse it (avoids browser bundling issues)
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
      }
      const content_base64 = btoa(bin);

      const { data, error } = await supabase.functions.invoke("ai-command-knowledge-extract", {
        body: { filename: file.name, content_base64 },
      });
      if (error) throw new Error(error.message || "Extraction failed");
      if (!data?.text) throw new Error(data?.error || "No text extracted");

      setContent((prev) => (prev ? prev + "\n\n" : "") + String(data.text).trim());
      setType("text");
      toast({ title: "File loaded", description: `${file.name} · ${Number(data.length).toLocaleString()} chars` });
    } catch (e: any) {
      toast({
        title: "Could not read file",
        description: String(e?.message ?? "Unknown error. Try pasting the text instead."),
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const PRESETS: { title: string; description: string }[] = [
    { title: "Product Vision", description: "What TruMove is, who it serves, the long-term mission and positioning." },
    { title: "UI/UX Standards", description: "Design tokens, layout rules, component patterns, accessibility, motion." },
    { title: "AI Hub Architecture", description: "Modules, routing, execution flow, logging, approvals." },
    { title: "Agent System", description: "Per-agent instructions, allowed tools, templates, approval rules." },
    { title: "Routing Rules", description: "How requests are matched to agents and modules." },
    { title: "OpenAI Integration Standards", description: "Models, prompts, retries, token budgets." },
    { title: "Function Calling Standards", description: "Schema conventions, validation, error handling." },
    { title: "MCP Standards", description: "MCP servers, capabilities, security boundaries." },
    { title: "Hyper Escalation Rules", description: "When to escalate to human, dispatcher, or admin." },
    { title: "API & OAuth Standards", description: "Auth flows, scopes, secret handling, rate limits." },
    { title: "Database Standards", description: "Schema rules, RLS patterns, migrations, naming." },
    { title: "Approval & Security Rules", description: "What requires approval, who can approve, audit." },
    { title: "Cost Control Rules", description: "Budgets, caps, model tiering, fallback strategy." },
    { title: "Future Modules", description: "Planned modules and architectural placeholders." },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ai_command_knowledge_sources")
      .select("*")
      .order("updated_at", { ascending: false });
    setSources((data ?? []) as KbSource[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!title.trim()) return toast({ title: "Title required", variant: "destructive" });
    if (type === "text" && !content.trim()) return toast({ title: "Content required", variant: "destructive" });
    if (type === "url" && !url.trim()) return toast({ title: "URL required", variant: "destructive" });
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("ai-command-knowledge-ingest", {
        body: {
          module_key: scope,
          title: title.trim(),
          source_type: type,
          source_url: type === "url" ? url.trim() : null,
          raw_content: type === "text" ? content.trim() : null,
        },
      });
      if (error) throw error;
      toast({ title: "Indexed", description: "Knowledge added to the Hub." });
      setTitle(""); setContent(""); setUrl("");
      await load();
    } catch (e: any) {
      toast({ title: "Ingest failed", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const reindex = async (s: KbSource) => {
    await supabase.functions.invoke("ai-command-knowledge-ingest", { body: { source_id: s.id } });
    await load();
  };

  const remove = async (s: KbSource) => {
    if (!confirm(`Delete "${s.title}"?`)) return;
    await supabase.from("ai_command_knowledge_sources").delete().eq("id", s.id);
    await load();
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Knowledge Base</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Isolated to the AI Hub. Not shared with any other assistant or global context.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-7 text-xs gap-1">
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} /> Refresh
          </Button>
        </div>

        {/* Add source */}
        <div className="mt-5 rounded-lg border border-border bg-muted/10 p-4 space-y-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Add Source</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Scope</span>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs"
              >
                <option value="shared">Shared (all agents)</option>
                {modules.map((m) => (
                  <option key={m.key} value={m.key}>{m.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "text" | "url")}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs"
              >
                <option value="text">Pasted text</option>
                <option value="url">URL</option>
              </select>
            </label>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Presets</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => {
                const active = title.trim() === p.title;
                return (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => { setTitle(p.title); setType("text"); }}
                    title={p.description}
                    className={cn(
                      "text-[10px] px-2 py-1 rounded border transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background hover:bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {p.title}
                  </button>
                );
              })}
            </div>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. SOP — Lead intake script)"
            className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs"
          />
          {type === "url" ? (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs font-mono"
            />
          ) : (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste docs, SOPs, playbooks, schemas... or upload a file below."
              rows={6}
              className="text-xs font-mono"
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.csv,.json,.html,.htm,.xml,.docx,.pdf"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={extracting}
                className="gap-1 h-7 text-xs"
              >
                {extracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Upload file
              </Button>
              <span className="text-[10px] text-muted-foreground">.txt .md .csv .json .html .docx .pdf</span>
            </div>
            <Button size="sm" onClick={submit} disabled={submitting} className="gap-1 h-7 text-xs">
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Index source
            </Button>
          </div>
        </div>

        {/* Sources list */}
        <div className="mt-5 space-y-2">
          {sources.length === 0 && !loading && (
            <p className="text-[11px] text-muted-foreground">No sources yet.</p>
          )}
          {sources.map((s) => (
            <div key={s.id} className="rounded-md border border-border bg-muted/10 p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold truncate">{s.title}</div>
                  <Badge variant="outline" className="text-[9px] font-mono">{s.module_key}</Badge>
                  <Badge variant="secondary" className="text-[9px] font-mono">{s.source_type}</Badge>
                </div>
                {s.source_url && (
                  <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{s.source_url}</div>
                )}
                {s.error && <div className="text-[10px] text-destructive mt-0.5">{s.error}</div>}
              </div>
              <Badge
                variant="outline"
                className="text-[9px] shrink-0"
                style={
                  s.status === "ready"      ? { borderColor: "#39FF14", color: "#39FF14" } :
                  s.status === "error"      ? { borderColor: "#ef4444", color: "#ef4444" } :
                  s.status === "processing" ? { borderColor: "#3b82f6", color: "#3b82f6" } :
                                              { borderColor: "#f59e0b", color: "#f59e0b" }
                }
              >
                {s.status} · {s.chunk_count} chunks
              </Badge>
              <button onClick={() => reindex(s)} title="Re-index" className="text-muted-foreground hover:text-foreground p-1">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => remove(s)} title="Delete" className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
