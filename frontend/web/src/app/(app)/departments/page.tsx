"use client";
import { Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Coins, PiggyBank } from "lucide-react";
import { useDepartments, type DepartmentRow } from "@/lib/analytics";
import { fmtHours, fmtNum, fmtPct, fmtPLN } from "@/lib/utils";
import { AnalyticsFilterBar, useAnalyticsFilters } from "@/components/reports/Filters";
import { BarList, HBar } from "@/components/charts/Charts";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/table";
import { Progress } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/empty-state";
import { errorText } from "@/components/admin/Feedback";

const columns: Column<DepartmentRow>[] = [
  {
    key: "department",
    header: "Dział",
    sortable: true,
    cell: (r) => <span className="font-medium">{r.department}</span>,
  },
  { key: "total_ideas", header: "Pomysły", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtNum(r.total_ideas)}</span> },
  { key: "implemented", header: "Wdrożone", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtNum(r.implemented)}</span> },
  {
    key: "implemented_rate",
    header: "Skuteczność",
    sortable: true,
    className: "w-40 hidden md:table-cell",
    cell: (r) => <Progress value={r.implemented_rate} size="sm" tone="success" showLabel />,
  },
  { key: "savings_money", header: "Oszczędności", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtPLN(r.savings_money)}</span> },
  {
    key: "estimated_cost",
    header: "Koszt",
    sortable: true,
    align: "right",
    className: "hidden lg:table-cell",
    cell: (r) => <span className="tabular text-muted">{fmtPLN(r.estimated_cost)}</span>,
  },
  {
    key: "roi",
    header: "ROI",
    sortable: true,
    align: "right",
    cell: (r) => (
      <span className={`tabular font-medium ${r.roi >= 1 ? "text-success" : "text-muted"}`}>
        {r.roi.toLocaleString("pl-PL", { maximumFractionDigits: 2 })}×
      </span>
    ),
  },
  {
    key: "avg_approval_hours",
    header: "Śr. akceptacja",
    sortable: true,
    align: "right",
    className: "hidden lg:table-cell",
    cell: (r) => <span className="tabular text-muted">{fmtHours(r.avg_approval_hours)}</span>,
  },
];

function DepartmentsContent() {
  const router = useRouter();
  const state = useAnalyticsFilters("12m");
  const query = useDepartments(state.filters);
  const rows = useMemo(() => query.data ?? [], [query.data]);

  const totals = useMemo(() => {
    const sum = (k: keyof DepartmentRow) => rows.reduce((a, r) => a + Number(r[k] ?? 0), 0);
    const ideas = sum("total_ideas");
    return {
      departments: rows.length,
      ideas,
      implemented: sum("implemented"),
      savings: sum("savings_money"),
      cost: sum("estimated_cost"),
      rate: ideas ? (sum("implemented") / ideas) * 100 : 0,
    };
  }, [rows]);

  return (
    <div>
      <PageHeader title="Działy" description="Efektywność, oszczędności i czas akceptacji według działu.">
        <AnalyticsFilterBar state={state} showDepartment={false} showCategory />
      </PageHeader>

      {query.isError ? (
        <ErrorState description={errorText(query.error)} onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Działy z pomysłami" value={fmtNum(totals.departments)} icon={<Building2 />} loading={query.isLoading} />
            <StatCard
              label="Wdrożenia"
              value={fmtNum(totals.implemented)}
              icon={<CheckCircle2 />}
              hint={`${fmtPct(Math.round(totals.rate))} z ${fmtNum(totals.ideas)} pomysłów`}
              loading={query.isLoading}
            />
            <StatCard label="Oszczędności" value={fmtPLN(totals.savings)} icon={<PiggyBank />} loading={query.isLoading} />
            <StatCard label="Koszt wdrożeń" value={fmtPLN(totals.cost)} icon={<Coins />} loading={query.isLoading} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Oszczędności według działu" />
              <CardContent>
                {query.isLoading ? (
                  <Skeleton className="h-56" />
                ) : (
                  <HBar
                    data={[...rows].sort((a, b) => b.savings_money - a.savings_money)}
                    dataKey="savings_money"
                    labelKey="department"
                    label="Oszczędności"
                    format={fmtPLN}
                    color={3}
                  />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Skuteczność wdrożeń" description="Odsetek pomysłów doprowadzonych do wdrożenia" />
              <CardContent>
                {query.isLoading ? (
                  <Skeleton className="h-56" />
                ) : (
                  <BarList
                    rows={[...rows].sort((a, b) => b.implemented_rate - a.implemented_rate)}
                    label={(r) => r.department}
                    secondary={(r) => `${r.implemented}/${r.total_ideas}`}
                    value={(r) => r.implemented_rate}
                    format={(v) => fmtPct(Math.round(v))}
                    color={1}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <DataTable
              columns={columns}
              data={query.data}
              loading={query.isLoading}
              rowKey={(r) => r.department_id}
              defaultSort={{ key: "total_ideas", dir: "desc" }}
              onRowClick={(r) => router.push(`/team?department=${r.department_id}`)}
            />
            <p className="mt-2 text-xs text-subtle">Kliknij dział, aby zobaczyć jego zespół.</p>
          </div>
        </>
      )}
    </div>
  );
}

export default function DepartmentsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <DepartmentsContent />
    </Suspense>
  );
}
