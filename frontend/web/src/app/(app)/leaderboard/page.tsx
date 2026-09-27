"use client";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Flame, Layers, Trophy, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { leaderboardKey, useLeaderboard, type LeaderboardRow, type Period, type Scope } from "@/lib/gamification";
import { cn, displayName, fmtNum } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { useUrlState } from "@/components/ui/use-url-state";
import { errorText } from "@/components/admin/Feedback";
import { Podium, type PodiumEntry } from "@/components/gamification/Podium";

const PERIODS: { value: Period; label: string }[] = [
  { value: "week", label: "Tydzień" },
  { value: "month", label: "Miesiąc" },
  { value: "quarter", label: "Kwartał" },
  { value: "all", label: "Cały czas" },
];

const SCOPES: { value: Scope; label: string; icon: React.ReactNode }[] = [
  { value: "users", label: "Osoby", icon: <Users /> },
  { value: "departments", label: "Działy", icon: <Building2 /> },
  { value: "categories", label: "Kategorie", icon: <Layers /> },
];

const PERIOD_HINT: Record<Period, string> = {
  week: "Punkty z ostatnich 7 dni",
  month: "Punkty z ostatnich 30 dni",
  quarter: "Punkty z ostatnich 90 dni",
  all: "Saldo punktów od początku",
};

function rowName(row: LeaderboardRow, scope: Scope) {
  if (scope === "users") return row.user ? displayName(row.user) : "Użytkownik";
  if (scope === "departments") return row.department ?? "Dział";
  return row.category ?? "Kategoria";
}

function LeaderboardContent() {
  const { user } = useAuth();
  const url = useUrlState();
  const scope = (url.get("scope") as Scope) || "users";
  const period = (url.get("period") as Period) || "month";
  const query = useLeaderboard(period, scope);
  const rows = useMemo(() => query.data?.results ?? [], [query.data]);
  const me = query.data?.me;
  const max = Math.max(1, ...rows.map((r) => r.points));

  const podium: PodiumEntry[] = rows.slice(0, 3).map((r, i) => ({
    key: leaderboardKey(r, i),
    rank: r.rank,
    name: rowName(r, scope),
    subtitle: scope === "users" ? (r.user?.department_name ?? r.level?.name) : null,
    points: r.points,
    href: scope === "users" && r.user ? `/profile/${r.user.id}` : undefined,
    avatar: scope === "users" ? (r.user ?? null) : undefined,
    isMe: scope === "users" && r.user?.id === user?.id,
  }));

  // Ile punktów brakuje do osoby wyżej.
  const myIndex = scope === "users" ? rows.findIndex((r) => r.user?.id === user?.id) : -1;
  const gap = myIndex > 0 ? rows[myIndex - 1].points - rows[myIndex].points : null;

  return (
    <div>
      <PageHeader title="Ranking" description={PERIOD_HINT[period]}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Tabs value={scope} onValueChange={(v) => url.set("scope", v === "users" ? null : v)} items={SCOPES} className="flex-1" />
          <Tabs
            variant="pills"
            size="sm"
            value={period}
            onValueChange={(v) => url.set("period", v === "month" ? null : v)}
            items={PERIODS}
          />
        </div>
      </PageHeader>

      {query.isError ? (
        <ErrorState description={errorText(query.error)} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-64" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState variant="card" icon={<Trophy />} title="Brak punktów w tym okresie" description="Wybierz dłuższy okres albo zgłoś pomysł, żeby otworzyć ranking." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-4">
            <Card className="overflow-hidden px-4 pt-8 sm:px-8">
              <Podium entries={podium} />
            </Card>

            <Card className="overflow-hidden">
              <ol>
                {rows.slice(3).map((row, i) => {
                  const isMe = scope === "users" && row.user?.id === user?.id;
                  const name = rowName(row, scope);
                  const inner = (
                    <>
                      <span className="w-8 shrink-0 text-center text-[13px] font-semibold tabular text-subtle">{row.rank}</span>
                      {scope === "users" ? (
                        <Avatar user={row.user} size="md" />
                      ) : (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-muted">
                          {name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">
                          {name}
                          {isMe && <span className="ml-1.5 text-xs text-primary">(Ty)</span>}
                        </span>
                        {scope === "users" && row.user?.department_name && (
                          <span className="block truncate text-xs text-muted">{row.user.department_name}</span>
                        )}
                      </span>
                      {row.level && (
                        <Badge tone="primary" className="hidden sm:inline-flex">
                          {row.level.name}
                        </Badge>
                      )}
                      {!!row.streak && row.streak > 1 && (
                        <span className="hidden items-center gap-0.5 text-xs text-warning md:inline-flex" title="Seria dni aktywności">
                          <Flame className="size-3.5" /> {row.streak}
                        </span>
                      )}
                      <span className="hidden w-28 md:block">
                        <span className="block h-1.5 overflow-hidden rounded-full bg-accent">
                          <span className="block h-full rounded-full bg-chart-1" style={{ width: `${(row.points / max) * 100}%` }} />
                        </span>
                      </span>
                      <span className="w-20 shrink-0 text-right text-[13px] font-semibold tabular text-foreground">
                        {fmtNum(row.points)}
                      </span>
                    </>
                  );
                  const cls = cn(
                    "flex items-center gap-3 border-b border-border px-4 py-2.5 transition-colors last:border-0",
                    isMe ? "bg-primary-soft/50" : "hover:bg-surface-muted",
                  );
                  return (
                    <motion.li
                      key={leaderboardKey(row, i + 3)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i, 15) * 0.015 }}
                    >
                      {scope === "users" && row.user ? (
                        <Link href={`/profile/${row.user.id}`} className={cls}>
                          {inner}
                        </Link>
                      ) : (
                        <div className={cls}>{inner}</div>
                      )}
                    </motion.li>
                  );
                })}
                {rows.length <= 3 && <li className="px-4 py-6 text-center text-xs text-subtle">Tylko podium w tym okresie.</li>}
              </ol>
            </Card>
          </div>

          <aside className="flex flex-col gap-4 xl:sticky xl:top-6 xl:self-start">
            {scope === "users" && (
              <Card className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-subtle">Twoja pozycja</p>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar user={user} size="lg" />
                  <div>
                    <p className="text-2xl font-semibold tabular text-foreground">{me?.rank ? `#${me.rank}` : "-"}</p>
                    <p className="text-xs text-muted tabular">{fmtNum(me?.points ?? 0)} pkt w okresie</p>
                  </div>
                </div>
                <p className="mt-3 text-[13px] text-muted">
                  {!me?.rank
                    ? "Nie masz jeszcze punktów w tym okresie. Zgłoś pomysł albo skomentuj, żeby wejść do rankingu."
                    : me.rank === 1
                      ? "Prowadzisz! Utrzymaj serię aktywności."
                      : gap !== null
                        ? `Do miejsca wyżej brakuje Ci ${fmtNum(gap)} pkt.`
                        : "Poza top 100 - każda aktywność się liczy."}
                </p>
              </Card>
            )}
            <Card className="p-4 text-[13px] text-muted">
              <p className="mb-2 font-semibold text-foreground">Jak zdobywać punkty?</p>
              <ul className="space-y-1.5">
                <li>Zgłoszenie pomysłu i jego akceptacja.</li>
                <li>Wdrożenie pomysłu (najwięcej punktów).</li>
                <li>Komentarze i polubienia od innych.</li>
                <li>Seria dni z aktywnością.</li>
              </ul>
              <Link href="/rewards" className="mt-3 inline-block font-medium text-primary hover:underline">
                Wymień punkty na nagrody
              </Link>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <LeaderboardContent />
    </Suspense>
  );
}
