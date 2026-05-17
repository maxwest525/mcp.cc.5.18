import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackendRequiredProps {
  label?: string;
  className?: string;
}

export function BackendRequired({ label = "Backend Required", className }: BackendRequiredProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[hsl(var(--warning))]",
        className
      )}
    >
      <AlertCircle className="h-3 w-3" strokeWidth={2} />
      {label}
    </span>
  );
}

export function BackendRequiredCard({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/20 px-5 py-8 text-center">
      <AlertCircle className="h-5 w-5 text-[hsl(var(--warning))] mx-auto" strokeWidth={1.75} />
      <div className="mt-2 text-sm font-medium text-foreground">{title}</div>
      {description && (
        <div className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">{description}</div>
      )}
      <div className="mt-3">
        <BackendRequired />
      </div>
    </div>
  );
}
