import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  Workflow,
  Network,
  Cpu,
  Zap,
  ScrollText,
  MessageSquare,
  Plug,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/workflows", label: "Workflows", icon: Workflow },
  { to: "/mcp", label: "MCP Servers", icon: Network },
  { to: "/hyper-mcp", label: "Hyper MCP", icon: Cpu },
  { to: "/automation", label: "Automation", icon: Zap },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/ai-chat", label: "AI Chat", icon: MessageSquare },
  { to: "/connections", label: "Connections", icon: Plug },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Cpu className="h-4 w-4 text-primary" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-sidebar-accent-foreground leading-tight">
              MCP Command
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Control Plane
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-2.5 rounded-md pl-3 pr-2 py-1.5 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-primary-bar" />
                  )}
                  <Icon
                    className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "")}
                    strokeWidth={1.75}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-foreground">
            OP
          </div>
          <div className="text-[11px] min-w-0">
            <div className="font-medium text-sidebar-accent-foreground truncate">Operator</div>
            <div className="text-muted-foreground">Single tenant</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
