import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-label="Ładowanie" className={cn("size-4 animate-spin text-muted", className)} />;
}

/** Pełnoekranowy / blokowy stan ładowania. */
export function LoadingState({ label = "Ładowanie...", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-16 text-sm text-muted", className)}>
      <Spinner />
      {label}
    </div>
  );
}

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-muted px-1 font-mono text-[10px] font-medium text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Separator({
  className,
  vertical,
}: {
  className?: string;
  vertical?: boolean;
}) {
  return (
    <div
      role="separator"
      className={cn(vertical ? "h-full w-px" : "h-px w-full", "shrink-0 bg-border", className)}
    />
  );
}

const PROGRESS_TONES = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  violet: "bg-violet",
} as const;

export function Progress({
  value,
  tone = "primary",
  size = "md",
  className,
  showLabel,
}: {
  /** 0-100 */
  value: number;
  tone?: keyof typeof PROGRESS_TONES;
  size?: "sm" | "md";
  className?: string;
  showLabel?: boolean;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("flex-1 overflow-hidden rounded-full bg-accent", size === "sm" ? "h-1" : "h-1.5")}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", PROGRESS_TONES[tone])}
          style={{ width: `${v}%` }}
        />
      </div>
      {showLabel && <span className="w-9 text-right text-xs tabular text-muted">{v}%</span>}
    </div>
  );
}
