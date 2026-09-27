import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-medium [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-accent text-muted",
        primary: "bg-primary-soft text-primary",
        secondary: "bg-secondary-soft text-secondary-fg dark:text-secondary",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        info: "bg-info-soft text-info",
        violet: "bg-violet-soft text-violet",
        outline: "border border-border text-muted",
      },
      size: {
        sm: "h-5 px-1.5 text-[11px]",
        md: "h-6 px-2 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Kropka w kolorze tonu przed treścią. */
  dot?: boolean;
}

export function Badge({ className, tone, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---------- statusy pomysłów ---------- */

export type PostStatus =
  | "TO_VERIFY"
  | "SUBMITTED"
  | "IN_PROGRESS"
  | "IMPLEMENTED"
  | "CANCELLED";

export const STATUS_META: Record<
  PostStatus,
  { label: string; tone: BadgeTone; color: string }
> = {
  TO_VERIFY: { label: "Do weryfikacji", tone: "warning", color: "var(--warning)" },
  SUBMITTED: { label: "Zgłoszony", tone: "info", color: "var(--info)" },
  IN_PROGRESS: { label: "W realizacji", tone: "violet", color: "var(--violet)" },
  IMPLEMENTED: { label: "Wdrożony", tone: "success", color: "var(--success)" },
  CANCELLED: { label: "Odrzucony", tone: "danger", color: "var(--danger)" },
};

export function statusLabel(status: string | null | undefined) {
  return STATUS_META[status as PostStatus]?.label ?? status ?? "-";
}

export function StatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: PostStatus | string;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = STATUS_META[status as PostStatus];
  return (
    <Badge tone={meta?.tone ?? "neutral"} size={size} dot className={className}>
      {meta?.label ?? status}
    </Badge>
  );
}

/* ---------- role ---------- */

export const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Pracownik",
  TEAM_LEAD: "Lider zespołu",
  MANAGER: "Kierownik",
  DIRECTOR: "Dyrektor",
};

export function roleLabel(role: string | null | undefined) {
  return ROLE_LABELS[role ?? ""] ?? role ?? "-";
}
