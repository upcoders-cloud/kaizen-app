"use client";
import { Suspense, useState } from "react";
import { Check, Gift, PackageCheck, X } from "lucide-react";
import {
  useAdminList,
  useAdminStats,
  useRedemptionAction,
  type AdminRedemption,
  type AdminReward,
} from "@/lib/admin";
import { REDEMPTION_STATUS } from "@/lib/gamification";
import { displayName, fmtDateTime, fmtNum, fmtRelative } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { useUrlState } from "@/components/ui/use-url-state";
import { ActiveBadge, errorText } from "@/components/admin/Feedback";
import { ResourceManager, type FieldConfig } from "@/components/admin/ResourceManager";
import { renderIcon } from "@/components/gamification/icons";

type Tab = "queue" | "catalog";
type Action = "approve" | "deliver" | "reject";

const STATUS_FILTERS = [
  { value: "PENDING,APPROVED", label: "Do obsługi" },
  { value: "PENDING", label: "Oczekujące" },
  { value: "APPROVED", label: "Zatwierdzone" },
  { value: "DELIVERED", label: "Wydane" },
  { value: "REJECTED", label: "Odrzucone" },
  { value: "all", label: "Wszystkie" },
];

const ACTION_META: Record<Action, { title: string; confirm: string; variant: "primary" | "success" | "danger"; success: string }> = {
  approve: { title: "Zatwierdź wymianę", confirm: "Zatwierdź", variant: "primary", success: "Wymiana zatwierdzona" },
  deliver: { title: "Oznacz jako wydaną", confirm: "Wydano", variant: "success", success: "Nagroda wydana" },
  reject: { title: "Odrzuć wymianę", confirm: "Odrzuć", variant: "danger", success: "Wymiana odrzucona, punkty wróciły do użytkownika" },
};

const rewardFields: FieldConfig[] = [
  { key: "name", label: "Nazwa", required: true, wide: true },
  { key: "description", label: "Opis", type: "textarea" },
  { key: "cost_points", label: "Koszt (pkt)", type: "number", required: true },
  { key: "stock", label: "Stan magazynowy", type: "number", nullable: true, hint: "Puste = bez limitu." },
  { key: "icon", label: "Ikona", placeholder: "np. coffee, gift, ticket", defaultValue: "gift" },
  { key: "order", label: "Kolejność", type: "number", defaultValue: 0 },
  { key: "is_active", label: "Aktywna", type: "checkbox", defaultValue: true, hint: "Nieaktywna nagroda znika ze sklepu." },
];

type RewardRow = AdminReward & Record<string, unknown>;

const rewardColumns: Column<RewardRow>[] = [
  {
    key: "name",
    header: "Nagroda",
    sortable: true,
    cell: (r) => (
      <span className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary-soft text-secondary-fg dark:text-secondary">
          {renderIcon(r.icon, "size-4")}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{r.name}</span>
          <span className="block truncate text-xs text-muted">{r.description}</span>
        </span>
      </span>
    ),
  },
  { key: "cost_points", header: "Koszt", sortable: true, align: "right", cell: (r) => <span className="tabular">{fmtNum(r.cost_points)} pkt</span> },
  {
    key: "stock",
    header: "Stan",
    sortable: true,
    align: "right",
    sortValue: (r) => r.stock ?? Number.MAX_SAFE_INTEGER,
    cell: (r) =>
      r.stock === null ? (
        <span className="text-muted">bez limitu</span>
      ) : (
        <span className={`tabular ${r.stock === 0 ? "text-danger" : ""}`}>{fmtNum(r.stock)}</span>
      ),
  },
  {
    key: "redemption_count",
    header: "Wymiany",
    sortable: true,
    align: "right",
    className: "hidden sm:table-cell",
    cell: (r) => <span className="tabular text-muted">{fmtNum(r.redemption_count ?? 0)}</span>,
  },
  { key: "is_active", header: "Status", cell: (r) => <ActiveBadge active={r.is_active} on="W sklepie" off="Ukryta" /> },
];

function ActionDialog({
  target,
  onClose,
}: {
  target: { item: AdminRedemption; action: Action } | null;
  onClose: () => void;
}) {
  const mutation = useRedemptionAction();
  const [note, setNote] = useState("");
  const meta = target ? ACTION_META[target.action] : null;

  const run = () => {
    if (!target || !meta) return;
    mutation.mutate(
      { id: target.item.id, action: target.action, note },
      {
        onSuccess: () => {
          toast.success(meta.success);
          setNote("");
          onClose();
        },
        onError: (err) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          toast.error(status === 409 ? "Status zmienił się w międzyczasie" : "Nie udało się zmienić statusu", errorText(err));
          if (status === 409) onClose();
        },
      },
    );
  };

  return (
    <Dialog
      open={!!target}
      onOpenChange={(o) => !o && onClose()}
      title={meta?.title}
      description={target ? `${target.item.reward?.name} · ${displayName(target.item.user)} · ${fmtNum(target.item.points_spent)} pkt` : undefined}
      size="sm"
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Anuluj
          </Button>
          <Button variant={meta?.variant} onClick={run} loading={mutation.isPending}>
            {meta?.confirm}
          </Button>
        </>
      }
    >
      <Field label="Notatka" hint={target?.action === "reject" ? "Użytkownik zobaczy powód w historii wymian." : "Opcjonalnie."}>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} data-autofocus />
      </Field>
    </Dialog>
  );
}

function RewardsAdminContent() {
  const url = useUrlState();
  const tab = (url.get("tab") as Tab) || "queue";
  const status = url.get("status") || "PENDING,APPROVED";
  const page = Number(url.get("page") || 1);
  const stats = useAdminStats();
  const queue = useAdminList<AdminRedemption>("redemptions", {
    status: status === "all" ? "" : status,
    page,
    page_size: 25,
  });
  const [target, setTarget] = useState<{ item: AdminRedemption; action: Action } | null>(null);

  const queueColumns: Column<AdminRedemption>[] = [
    {
      key: "user",
      header: "Użytkownik",
      cell: (r) => (
        <span className="flex items-center gap-2.5">
          <Avatar user={r.user} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{displayName(r.user)}</span>
            <span className="block truncate text-xs text-muted">{r.user.department_name ?? "Brak działu"}</span>
          </span>
        </span>
      ),
    },
    {
      key: "reward",
      header: "Nagroda",
      cell: (r) => (
        <span className="flex items-center gap-2">
          {renderIcon(r.reward?.icon, "size-4 text-muted")}
          <span className="truncate">{r.reward?.name ?? "Nagroda"}</span>
        </span>
      ),
    },
    { key: "points_spent", header: "Punkty", align: "right", cell: (r) => <span className="tabular">{fmtNum(r.points_spent)}</span> },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <span>
          <Badge tone={REDEMPTION_STATUS[r.status]?.tone ?? "neutral"} dot>
            {r.status_display || REDEMPTION_STATUS[r.status]?.label || r.status}
          </Badge>
          {r.note && <span className="mt-0.5 block max-w-48 truncate text-xs text-muted" title={r.note}>{r.note}</span>}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Złożona",
      className: "hidden md:table-cell",
      cell: (r) => (
        <span className="text-xs text-muted" title={fmtDateTime(r.created_at)}>
          {fmtRelative(r.created_at)}
          {r.handled_by && <span className="block">obsłużył(a): {displayName(r.handled_by)}</span>}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <span className="flex justify-end gap-1">
          {r.status === "PENDING" && (
            <Button size="xs" variant="secondary" onClick={() => setTarget({ item: r, action: "approve" })}>
              <Check /> Zatwierdź
            </Button>
          )}
          {(r.status === "PENDING" || r.status === "APPROVED") && (
            <>
              <Button size="xs" variant="success" onClick={() => setTarget({ item: r, action: "deliver" })}>
                <PackageCheck /> Wydaj
              </Button>
              <Button size="xs" variant="danger-soft" onClick={() => setTarget({ item: r, action: "reject" })}>
                <X /> Odrzuć
              </Button>
            </>
          )}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Nagrody i wymiany" description="Kolejka realizacji wymian oraz katalog nagród.">
        <Tabs
          value={tab}
          onValueChange={(v) => url.setMany({ tab: v === "queue" ? null : v, status: null })}
          items={[
            { value: "queue", label: "Kolejka wymian", icon: <PackageCheck />, count: stats.data?.pending_redemptions || undefined },
            { value: "catalog", label: "Katalog", icon: <Gift />, count: stats.data?.active_rewards },
          ]}
        />
      </PageHeader>

      {tab === "queue" ? (
        <>
          <Tabs
            variant="pills"
            size="sm"
            value={status}
            onValueChange={(v) => url.set("status", v === "PENDING,APPROVED" ? null : v)}
            items={STATUS_FILTERS}
            className="mb-3 max-w-full overflow-x-auto"
          />
          {queue.isError ? (
            <ErrorState description={errorText(queue.error)} onRetry={() => queue.refetch()} />
          ) : (
            <DataTable
              columns={queueColumns}
              data={queue.data?.results}
              loading={queue.isLoading}
              rowKey={(r) => r.id}
              pagination={{
                page,
                pageSize: 25,
                total: queue.data?.count ?? 0,
                onPageChange: (p) => url.setMany({ page: p }, { resetPage: false }),
              }}
              empty={<EmptyState size="sm" icon={<PackageCheck />} title="Brak wymian w tym widoku" />}
            />
          )}
          <ActionDialog target={target} onClose={() => setTarget(null)} />
        </>
      ) : (
        <ResourceManager<RewardRow>
          resource="rewards"
          fields={rewardFields}
          columns={rewardColumns}
          searchKeys={["name", "description"]}
          addLabel="Nowa nagroda"
          titleNew="Nowa nagroda"
          titleEdit={(r) => `Nagroda: ${r.name}`}
          deleteDescription="Nagrody z historią wymian nie można usunąć - ukryj ją (odznacz „Aktywna”)."
          defaultSort={{ key: "cost_points", dir: "asc" }}
        />
      )}
    </div>
  );
}

export default function AdminRewardsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <RewardsAdminContent />
    </Suspense>
  );
}
