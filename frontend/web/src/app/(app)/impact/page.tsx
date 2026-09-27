"use client";
import { useState } from "react";
import Link from "next/link";
import { Award, CheckCircle2, Clock, Flame, Lightbulb, MessageSquare, Plus, Trophy, Wallet } from "lucide-react";
import { useHeatmap, useMyImpact } from "@/lib/analytics";
import { useBadges, useTransactions, type Transaction } from "@/lib/gamification";
import { cn, fmtDateTime, fmtHours, fmtNum, fmtPct, fmtPLN, fmtRelative, plural } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { StatusBreakdown } from "@/components/charts/Charts";
import { Heatmap } from "@/components/dashboard/Heatmap";
import { BadgeGrid } from "@/components/gamification/BadgeGrid";
import { errorText } from "@/components/admin/Feedback";

const transactionColumns: Column<Transaction>[] = [
  {
    key: "action",
    header: "Za co",
    cell: (t) => (
      <span>
        <span className="font-medium">{t.action_display || t.action}</span>
        {typeof t.metadata?.reason === "string" && <span className="block text-xs text-muted">{t.metadata.reason}</span>}
      </span>
    ),
  },
  {
    key: "points",
    header: "Punkty",
    align: "right",
    cell: (t) => (
      <span className={cn("font-semibold tabular", t.points >= 0 ? "text-success" : "text-danger")}>
        {t.points > 0 ? "+" : ""}
        {fmtNum(t.points)}
      </span>
    ),
  },
  {
    key: "created_at",
    header: "Kiedy",
    align: "right",
    cell: (t) => (
      <span className="text-xs text-muted" title={fmtDateTime(t.created_at)}>
        {fmtRelative(t.created_at)}
      </span>
    ),
  },
];

export default function ImpactPage() {
  const year = new Date().getFullYear();
  const [hmYear, setHmYear] = useState(year);
  const impact = useMyImpact();
  const heatmap = useHeatmap(hmYear);
  const badges = useBadges();
  const transactions = useTransactions();
  const me = impact.data;

  return (
    <div>
      <PageHeader
        title="Mój wkład"
        description="Twoje pomysły, efekty i aktywność w programie Kaizen."
        actions={
          <Link href="/ideas/new" className={buttonVariants({ size: "sm" })}>
            <Plus /> Nowy pomysł
          </Link>
        }
      />

      {impact.isError ? (
        <ErrorState description={errorText(impact.error)} onRetry={() => impact.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Moje pomysły" icon={<Lightbulb />} value={fmtNum(me?.total_ideas ?? 0)} loading={!me} />
            <StatCard
              label="Wdrożone"
              icon={<CheckCircle2 />}
              value={fmtNum(me?.implemented ?? 0)}
              hint={me ? `${fmtPct(me.implemented_rate)} skuteczności` : undefined}
              loading={!me}
            />
            <StatCard
              label="Oszczędności"
              icon={<Wallet />}
              value={fmtPLN(me?.savings_generated ?? 0)}
              hint={me ? `${fmtHours(me.savings_hours)} odzyskanego czasu` : undefined}
              loading={!me}
            />
            <StatCard
              label="Punkty"
              icon={<Trophy />}
              value={fmtNum(me?.points ?? 0)}
              hint={me?.rank ? `#${me.rank} w rankingu` : undefined}
              loading={!me}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card className="min-w-0 lg:col-span-2">
              <CardHeader
                title={`Aktywność w ${hmYear}`}
                description={heatmap.data ? `${fmtNum(heatmap.data.total)} ${plural(heatmap.data.total, "akcja", "akcje", "akcji")}` : undefined}
                action={
                  <Tabs
                    variant="pills"
                    size="sm"
                    value={String(hmYear)}
                    onValueChange={(v) => setHmYear(Number(v))}
                    items={[year - 1, year].map((y) => ({ value: String(y), label: String(y) }))}
                  />
                }
              />
              <CardContent>
                {heatmap.data ? <Heatmap year={heatmap.data.year} days={heatmap.data.days} /> : <Skeleton className="h-32" />}
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Status moich pomysłów" />
              <CardContent>
                {!me ? (
                  <Skeleton className="h-48" />
                ) : me.total_ideas === 0 ? (
                  <EmptyState size="sm" icon={<Lightbulb />} title="Nie masz jeszcze pomysłów" />
                ) : (
                  <StatusBreakdown data={me.status_breakdown} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatCard
              label="Najdłuższa seria"
              icon={<Flame />}
              value={me ? `${me.longest_streak} ${plural(me.longest_streak, "dzień", "dni", "dni")}` : "-"}
              loading={!me}
            />
            <StatCard label="Odznaki" icon={<Award />} value={fmtNum(me?.badges_count ?? 0)} loading={!me} />
            <StatCard label="Komentarze" icon={<MessageSquare />} value={fmtNum(me?.comments_made ?? 0)} loading={!me} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Odznaki"
                description={badges.data ? `${badges.data.filter((b) => b.earned).length} z ${badges.data.length} zdobytych` : undefined}
              />
              <CardContent>
                {badges.isLoading ? (
                  <Skeleton className="h-48" />
                ) : badges.isError ? (
                  <ErrorState size="sm" description={errorText(badges.error)} onRetry={() => badges.refetch()} />
                ) : (
                  <BadgeGrid badges={badges.data ?? []} compact />
                )}
              </CardContent>
            </Card>
            <div className="min-w-0">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Clock className="size-4 text-muted" /> Historia punktów
              </h2>
              <DataTable
                columns={transactionColumns}
                data={transactions.data}
                loading={transactions.isLoading}
                rowKey={(t) => t.id}
                pageSize={10}
                dense
                empty={<EmptyState size="sm" title="Brak transakcji" />}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
