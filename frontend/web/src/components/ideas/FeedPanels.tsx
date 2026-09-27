"use client";
import Link from "next/link";
import { Flame, Heart, Lightbulb, MessageSquare, Plus, Trophy, Zap } from "lucide-react";
import { cn, displayName, fmtNum, plural } from "@/lib/utils";
import { useTrending } from "@/lib/ideas";
import { useGamificationMe, useLeaderboard } from "@/lib/gamification";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";

export function MyLevelCard() {
  const { user } = useAuth();
  const me = useGamificationMe();
  const g = me.data;
  const progress = Math.round((g?.level_progress ?? 0) <= 1 ? (g?.level_progress ?? 0) * 100 : (g?.level_progress ?? 0));

  return (
    <Card className="overflow-hidden">
      <div className="relative p-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-secondary-soft blur-2xl"
        />
        <div className="relative flex items-center gap-3">
          <Avatar user={user} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{displayName(user)}</p>
            {me.isLoading ? (
              <Skeleton className="mt-1 h-3 w-24" />
            ) : (
              <p className="text-xs text-muted">
                {g?.level?.name ?? "Poziom 1"}
                {g?.rank ? ` · #${g.rank} w rankingu` : ""}
              </p>
            )}
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-surface-muted px-3 py-2">
            <p className="text-[11px] text-muted">Punkty</p>
            <p className="text-lg font-semibold tabular text-foreground">
              {me.isLoading ? "-" : fmtNum(g?.points ?? 0)}
            </p>
          </div>
          <div className="rounded-md bg-surface-muted px-3 py-2">
            <p className="flex items-center gap-1 text-[11px] text-muted">
              <Flame className="size-3 text-warning" /> Seria
            </p>
            <p className="text-lg font-semibold tabular text-foreground">
              {me.isLoading ? "-" : `${g?.current_streak ?? 0} ${plural(g?.current_streak ?? 0, "dzień", "dni", "dni")}`}
            </p>
          </div>
        </div>
        {g?.next_level && (
          <div className="relative mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-muted">
              <span>Do poziomu {g.next_level.name}</span>
              <span className="tabular">{fmtNum(g.points_to_next ?? 0)} pkt</span>
            </div>
            <Progress value={progress} tone="secondary" size="sm" />
          </div>
        )}
      </div>
      <Link
        href="/rewards"
        className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs font-medium text-muted transition-colors hover:bg-accent hover:text-foreground"
      >
        Wymień punkty na nagrody <Zap className="size-3.5 text-secondary" />
      </Link>
    </Card>
  );
}

export function TopRankingCard() {
  const { user } = useAuth();
  const lb = useLeaderboard("month", "users");
  const rows = (lb.data?.results ?? []).slice(0, 5);
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            <Trophy className="size-4 text-warning" /> Top 5 miesiąca
          </span>
        }
        action={
          <Link href="/leaderboard" className="text-xs font-medium text-primary hover:underline">
            Ranking
          </Link>
        }
      />
      <div className="px-2 pb-2">
        {lb.isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted">Brak danych w tym miesiącu.</p>
        ) : (
          <ol>
            {rows.map((row, i) => {
              const u = row.user;
              const isMe = u?.id === user?.id;
              return (
                <li key={u?.id ?? i}>
                  <Link
                    href={u ? `/profile/${u.id}` : "/leaderboard"}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent",
                      isMe && "bg-primary-soft/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-semibold tabular",
                        i === 0
                          ? "bg-warning-soft text-warning"
                          : i < 3
                            ? "bg-accent text-foreground"
                            : "text-subtle",
                      )}
                    >
                      {row.rank ?? i + 1}
                    </span>
                    <Avatar user={u} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {displayName(u)}
                      </span>
                      {u?.department_name && (
                        <span className="block truncate text-[11px] text-subtle">{u.department_name}</span>
                      )}
                    </span>
                    <span className="text-xs font-semibold tabular text-muted">{fmtNum(row.points)}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
        {lb.data?.me && !rows.some((r) => r.user?.id === user?.id) && (
          <div className="mt-1 flex items-center justify-between border-t border-border px-2 pt-2 text-xs text-muted">
            <span>Twoja pozycja w miesiącu</span>
            <span className="font-semibold tabular text-foreground">
              #{lb.data.me.rank} · {fmtNum(lb.data.me.points)} pkt
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export function TrendingCard() {
  const trending = useTrending(5);
  const rows = trending.data ?? [];
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            <Flame className="size-4 text-danger" /> Na czasie
          </span>
        }
        description="Najwięcej interakcji w 14 dni"
      />
      <div className="px-2 pb-2">
        {trending.isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted">Nic się jeszcze nie dzieje.</p>
        ) : (
          <ul>
            {rows.map((p, i) => (
              <li key={p.id}>
                <Link
                  href={`/ideas/${p.id}`}
                  className="flex gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-accent"
                >
                  <span className="mt-0.5 w-4 shrink-0 text-xs font-semibold tabular text-subtle">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                      {p.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2.5 text-[11px] text-subtle">
                      {p.category_name && <span className="truncate">{p.category_name}</span>}
                      <span className="inline-flex items-center gap-0.5">
                        <Heart className="size-3" /> {fmtNum(p.likes_count ?? 0)}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <MessageSquare className="size-3" /> {fmtNum(p.comments_count ?? 0)}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export function NewIdeaCta() {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary-soft text-secondary-fg dark:text-secondary">
          <Lightbulb className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Masz pomysł na usprawnienie?</p>
          <p className="mt-0.5 text-xs text-muted">Zgłoszenie zajmuje 2 minuty. Każdy wdrożony pomysł to punkty.</p>
        </div>
      </div>
      <Link href="/ideas/new" className={cn(buttonVariants({ size: "sm" }), "mt-3 w-full")}>
        <Plus /> Zgłoś pomysł
      </Link>
    </div>
  );
}
