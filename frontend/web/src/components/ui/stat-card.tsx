import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

export interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  /** Zmiana procentowa vs poprzedni okres; dodatnia = zielona. */
  delta?: number | null;
  /** Odwraca kolory delty (np. dla czasu akceptacji mniej = lepiej). */
  invertDelta?: boolean;
  hint?: React.ReactNode;
  loading?: boolean;
  /** Dowolna treść pod wartością (np. sparkline). */
  footer?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  delta,
  invertDelta,
  hint,
  loading,
  footer,
  className,
}: StatCardProps) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const good = hasDelta && (invertDelta ? delta! <= 0 : delta! >= 0);
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-medium text-muted">{label}</span>
        {icon && (
          <span className="flex size-7 items-center justify-center rounded-md bg-surface-muted text-muted [&_svg]:size-4">
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight tabular text-foreground">
            {value}
          </span>
          {hasDelta && (
            <span
              className={cn(
                "inline-flex items-center text-xs font-medium tabular",
                good ? "text-success" : "text-danger",
              )}
            >
              {delta! >= 0 ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {Math.abs(delta!).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%
            </span>
          )}
        </div>
      )}
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {footer}
    </div>
  );
}
