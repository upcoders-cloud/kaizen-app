import { AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** "card" - z ramką przerywaną; "plain" - bez tła. */
  variant?: "card" | "plain";
  size?: "sm" | "md";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "plain",
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
        variant === "card" && "rounded-lg border border-dashed border-border-strong bg-surface",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-border bg-surface-muted text-muted shadow-xs",
          size === "sm" ? "size-9 [&_svg]:size-4" : "size-11 [&_svg]:size-5",
        )}
      >
        {icon ?? <Inbox />}
      </div>
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Stan błędu z opcjonalnym przyciskiem "Spróbuj ponownie". */
export function ErrorState({
  title = "Nie udało się wczytać danych",
  description = "Sprawdź połączenie i spróbuj ponownie.",
  onRetry,
  className,
  size,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <EmptyState
      icon={<AlertTriangle className="text-danger" />}
      title={title}
      description={description}
      size={size}
      className={className}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Spróbuj ponownie
          </Button>
        )
      }
    />
  );
}
