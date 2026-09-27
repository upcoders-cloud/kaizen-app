"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { cn, fmtNum } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

export interface PodiumEntry {
  key: string;
  rank: number;
  name: string;
  subtitle?: string | null;
  points: number;
  href?: string;
  avatar?: { avatar_url?: string | null; first_name?: string; last_name?: string; nickname?: string; username?: string } | null;
  isMe?: boolean;
}

const MEDAL = {
  1: { ring: "ring-medal-gold", text: "text-medal-gold", bg: "bg-medal-gold-soft", bar: "from-medal-gold-soft", height: 132 },
  2: { ring: "ring-medal-silver", text: "text-medal-silver", bg: "bg-medal-silver-soft", bar: "from-medal-silver-soft", height: 100 },
  3: { ring: "ring-medal-bronze", text: "text-medal-bronze", bg: "bg-medal-bronze-soft", bar: "from-medal-bronze-soft", height: 76 },
} as const;

function Place({ entry, place, index }: { entry: PodiumEntry; place: 1 | 2 | 3; index: number }) {
  const m = MEDAL[place];
  const first = place === 1;
  const content = (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.25 + index * 0.08, type: "spring", stiffness: 380, damping: 26 }}
        className="relative"
      >
        {first && (
          <Crown
            className="absolute -top-5 left-1/2 size-5 -translate-x-1/2 fill-current text-medal-gold"
            aria-hidden
          />
        )}
        {entry.avatar !== undefined ? (
          <Avatar
            user={entry.avatar ?? undefined}
            name={entry.name}
            size={first ? "xl" : "lg"}
            className={cn("ring-2 ring-offset-2 ring-offset-surface", m.ring)}
          />
        ) : (
          <span
            className={cn(
              "flex items-center justify-center rounded-full font-semibold ring-2 ring-offset-2 ring-offset-surface",
              m.ring,
              m.bg,
              m.text,
              first ? "size-16 text-lg" : "size-10 text-sm",
            )}
          >
            {entry.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span
          className={cn(
            "absolute -bottom-1.5 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full bg-elevated text-[10px] font-bold tabular shadow-xs ring-1 ring-border",
            m.text,
          )}
        >
          {entry.rank}
        </span>
      </motion.div>
      <p className={cn("mt-3 line-clamp-1 max-w-full px-1 font-semibold text-foreground", first ? "text-sm" : "text-[13px]")}>
        {entry.name}
        {entry.isMe && <span className="ml-1 text-xs font-medium text-primary">(Ty)</span>}
      </p>
      {entry.subtitle && <p className="line-clamp-1 max-w-full px-1 text-[11px] text-muted">{entry.subtitle}</p>}
      <p className={cn("mt-1 font-semibold tabular", first ? "text-lg text-foreground" : "text-sm text-foreground")}>
        {fmtNum(entry.points)} <span className="text-xs font-normal text-muted">pkt</span>
      </p>
    </div>
  );
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-end">
      {entry.href ? (
        <Link href={entry.href} className="w-full rounded-lg py-1 transition-opacity hover:opacity-80">
          {content}
        </Link>
      ) : (
        <div className="w-full">{content}</div>
      )}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: m.height }}
        transition={{ delay: 0.05 + index * 0.08, type: "spring", stiffness: 200, damping: 24 }}
        className={cn(
          "mt-3 flex w-full items-start justify-center overflow-hidden rounded-t-lg border border-b-0 border-border bg-gradient-to-b to-transparent pt-3",
          m.bar,
        )}
      >
        <span className={cn("text-3xl font-bold tabular opacity-70", m.text)}>{place}</span>
      </motion.div>
    </div>
  );
}

/** Podium top 3 (kolejność 2-1-3). Przy remisie miejsce na podium wynika z kolejności, a numer z `rank`. */
export function Podium({ entries }: { entries: PodiumEntry[] }) {
  const [first, second, third] = entries;
  if (!first) return null;
  return (
    <div className="flex items-end gap-2 sm:gap-4">
      {second ? <Place entry={second} place={2} index={1} /> : <div className="flex-1" />}
      <Place entry={first} place={1} index={0} />
      {third ? <Place entry={third} place={3} index={2} /> : <div className="flex-1" />}
    </div>
  );
}
