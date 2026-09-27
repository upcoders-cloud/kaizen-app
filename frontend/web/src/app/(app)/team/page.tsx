"use client";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, Hourglass, Lightbulb, PiggyBank, Star, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTeamAnalytics, type TeamMember } from "@/lib/analytics";
import { useDepartmentOptions } from "@/lib/ideas";
import { displayName, fmtDate, fmtNum, fmtPLN, fmtRelative } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge, roleLabel } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { useUrlState } from "@/components/ui/use-url-state";
import { errorText } from "@/components/admin/Feedback";

const INACTIVE_DAYS = 30;

function isInactive(m: TeamMember) {
  if (!m.last_activity) return true;
  return Date.now() - new Date(m.last_activity).getTime() > INACTIVE_DAYS * 86_400_000;
}

const columns: Column<TeamMember>[] = [
  {
    key: "name",
    header: "Osoba",
    sortable: true,
    sortValue: (m) => displayName(m),
    cell: (m) => (
      <Link href={`/profile/${m.id}`} className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
        <Avatar user={m} size="sm" />
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground hover:underline">{displayName(m)}</span>
          <span className="block truncate text-xs text-muted">{roleLabel(m.role)}</span>
        </span>
      </Link>
    ),
  },
  { key: "ideas", header: "Pomysły", sortable: true, align: "right", cell: (m) => <span className="tabular">{fmtNum(m.ideas)}</span> },
  { key: "implemented", header: "Wdrożone", sortable: true, align: "right", cell: (m) => <span className="tabular">{fmtNum(m.implemented)}</span> },
  {
    key: "in_progress",
    header: "W toku",
    sortable: true,
    align: "right",
    className: "hidden md:table-cell",
    cell: (m) => <span className="tabular text-muted">{fmtNum(m.in_progress)}</span>,
  },
  {
    key: "pending",
    header: "Do akceptacji",
    sortable: true,
    align: "right",
    className: "hidden md:table-cell",
    cell: (m) => <span className="tabular text-muted">{fmtNum(m.pending)}</span>,
  },
  { key: "points", header: "Punkty", sortable: true, align: "right", cell: (m) => <span className="font-medium tabular">{fmtNum(m.points)}</span> },
  {
    key: "last_activity",
    header: "Ostatnia aktywność",
    sortable: true,
    align: "right",
    sortValue: (m) => (m.last_activity ? new Date(m.last_activity).getTime() : 0),
    cell: (m) =>
      isInactive(m) ? (
        <Badge tone="neutral">{m.last_activity ? fmtRelative(m.last_activity) : "brak"}</Badge>
      ) : (
        <span className="text-xs text-muted">{fmtRelative(m.last_activity)}</span>
      ),
  },
];

function TeamContent() {
  const router = useRouter();
  const { user, isManagement } = useAuth();
  const url = useUrlState();
  const departments = useDepartmentOptions(isManagement);
  const paramDept = url.get("department");
  // Management: dział z URL, potem własny, potem pierwszy z listy. TEAM_LEAD: zawsze własny (backend ignoruje parametr).
  const department = isManagement
    ? paramDept || (user?.department ? String(user.department) : departments.data?.[0] ? String(departments.data[0].id) : "")
    : undefined;
  const waitingForDefault = isManagement && !department && departments.isLoading;
  const query = useTeamAnalytics(department || undefined, !waitingForDefault);
  const team = query.data;

  const inProgress = useMemo(() => team?.ideas_in_progress ?? [], [team]);

  return (
    <div>
      <PageHeader
        title="Mój zespół"
        description={
          team
            ? `${team.department.name}${team.department.lead_name ? ` · lider: ${team.department.lead_name}` : ""}`
            : "Aktywność członków działu"
        }
        actions={
          isManagement && (departments.data?.length ?? 0) > 0 ? (
            <Select
              selectSize="sm"
              aria-label="Dział"
              value={department ?? ""}
              onValueChange={(v) => url.set("department", v)}
              options={(departments.data ?? []).map((d) => ({ value: String(d.id), label: d.name }))}
              className="w-56"
            />
          ) : undefined
        }
      />

      {query.isError ? (
        <ErrorState
          title="Nie można wczytać zespołu"
          description={
            isManagement ? `${errorText(query.error)} Wybierz dział z listy powyżej.` : errorText(query.error)
          }
          onRetry={() => query.refetch()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Członkowie"
              icon={<Users />}
              value={fmtNum(team?.summary.members ?? 0)}
              hint={team ? `${fmtNum(team.summary.active_members)} aktywnych w ${INACTIVE_DAYS} dni` : undefined}
              loading={!team}
            />
            <StatCard label="Pomysły" icon={<Lightbulb />} value={fmtNum(team?.summary.ideas ?? 0)} loading={!team} />
            <StatCard label="Do akceptacji" icon={<Hourglass />} value={fmtNum(team?.summary.pending_approval ?? 0)} loading={!team} />
            <StatCard label="W realizacji" icon={<CalendarClock />} value={fmtNum(team?.summary.in_progress ?? 0)} loading={!team} />
            <StatCard label="Wdrożone" icon={<CheckCircle2 />} value={fmtNum(team?.summary.implemented ?? 0)} loading={!team} />
            <StatCard
              label="Oszczędności"
              icon={<PiggyBank />}
              value={fmtPLN(team?.summary.savings ?? 0)}
              hint={team ? `${fmtNum(team.summary.points)} pkt zespołu` : undefined}
              loading={!team}
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Aktywność członków</h2>
              <DataTable
                columns={columns}
                data={team?.members}
                loading={!team}
                rowKey={(m) => m.id}
                defaultSort={{ key: "points", dir: "desc" }}
                onRowClick={(m) => router.push(`/profile/${m.id}`)}
                empty={<EmptyState size="sm" icon={<Users />} title="Brak członków w dziale" />}
              />
            </div>
            <Card className="self-start">
              <CardHeader
                title={
                  <span className="flex items-center gap-1.5">
                    <Star className="size-4 text-violet" /> Pomysły w toku
                  </span>
                }
                description="Zaakceptowane i wdrażane w dziale"
              />
              <CardContent className="px-2">
                {!team ? (
                  <div className="space-y-2 px-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : inProgress.length === 0 ? (
                  <EmptyState size="sm" title="Nic w toku" />
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {inProgress.map((idea) => (
                      <li key={idea.id}>
                        <Link href={`/ideas/${idea.id}`} className="block rounded-md px-2 py-2 transition-colors hover:bg-accent">
                          <div className="flex items-start gap-2">
                            <span className="line-clamp-2 flex-1 text-[13px] font-medium leading-snug text-foreground">{idea.title}</span>
                            {idea.status && <StatusBadge status={idea.status} />}
                          </div>
                          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted">
                            {idea.author && <span className="truncate">{displayName(idea.author)}</span>}
                            {idea.deadline && (
                              <span className="inline-flex shrink-0 items-center gap-1">
                                <CalendarClock className="size-3" /> {fmtDate(idea.deadline)}
                              </span>
                            )}
                          </div>
                          {idea.status === "IN_PROGRESS" && (
                            <Progress value={idea.progress_percent ?? 0} size="sm" tone="violet" className="mt-1.5" />
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <TeamContent />
    </Suspense>
  );
}
