import { cn, displayName, initials, type PersonLike } from "@/lib/utils";

const SIZES = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-16 text-lg",
  "2xl": "size-24 text-2xl",
} as const;

// Deterministyczny kolor tła na podstawie imienia (tylko tokeny).
const TONES = [
  "bg-primary-soft text-primary",
  "bg-secondary-soft text-secondary-fg dark:text-secondary",
  "bg-violet-soft text-violet",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
  "bg-info-soft text-info",
];

function toneFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return TONES[Math.abs(h) % TONES.length];
}

export interface AvatarProps {
  user?: (PersonLike & { avatar_url?: string | null }) | null;
  /** Alternatywnie bezpośrednio: */
  src?: string | null;
  name?: string;
  size?: keyof typeof SIZES;
  className?: string;
  ring?: boolean;
}

export function Avatar({ user, src, name, size = "md", className, ring }: AvatarProps) {
  const url = src ?? user?.avatar_url ?? null;
  const label = name ?? displayName(user);
  const text = user ? initials(user) : (label[0] ?? "?").toUpperCase();
  return (
    <span
      title={label}
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold",
        SIZES[size],
        !url && toneFor(label),
        ring && "ring-2 ring-surface",
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="size-full object-cover" />
      ) : (
        text
      )}
    </span>
  );
}

export function AvatarGroup({
  users,
  max = 4,
  size = "sm",
}: {
  users: AvatarProps["user"][];
  max?: number;
  size?: keyof typeof SIZES;
}) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((u, i) => (
        <Avatar key={i} user={u} size={size} ring />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-accent font-medium text-muted ring-2 ring-surface",
            SIZES[size],
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
