"use client";
import { Suspense, useState } from "react";
import { motion } from "framer-motion";
import { Award, Coins, Flame, Gift, History, PackageCheck, Sparkles } from "lucide-react";
import {
  REDEMPTION_STATUS,
  useBadges,
  useGamificationMe,
  useRedeem,
  useRedemptions,
  useRewards,
  useTransactions,
  type Redemption,
  type Reward,
  type Transaction,
} from "@/lib/gamification";
import { cn, fmtDateTime, fmtNum, fmtRelative, plural } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/table";
import { Progress } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { useUrlState } from "@/components/ui/use-url-state";
import { errorText } from "@/components/admin/Feedback";
import { renderIcon } from "@/components/gamification/icons";
import { BadgeGrid } from "@/components/gamification/BadgeGrid";

type Tab = "catalog" | "redemptions" | "history" | "badges";

const redemptionColumns: Column<Redemption>[] = [
  {
    key: "reward",
    header: "Nagroda",
    cell: (r) => {
      return (
        <span className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-secondary-soft text-secondary-fg dark:text-secondary">
            {renderIcon(r.reward.icon, "size-3.5")}
          </span>
          <span className="font-medium">{r.reward.name}</span>
        </span>
      );
    },
  },
  { key: "points_spent", header: "Punkty", align: "right", cell: (r) => <span className="tabular">{fmtNum(r.points_spent)}</span> },
  {
    key: "status",
    header: "Status",
    cell: (r) => {
      const s = REDEMPTION_STATUS[r.status];
      return (
        <Badge tone={s?.tone ?? "neutral"} dot>
          {s?.label ?? r.status}
        </Badge>
      );
    },
  },
  { key: "note", header: "Notatka", className: "hidden md:table-cell", cell: (r) => <span className="text-muted">{r.note || "-"}</span> },
  {
    key: "created_at",
    header: "Data",
    align: "right",
    cell: (r) => (
      <span className="text-xs text-muted" title={fmtDateTime(r.created_at)}>
        {fmtRelative(r.created_at)}
      </span>
    ),
  },
];

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
    header: "Data",
    align: "right",
    cell: (t) => (
      <span className="text-xs text-muted" title={fmtDateTime(t.created_at)}>
        {fmtRelative(t.created_at)}
      </span>
    ),
  },
];

function RewardCard({ reward, balance, onRedeem, index }: { reward: Reward; balance: number; onRedeem: () => void; index: number }) {
  const soldOut = reward.stock === 0;
  const missing = Math.max(0, reward.cost_points - balance);
  const affordable = missing === 0 && !soldOut;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.03 }}
      className={cn(
        "group flex flex-col rounded-lg border border-border bg-surface p-4 shadow-card transition-[border-color,box-shadow]",
        affordable && "hover:border-border-strong hover:shadow-pop",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-lg transition-transform duration-300",
            affordable ? "bg-secondary-soft text-secondary-fg group-hover:scale-105 dark:text-secondary" : "bg-accent text-subtle",
          )}
        >
          {renderIcon(reward.icon, "size-5")}
        </span>
        {soldOut ? (
          <Badge tone="danger">Wyczerpana</Badge>
        ) : reward.stock !== null ? (
          <Badge tone={reward.stock <= 3 ? "warning" : "neutral"}>Zostało {reward.stock}</Badge>
        ) : null}
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{reward.name}</p>
      <p className="mt-1 line-clamp-2 flex-1 text-[13px] text-muted">{reward.description}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-lg font-semibold tabular text-foreground">{fmtNum(reward.cost_points)}</span>
        <span className="text-xs text-muted">pkt</span>
      </div>
      {!affordable && !soldOut && (
        <div className="mt-2">
          <Progress value={(balance / reward.cost_points) * 100} size="sm" tone="secondary" />
          <p className="mt-1 text-[11px] text-subtle tabular">Brakuje {fmtNum(missing)} pkt</p>
        </div>
      )}
      <Button size="sm" className="mt-3 w-full" variant={affordable ? "primary" : "secondary"} disabled={!affordable} onClick={onRedeem}>
        <Gift /> {soldOut ? "Niedostępna" : "Wymień"}
      </Button>
    </motion.div>
  );
}

function RewardsContent() {
  const url = useUrlState();
  const tab = (url.get("tab") as Tab) || "catalog";
  const me = useGamificationMe();
  const rewards = useRewards();
  const redemptions = useRedemptions();
  const transactions = useTransactions();
  const badges = useBadges();
  const redeem = useRedeem();
  const [selected, setSelected] = useState<Reward | null>(null);

  const balance = me.data?.points ?? 0;
  const g = me.data;
  const levelPct = Math.round((g?.level_progress ?? 0) * 100);
  const earnedBadges = badges.data?.filter((b) => b.earned).length ?? 0;
  const pendingCount = redemptions.data?.filter((r) => r.status === "PENDING" || r.status === "APPROVED").length ?? 0;

  const confirm = () => {
    if (!selected) return;
    redeem.mutate(selected.id, {
      onSuccess: () => {
        toast.success("Wymiana złożona", `${selected.name} - administrator potwierdzi odbiór.`);
        setSelected(null);
        url.set("tab", "redemptions");
      },
      onError: (err) => toast.error("Nie udało się wymienić punktów", errorText(err)),
    });
  };

  return (
    <div>
      <PageHeader title="Nagrody" description="Wymieniaj punkty za aktywność na nagrody.">
        {/* saldo */}
        <Card className="relative overflow-hidden p-5">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-secondary-soft blur-3xl" />
          <div className="relative grid gap-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <Coins className="size-3.5" /> Saldo punktów
              </p>
              {me.isLoading ? (
                <Skeleton className="mt-1 h-9 w-28" />
              ) : (
                <p className="text-4xl font-semibold tracking-tight tabular text-foreground">{fmtNum(balance)}</p>
              )}
            </div>
            <div className="min-w-0 sm:border-l sm:border-border sm:pl-5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Sparkles className="size-4 text-secondary" /> {g?.level?.name ?? "Brak poziomu"}
                </span>
                {g?.next_level && (
                  <span className="text-xs text-muted tabular">
                    {fmtNum(g.points_to_next)} pkt do {g.next_level.name}
                  </span>
                )}
              </div>
              <Progress value={g?.next_level ? levelPct : 100} tone="secondary" className="mt-2" />
            </div>
            <div className="flex gap-4 text-[13px] sm:border-l sm:border-border sm:pl-5">
              <div>
                <p className="flex items-center gap-1 text-xs text-muted">
                  <Flame className="size-3.5 text-warning" /> Seria
                </p>
                <p className="font-semibold tabular text-foreground">
                  {g?.current_streak ?? 0} {plural(g?.current_streak ?? 0, "dzień", "dni", "dni")}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-muted">
                  <Award className="size-3.5 text-violet" /> Odznaki
                </p>
                <p className="font-semibold tabular text-foreground">
                  {earnedBadges}/{badges.data?.length ?? 0}
                </p>
              </div>
            </div>
          </div>
        </Card>
        <Tabs
          value={tab}
          onValueChange={(v) => url.set("tab", v === "catalog" ? null : v)}
          items={[
            { value: "catalog", label: "Katalog", icon: <Gift />, count: rewards.data?.length },
            { value: "redemptions", label: "Moje wymiany", icon: <PackageCheck />, count: pendingCount || undefined },
            { value: "history", label: "Historia punktów", icon: <History /> },
            { value: "badges", label: "Odznaki", icon: <Award /> },
          ]}
        />
      </PageHeader>

      {tab === "catalog" &&
        (rewards.isError ? (
          <ErrorState description={errorText(rewards.error)} onRetry={() => rewards.refetch()} />
        ) : rewards.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-60" />
            ))}
          </div>
        ) : !rewards.data?.length ? (
          <EmptyState variant="card" icon={<Gift />} title="Katalog jest pusty" description="Administrator jeszcze nie dodał nagród." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[...rewards.data]
              .sort((a, b) => a.cost_points - b.cost_points)
              .map((r, i) => (
                <RewardCard key={r.id} reward={r} balance={balance} index={i} onRedeem={() => setSelected(r)} />
              ))}
          </div>
        ))}

      {tab === "redemptions" && (
        <DataTable
          columns={redemptionColumns}
          data={redemptions.data}
          loading={redemptions.isLoading}
          rowKey={(r) => r.id}
          pageSize={20}
          empty={<EmptyState size="sm" icon={<PackageCheck />} title="Nie masz jeszcze wymian" />}
        />
      )}

      {tab === "history" && (
        <DataTable
          columns={transactionColumns}
          data={transactions.data}
          loading={transactions.isLoading}
          rowKey={(t) => t.id}
          pageSize={20}
          dense
          empty={<EmptyState size="sm" icon={<History />} title="Brak transakcji punktowych" />}
        />
      )}

      {tab === "badges" &&
        (badges.isLoading ? (
          <Skeleton className="h-64" />
        ) : badges.isError ? (
          <ErrorState description={errorText(badges.error)} onRetry={() => badges.refetch()} />
        ) : (
          <BadgeGrid badges={badges.data ?? []} />
        ))}

      <ConfirmDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={`Wymienić punkty na „${selected?.name ?? ""}”?`}
        description="Wymianę zatwierdza administrator. Jeśli zostanie odrzucona, punkty wrócą na konto."
        confirmLabel="Wymień"
        loading={redeem.isPending}
        onConfirm={confirm}
      >
        {selected && (
          <dl className="grid grid-cols-2 gap-y-1.5 rounded-md bg-surface-muted p-3 text-[13px]">
            <dt className="text-muted">Saldo teraz</dt>
            <dd className="text-right tabular text-foreground">{fmtNum(balance)} pkt</dd>
            <dt className="text-muted">Koszt</dt>
            <dd className="text-right tabular text-danger">-{fmtNum(selected.cost_points)} pkt</dd>
            <dt className="font-medium text-foreground">Po wymianie</dt>
            <dd className="text-right font-semibold tabular text-foreground">{fmtNum(balance - selected.cost_points)} pkt</dd>
          </dl>
        )}
      </ConfirmDialog>
    </div>
  );
}

export default function RewardsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <RewardsContent />
    </Suspense>
  );
}
