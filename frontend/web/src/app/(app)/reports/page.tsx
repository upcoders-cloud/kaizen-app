"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Download, Lightbulb, PiggyBank, Printer, Timer } from "lucide-react";
import {
  downloadExport,
  useCategories,
  useDepartments,
  useOverview,
  useTrends,
  type CategoryRow,
  type DepartmentRow,
  type ExportReport,
  type TrendRow,
} from "@/lib/analytics";
import { usePosts } from "@/lib/ideas";
import type { Post } from "@/lib/types";
import { displayName, fmtDate, fmtHours, fmtNum, fmtPct, fmtPLN } from "@/lib/utils";
import { AnalyticsFilterBar, useAnalyticsFilters } from "@/components/reports/Filters";
import { ColumnChart, HBar, StatusBreakdown, TrendChart, fmtPeriod } from "@/components/charts/Charts";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { errorText } from "@/components/admin/Feedback";

type ReportTab = "trends" | "departments" | "categories" | "ideas" | "overview";

const TABS: { value: ReportTab; label: string }[] = [
  { value: "trends", label: "Trendy" },
  { value: "departments", label: "Działy" },
  { value: "categories", label: "Kategorie" },
  { value: "ideas", label: "Pomysły" },
  { value: "overview", label: "Podsumowanie" },
];

const trendColumns: Column<TrendRow>[] = [
  { key: "period", header: "Okres", sortable: true, cell: (r) => fmtPeriod(r.period, true) },
  { key: "submissions", header: "Zgłoszenia", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtNum(r.submissions)}</span> },
  { key: "implementations", header: "Wdrożenia", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtNum(r.implementations)}</span> },
  { key: "savings", header: "Oszczędności", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtPLN(r.savings)}</span> },
];

const departmentColumns: Column<DepartmentRow>[] = [
  { key: "department", header: "Dział", sortable: true, cell: (r) => <span className="font-medium">{r.department}</span> },
  { key: "total_ideas", header: "Pomysły", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtNum(r.total_ideas)}</span> },
  { key: "implemented", header: "Wdrożone", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtNum(r.implemented)}</span> },
  { key: "implemented_rate", header: "Skuteczność", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtPct(r.implemented_rate)}</span> },
  { key: "savings_money", header: "Oszczędności", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtPLN(r.savings_money)}</span> },
  { key: "estimated_cost", header: "Koszt", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtPLN(r.estimated_cost)}</span> },
  { key: "avg_approval_hours", header: "Śr. akceptacja", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtHours(r.avg_approval_hours)}</span> },
];

const categoryColumns: Column<CategoryRow>[] = [
  { key: "category", header: "Kategoria", sortable: true, cell: (r) => <span className="font-medium">{r.category}</span> },
  { key: "total_ideas", header: "Pomysły", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtNum(r.total_ideas)}</span> },
  { key: "implemented", header: "Wdrożone", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtNum(r.implemented)}</span> },
  { key: "implemented_rate", header: "Skuteczność", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtPct(r.implemented_rate)}</span> },
  { key: "savings_money", header: "Oszczędności", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtPLN(r.savings_money)}</span> },
];

const ideaColumns: Column<Post>[] = [
  { key: "id", header: "ID", className: "w-14", cell: (p) => <span className="tabular text-muted">#{p.id}</span> },
  { key: "title", header: "Tytuł", cell: (p) => <span className="line-clamp-1 font-medium">{p.title}</span> },
  { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
  {
    key: "author",
    header: "Autor",
    className: "hidden md:table-cell",
    cell: (p) => (
      <span className="text-muted">
        {displayName(p.author)}
        {p.author.department_name ? ` · ${p.author.department_name}` : ""}
      </span>
    ),
  },
  { key: "category_name", header: "Kategoria", className: "hidden lg:table-cell", cell: (p) => <span className="text-muted">{p.category_name}</span> },
  { key: "created_at", header: "Zgłoszono", className: "hidden sm:table-cell", cell: (p) => <span className="tabular text-muted">{fmtDate(p.created_at)}</span> },
  {
    key: "savings",
    header: "Oszczędności",
    align: "right",
    cell: (p) => (
      <span className="tabular">{p.survey ? fmtPLN(p.survey.estimated_financial_savings) : "-"}</span>
    ),
  },
];

function ReportsContent() {
  const router = useRouter();
  const state = useAnalyticsFilters("12m");
  const { filters, url } = state;
  const tab = (url.get("report") as ReportTab) || "trends";
  const page = Number(url.get("page") || 1);
  const [busy, setBusy] = useState(false);

  const overview = useOverview(filters);
  const trends = useTrends("month", filters);
  const departments = useDepartments(filters);
  const categories = useCategories(filters);
  const ideas = usePosts({
    date_from: filters.date_from,
    date_to: filters.date_to,
    department: filters.department ? String(filters.department) : undefined,
    category: filters.category ? String(filters.category) : undefined,
    status: filters.status || "all",
    page,
    page_size: 20,
  });

  const active = useMemo(
    () =>
      ({ trends, departments, categories, ideas, overview })[tab] as {
        isLoading: boolean;
        isError: boolean;
        error: unknown;
        refetch: () => void;
      },
    [tab, trends, departments, categories, ideas, overview],
  );

  const exportFile = async (fmt: "csv" | "xlsx") => {
    setBusy(true);
    try {
      await downloadExport(tab as ExportReport, fmt, filters);
      toast.success("Pobrano raport", `Format ${fmt.toUpperCase()}`);
    } catch (err) {
      toast.error("Eksport nie powiódł się", errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const ov = overview.data;

  return (
    <div>
      <PageHeader
        title="Raporty"
        description="Wybierz zakres, filtry i rodzaj zestawienia. Eksport uwzględnia aktywne filtry."
        actions={
          <div className="no-print flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => window.print()}>
              <Printer /> Drukuj
            </Button>
            <DropdownMenu
              align="end"
              trigger={
                <Button size="sm" loading={busy}>
                  {!busy && <Download />} Eksport <ChevronDown />
                </Button>
              }
              items={[
                { type: "label", label: `Raport: ${TABS.find((t) => t.value === tab)?.label}` },
                { label: "CSV (Excel, ;)", onSelect: () => exportFile("csv") },
                { label: "XLSX", onSelect: () => exportFile("xlsx") },
              ]}
            />
          </div>
        }
      >
        <div className="no-print flex flex-col gap-3">
          <AnalyticsFilterBar state={state} showCategory showStatus />
          <Tabs value={tab} onValueChange={(v) => url.setMany({ report: v === "trends" ? null : v })} items={TABS} />
        </div>
      </PageHeader>

      {active.isError ? (
        <ErrorState description={errorText(active.error)} onRetry={active.refetch} />
      ) : (
        <>
          {tab === "trends" && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Zgłoszenia i wdrożenia" />
                  <CardContent>
                    {trends.isLoading ? (
                      <Skeleton className="h-64" />
                    ) : (
                      <TrendChart
                        data={trends.data ?? []}
                        series={[
                          { key: "submissions", label: "Zgłoszenia", color: 0 },
                          { key: "implementations", label: "Wdrożenia", color: 1 },
                        ]}
                      />
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader title="Oszczędności" />
                  <CardContent>
                    {trends.isLoading ? (
                      <Skeleton className="h-64" />
                    ) : (
                      <ColumnChart data={trends.data ?? []} dataKey="savings" label="Oszczędności" format={fmtPLN} color={3} height={288} />
                    )}
                  </CardContent>
                </Card>
              </div>
              <DataTable columns={trendColumns} data={trends.data} loading={trends.isLoading} rowKey={(r) => r.period} dense />
            </div>
          )}

          {tab === "departments" && (
            <DataTable
              columns={departmentColumns}
              data={departments.data}
              loading={departments.isLoading}
              rowKey={(r) => r.department_id}
              defaultSort={{ key: "total_ideas", dir: "desc" }}
            />
          )}

          {tab === "categories" && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <Card>
                <CardHeader title="Pomysły według kategorii" />
                <CardContent>
                  {categories.isLoading ? (
                    <Skeleton className="h-56" />
                  ) : (
                    <HBar
                      data={[...(categories.data ?? [])].sort((a, b) => b.total_ideas - a.total_ideas)}
                      dataKey="total_ideas"
                      labelKey="category"
                      label="Pomysły"
                    />
                  )}
                </CardContent>
              </Card>
              <DataTable
                columns={categoryColumns}
                data={categories.data}
                loading={categories.isLoading}
                rowKey={(r) => r.category_id}
                defaultSort={{ key: "total_ideas", dir: "desc" }}
              />
            </div>
          )}

          {tab === "ideas" && (
            <DataTable
              columns={ideaColumns}
              data={ideas.data?.results}
              loading={ideas.isLoading}
              rowKey={(p) => p.id}
              onRowClick={(p) => router.push(`/ideas/${p.id}`)}
              pagination={{
                page,
                pageSize: 20,
                total: ideas.data?.count ?? 0,
                onPageChange: (p) => url.setMany({ page: p }, { resetPage: false }),
              }}
              empty={<EmptyState size="sm" icon={<Lightbulb />} title="Brak pomysłów dla tych filtrów" />}
            />
          )}

          {tab === "overview" && (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="grid grid-cols-2 gap-3 lg:col-span-2">
                <StatCard label="Zgłoszenia" value={fmtNum(ov?.total_ideas ?? 0)} icon={<Lightbulb />} loading={overview.isLoading} />
                <StatCard
                  label="Wdrożenia"
                  value={fmtNum(ov?.status_breakdown.IMPLEMENTED ?? 0)}
                  hint={ov ? `${fmtPct(ov.implemented_rate)} skuteczności` : undefined}
                  icon={<CheckCircle2 />}
                  loading={overview.isLoading}
                />
                <StatCard
                  label="Oszczędności zrealizowane"
                  value={fmtPLN(ov?.savings.realized_money ?? 0)}
                  hint={ov ? `${fmtHours(ov.savings.realized_hours)} czasu` : undefined}
                  icon={<PiggyBank />}
                  loading={overview.isLoading}
                />
                <StatCard
                  label="Śr. czas akceptacji"
                  value={fmtHours(ov?.avg_approval_hours ?? 0)}
                  hint={ov ? `potencjał ${fmtPLN(ov.savings.potential_money)}` : undefined}
                  icon={<Timer />}
                  loading={overview.isLoading}
                />
              </div>
              <Card>
                <CardHeader title="Statusy" />
                <CardContent>{ov ? <StatusBreakdown data={ov.status_breakdown} /> : <Skeleton className="h-48" />}</CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <ReportsContent />
    </Suspense>
  );
}
