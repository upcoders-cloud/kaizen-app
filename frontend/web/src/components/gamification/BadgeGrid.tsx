"use client";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { Badge as BadgeType } from "@/lib/gamification";
import { cn, fmtDate, fmtNum } from "@/lib/utils";
import { Progress } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { TIER_META, renderIcon } from "./icons";

/** Siatka odznak z postępem (z `/gamification/badges/`): zdobyte kolorowe, pozostałe wyszarzone z paskiem. */
export function BadgeGrid({ badges, compact }: { badges: BadgeType[]; compact?: boolean }) {
  const sorted = [...badges].sort((a, b) => Number(b.earned) - Number(a.earned) || a.order - b.order);
  return (
    <ul className={cn("grid gap-2", compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>
      {sorted.map((b, i) => {
        const tier = TIER_META[b.tier] ?? TIER_META.BRONZE;
        const progress = Math.round((b.progress ?? 0) <= 1 ? (b.progress ?? 0) * 100 : (b.progress ?? 0));
        return (
          <motion.li
            key={b.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 12) * 0.02 }}
          >
            <Tooltip
              content={
                <span>
                  {b.description}
                  {b.earned && b.awarded_at ? <span className="block opacity-70">Zdobyta {fmtDate(b.awarded_at)}</span> : null}
                </span>
              }
              triggerClassName="flex w-full"
            >
              <div
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3",
                  b.earned ? "border-border bg-surface" : "border-dashed border-border bg-surface-muted/60",
                )}
              >
                <span
                  className={cn(
                    "relative flex size-10 shrink-0 items-center justify-center rounded-full",
                    b.earned ? tier.className : "bg-accent text-subtle",
                  )}
                >
                  {renderIcon(b.icon, "size-5")}
                  {!b.earned && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-elevated ring-1 ring-border">
                      <Lock className="size-2.5 text-subtle" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-[13px] font-medium", b.earned ? "text-foreground" : "text-muted")}>
                    {b.name}
                  </span>
                  {b.earned ? (
                    <span className="block text-[11px] text-subtle">{tier.label}</span>
                  ) : (
                    <span className="mt-1 block">
                      <Progress value={progress} size="sm" tone="secondary" />
                      <span className="mt-0.5 block text-[10px] tabular text-subtle">
                        {fmtNum(b.value ?? 0)} / {fmtNum(b.threshold)}
                      </span>
                    </span>
                  )}
                </span>
              </div>
            </Tooltip>
          </motion.li>
        );
      })}
    </ul>
  );
}
