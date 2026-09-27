"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  CheckCircle2,
  FileBarChart,
  Gauge,
  Lightbulb,
  PiggyBank,
  Timer,
  Users,
} from "lucide-react";
import {
  useApprovalsAnalytics,
  useDepartments,
  useOverview,
  useParticipation,
  useTopIdeas,
  useTrends,
} from "@/lib/analytics";
import { STAGE_LABELS } from "@/lib/ideas";
import { displayName, fmtHours, fmtNum, fmtPct, fmtPLN } from "@/lib/utils";
import { AnalyticsFilterBar, useAnalyticsFilters } from "@/components/reports/Filters";
import { BarList, ColumnChart, Sparkline, StatusBreakdown, TrendChart } from "@/components/charts/Charts";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { errorText } from "@/components/admin/Feedback";

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <Skeleton className="w-full" style={{ height }} />;
}

function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "danger" }) {
  return (
    <div className="rounded-md bg-surface-muted px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-0.5 text-base font-semibold tabular ${tone === "danger" ? "text-danger" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function DashboardContent() {
  const state = useAnalyticsFilters("12m");
  const { filters } = state;
  const [trendView, setTrendView] = useState<"volume" | "savings">("volume");

  const overview = useOverview(filters);
  const trends = useTrends("month", filters);
  const departments = useDepartments(filters);
  const approvals = useApprovalsAnalytics(filters);
  const participation = useParticipation(filters);
  const top = useTopIdeas("savings", filters);

  const ov = overview.data;
  const trendRows = trends.data ?? [];
  const spark = (key: "submissions" | "implementations" | "savings") => trendRows.map((r) => Number(r[key] ?? 0));
  const participationRows = (participation.data?.monthly ?? []).map((m) => ({ ...m, period: m.period ?? "" }));

  if (overview.isError) {
    return (
      <>
        <PageHeader title="Przegląd organizacji" />
        <ErrorState description={errorText(overview.error)} onRetry={() => overview.refetch()} />
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title="Przegląd organizacji"
        description="Zgłoszenia, wdrożenia i efekty programu Kaizen."
        actions={
          <Link href="/reports" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <FileBarChart /> Raporty
          </Link>
        }
      >
        <AnalyticsFilterBar state={state} />
      </PageHeader>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Zgłoszenia"
          icon={<Lightbulb />}
          value={fmtNum(ov?.total_ideas ?? 0)}
          loading={overview.isLoading}
          hint={ov ? `${fmtNum(ov.engagement.authors)} autorów` : undefined}
          footer={<Sparkline data={spark("submissions")} color={0} />}
        />
        <StatCard
          label="Wdrożenia"
          icon={<CheckCircle2 />}
          value={fmtNum(ov?.status_breakdown.IMPLEMENTED ?? 0)}
          loading={overview.isLoading}
          hint={ov ? `${fmtPct(ov.implemented_rate)} skuteczności` : undefined}
          footer={<Sparkline data={spark("implementations")} color={1} />}
        />
        <StatCard
          label="Oszczędności"
          icon={<PiggyBank />}
          value={fmtPLN(ov?.savings.realized_money ?? 0)}
          loading={overview.isLoading}
          hint={ov ? `potencjał ${fmtPLN(ov.savings.potential_money)}` : undefined}
          footer={<Sparkline data={spark("savings")} color={3} />}
        />
        <StatCard
          label="Uczestnictwo"
          icon={<Users />}
          value={fmtPct(participation.data?.summary.rate ?? 0)}
          loading={participation.isLoading}
          hint={
            participation.data
              ? `${fmtNum(participation.data.summary.active_users)} z ${fmtNum(participation.data.summary.total_users)} osób aktywnych`
              : undefined
          }
          footer={<Sparkline data={participationRows.map((m) => m.rate)} color={4} />}
        />
        <StatCard
          label="Śr. czas akceptacji"
          icon={<Timer />}
          value={fmtHours(ov?.avg_approval_hours ?? 0)}
          loading={overview.isLoading}
          hint={ov ? `śr. postęp wdrożeń ${fmtPct(Math.round(ov.avg_progress))}` : undefined}
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* trend + lejek */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={trendView === "volume" ? "Zgłoszenia i wdrożenia" : "Zrealizowane oszczędności"}
            description="Miesięcznie w wybranym okresie"
            action={
              <Tabs
                variant="pills"
                size="sm"
                value={trendView}
                onValueChange={setTrendView}
                items={[
                  { value: "volume", label: "Liczba" },
                  { value: "savings", label: "Oszczędności" },
                ]}
              />
            }
          />
          <CardContent>
            {trends.isLoading ? (
              <ChartSkeleton />
            ) : trendRows.length === 0 ? (
              <EmptyState size="sm" title="Brak danych w tym okresie" />
            ) : trendView === "volume" ? (
              <TrendChart
                data={trendRows}
                series={[
                  { key: "submissions", label: "Zgłoszenia", color: 0 },
                  { key: "implementations", label: "Wdrożenia", color: 1 },
                ]}
              />
            ) : (
              <ColumnChart data={trendRows} dataKey="savings" label="Oszczędności" format={fmtPLN} color={3} height={276} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Lejek statusów" description={ov ? `${fmtNum(ov.total_ideas)} pomysłów` : undefined} />
          <CardContent>
            {overview.isLoading || !ov ? <ChartSkeleton height={200} /> : <StatusBreakdown data={ov.status_breakdown} />}
          </CardContent>
        </Card>
      </div>

      {/* akceptacje, działy, top pomysły */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Akceptacje i SLA"
            description={approvals.data ? `SLA ${approvals.data.sla_days} dni na etap` : undefined}
            action={
              <Link href="/approvals" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Kolejka <ArrowRight className="size-3" />
              </Link>
            }
          />
          <CardContent>
            {approvals.isLoading ? (
              <ChartSkeleton height={220} />
            ) : approvals.isError || !approvals.data ? (
              <ErrorState size="sm" description={errorText(approvals.error)} onRetry={() => approvals.refetch()} />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <MiniStat label="W kolejce" value={fmtNum(approvals.data.pending_total)} />
                  <MiniStat
                    label="Po terminie"
                    value={fmtNum(approvals.data.overdue_count)}
                    tone={approvals.data.overdue_count > 0 ? "danger" : undefined}
                  />
                  <MiniStat
                    label="Czas decyzji (śr. / med.)"
                    value={`${fmtHours(approvals.data.avg_decision_hours)} / ${fmtHours(approvals.data.median_decision_hours)}`}
                  />
                  <MiniStat label="Odsetek akceptacji" value={fmtPct(approvals.data.approval_rate)} />
                </div>
                {approvals.data.overdue.length > 0 && (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-subtle">
                      <AlarmClock className="size-3" /> Najdłużej czekają
                    </p>
                    <ul className="divide-y divide-border">
                      {approvals.data.overdue.slice(0, 4).map((o) => (
                        <li key={o.post_id}>
                          <Link href={`/ideas/${o.post_id}`} className="flex items-center gap-2 py-1.5 text-[13px] hover:text-primary">
                            <span className="min-w-0 flex-1 truncate text-foreground">{o.title}</span>
                            <Badge tone="neutral">{STAGE_LABELS[o.stage as keyof typeof STAGE_LABELS] ?? o.stage}</Badge>
                            <span className="w-14 shrink-0 text-right text-xs tabular text-danger">
                              {Math.round(o.waiting_hours / 24)} dni
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Najaktywniejsze działy"
            description="Liczba zgłoszeń"
            action={
              <Link href="/departments" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Wszystkie <ArrowRight className="size-3" />
              </Link>
            }
          />
          <CardContent>
            {departments.isLoading ? (
              <ChartSkeleton height={220} />
            ) : !departments.data?.length ? (
              <EmptyState size="sm" title="Brak danych" />
            ) : (
              <BarList
                rows={[...departments.data].sort((a, b) => b.total_ideas - a.total_ideas).slice(0, 6)}
                label={(d) => d.department}
                secondary={(d) => `${fmtPct(d.implemented_rate)} wdrożeń`}
                value={(d) => d.total_ideas}
                color={0}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Największe oszczędności" description="Pomysły z ankietą, miesięcznie" />
          <CardContent>
            {top.isLoading ? (
              <ChartSkeleton height={220} />
            ) : !top.data?.length ? (
              <EmptyState size="sm" title="Brak pomysłów z ankietą" />
            ) : (
              <ol className="flex flex-col gap-0.5">
                {top.data.slice(0, 6).map((idea, i) => (
                  <li key={idea.id}>
                    <Link href={`/ideas/${idea.id}`} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-accent">
                      <span className="w-4 text-xs font-semibold tabular text-subtle">{i + 1}</span>
                      {idea.author && <Avatar user={idea.author} size="sm" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">{idea.title}</span>
                        <span className="block truncate text-[11px] text-subtle">
                          {[idea.author ? displayName(idea.author) : null, idea.department].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold tabular text-success">{fmtPLN(idea.savings ?? 0)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* uczestnictwo */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Uczestnictwo w czasie" description="Odsetek osób aktywnych (zgłoszenie, komentarz lub polubienie) w miesiącu" />
          <CardContent>
            {participation.isLoading ? (
              <ChartSkeleton height={220} />
            ) : participationRows.length === 0 ? (
              <EmptyState size="sm" title="Brak danych" />
            ) : (
              <ColumnChart data={participationRows} dataKey="rate" label="Aktywni" format={(v) => fmtPct(Math.round(v))} color={4} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-1.5">
                <Gauge className="size-4 text-muted" /> Uczestnictwo w działach
              </span>
            }
          />
          <CardContent>
            {participation.isLoading ? (
              <ChartSkeleton height={220} />
            ) : !participation.data?.departments.length ? (
              <EmptyState size="sm" title="Brak danych" />
            ) : (
              <BarList
                rows={[...participation.data.departments].sort((a, b) => b.rate - a.rate)}
                label={(d) => d.department}
                secondary={(d) => `${d.active_users}/${d.total_users}`}
                value={(d) => d.rate}
                format={(v) => fmtPct(Math.round(v))}
                color={4}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<ChartSkeleton height={400} />}>
      <DashboardContent />
    </Suspense>
  );
}
