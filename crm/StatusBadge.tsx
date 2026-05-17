import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const toneMap: Record<Tone, string> = {
  success: "border-primary/40 bg-primary/10 text-primary",
  warning: "border-warning/40 bg-warning/10 text-[hsl(var(--warning))]",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-[hsl(var(--info))]/40 bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]",
  neutral: "border-border bg-muted/40 text-muted-foreground",
};

export function StatusBadge({ tone = "neutral", children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        toneMap[tone],
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "success" && "bg-primary",
          tone === "warning" && "bg-[hsl(var(--warning))]",
          tone === "danger" && "bg-destructive",
          tone === "info" && "bg-[hsl(var(--info))]",
          tone === "neutral" && "bg-muted-foreground"
        )}
      />
      {children}
    </span>
  );
}
