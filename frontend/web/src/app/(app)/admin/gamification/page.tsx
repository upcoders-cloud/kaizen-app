"use client";
import { Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Award, Coins, Layers3 } from "lucide-react";
import { updatePointRule, useAdminList, type AdminBadge, type Level, type PointRule } from "@/lib/admin";
import { fmtNum } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/table";
import { Sheet } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { useUrlState } from "@/components/ui/use-url-state";
import { ActiveBadge, errorText } from "@/components/admin/Feedback";
import { ResourceManager, type FieldConfig } from "@/components/admin/ResourceManager";
import { TIER_META, renderIcon } from "@/components/gamification/icons";

type Tab = "rules" | "badges" | "levels";

const CRITERIA = [
  { value: "POST_COUNT", label: "Liczba pomysłów" },
  { value: "LIKES_RECEIVED", label: "Otrzymane polubienia" },
  { value: "IMPLEMENTED_COUNT", label: "Wdrożone pomysły" },
  { value: "REVIEW_COUNT", label: "Oceny pomysłów" },
  { value: "STREAK", label: "Seria aktywności (dni)" },
  { value: "POINTS", label: "Punkty" },
  { value: "COMMENT_COUNT", label: "Komentarze" },
];
const criteriaLabel = (v: string) => CRITERIA.find((c) => c.value === v)?.label ?? v;

const TIERS = [
  { value: "BRONZE", label: "Brąz" },
  { value: "SILVER", label: "Srebro" },
  { value: "GOLD", label: "Złoto" },
];

const badgeFields: FieldConfig[] = [
  { key: "name", label: "Nazwa", required: true },
  { key: "code", label: "Kod (slug)", required: true, placeholder: "np. first-idea", hint: "Unikalny, bez spacji." },
  { key: "description", label: "Opis", type: "textarea", placeholder: "Za co przyznawana?" },
  { key: "criteria_type", label: "Kryterium", options: CRITERIA, required: true, defaultValue: "POST_COUNT" },
  { key: "threshold", label: "Próg", type: "number", required: true, defaultValue: 1 },
  { key: "tier", label: "Poziom odznaki", options: TIERS, required: true, defaultValue: "BRONZE" },
  { key: "icon", label: "Ikona", placeholder: "np. trophy, star, zap", defaultValue: "award" },
  { key: "order", label: "Kolejność", type: "number", defaultValue: 0 },
  { key: "is_active", label: "Aktywna", type: "checkbox", defaultValue: true },
];

const levelFields: FieldConfig[] = [
  { key: "name", label: "Nazwa", required: true },
  { key: "min_points", label: "Punkty minimum", type: "number", required: true, defaultValue: 0 },
  { key: "order", label: "Kolejność", type: "number", required: true, defaultValue: 1 },
  { key: "icon", label: "Ikona", placeholder: "np. star" },
  { key: "color", label: "Kolor", placeholder: "#6366f1", hint: "Kolor w aplikacji mobilnej (hex)." },
];

type BadgeRow = AdminBadge & Record<string, unknown>;
type LevelRow = Level & Record<string, unknown>;

const badgeColumns: Column<BadgeRow>[] = [
  {
    key: "name",
    header: "Odznaka",
    sortable: true,
    cell: (b) => (
      <span className="flex items-center gap-2.5">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${TIER_META[b.tier]?.className ?? "bg-accent"}`}>
          {renderIcon(b.icon, "size-4")}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{b.name}</span>
          <span className="block truncate text-xs text-muted">{b.description}</span>
        </span>
      </span>
    ),
  },
  {
    key: "criteria_type",
    header: "Kryterium",
    className: "hidden md:table-cell",
    cell: (b) => (
      <span className="text-muted">
        {criteriaLabel(b.criteria_type)} ≥ <span className="tabular text-foreground">{fmtNum(b.threshold)}</span>
      </span>
    ),
  },
  { key: "tier", header: "Poziom", className: "hidden sm:table-cell", cell: (b) => TIER_META[b.tier]?.label ?? b.tier },
  { key: "awarded_count", header: "Przyznano", sortable: true, align: "right", cell: (b) => <span className="tabular">{fmtNum(b.awarded_count)}</span> },
  { key: "is_active", header: "Status", cell: (b) => <ActiveBadge active={b.is_active} on="Aktywna" off="Nieaktywna" /> },
];

const levelColumns: Column<LevelRow>[] = [
  { key: "order", header: "#", sortable: true, className: "w-12", cell: (l) => <span className="tabular text-muted">{l.order}</span> },
  {
    key: "name",
    header: "Poziom",
    sortable: true,
    cell: (l) => (
      <span className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-secondary-soft text-secondary-fg dark:text-secondary">
          {renderIcon(l.icon, "size-3.5")}
        </span>
        <span className="font-medium">{l.name}</span>
      </span>
    ),
  },
  { key: "min_points", header: "Od punktów", sortable: true, align: "right", cell: (l) => <span className="tabular">{fmtNum(l.min_points)}</span> },
];

function RuleSheet({ rule, onClose }: { rule: PointRule | null; onClose: () => void }) {
  return (
    <Sheet open={!!rule} onOpenChange={(o) => !o && onClose()} title={rule?.action_display} description={rule?.action} width="max-w-md">
      {rule && <RuleForm key={rule.id} rule={rule} close={onClose} />}
    </Sheet>
  );
}

function RuleForm({ rule, close }: { rule: PointRule; close: () => void }) {
  const qc = useQueryClient();
  const [points, setPoints] = useState(String(rule.points));
  const [cap, setCap] = useState(rule.daily_cap === null ? "" : String(rule.daily_cap));
  const [active, setActive] = useState(rule.is_active);
  const [description, setDescription] = useState(rule.description ?? "");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (points.trim() === "" || Number.isNaN(Number(points))) {
      toast.error("Podaj liczbę punktów");
      return;
    }
    setSaving(true);
    try {
      await updatePointRule(rule.id, {
        points: Number(points),
        daily_cap: cap === "" ? null : Number(cap),
        is_active: active,
        description,
      });
      await qc.invalidateQueries({ queryKey: ["admin", "point-rules"] });
      toast.success("Zapisano regułę");
      close();
    } catch (err) {
      toast.error("Nie udało się zapisać", errorText(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Punkty" required hint="Ujemne odejmują punkty.">
          <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} data-autofocus />
        </Field>
        <Field label="Limit dzienny" hint="Puste = bez limitu.">
          <Input type="number" min={0} value={cap} onChange={(e) => setCap(e.target.value)} placeholder="Bez limitu" />
        </Field>
      </div>
      <Field label="Opis">
        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Switch label="Aktywna" description="Nieaktywna reguła nie nalicza punktów." checked={active} onCheckedChange={setActive} />
      <div className="-mx-5 mt-2 flex justify-end gap-2 border-t border-border px-5 pt-4">
        <Button variant="ghost" onClick={close} disabled={saving}>
          Anuluj
        </Button>
        <Button type="submit" loading={saving}>
          Zapisz
        </Button>
      </div>
    </form>
  );
}

function GamificationContent() {
  const url = useUrlState();
  const tab = (url.get("tab") as Tab) || "rules";
  const rules = useAdminList<PointRule>("point-rules", { page_size: 100 });
  const [editRule, setEditRule] = useState<PointRule | null>(null);

  const ruleColumns: Column<PointRule>[] = [
    {
      key: "action_display",
      header: "Akcja",
      sortable: true,
      cell: (r) => (
        <span>
          <span className="block font-medium">{r.action_display || r.action}</span>
          {r.description && <span className="block text-xs text-muted">{r.description}</span>}
        </span>
      ),
    },
    {
      key: "points",
      header: "Punkty",
      sortable: true,
      align: "right",
      cell: (r) => (
        <span className={`font-semibold tabular ${r.points >= 0 ? "text-success" : "text-danger"}`}>
          {r.points > 0 ? "+" : ""}
          {fmtNum(r.points)}
        </span>
      ),
    },
    {
      key: "daily_cap",
      header: "Limit dzienny",
      align: "right",
      className: "hidden sm:table-cell",
      cell: (r) => <span className="tabular text-muted">{r.daily_cap === null ? "bez limitu" : fmtNum(r.daily_cap)}</span>,
    },
    { key: "is_active", header: "Status", cell: (r) => <ActiveBadge active={r.is_active} on="Aktywna" off="Wyłączona" /> },
  ];

  return (
    <div>
      <PageHeader title="Punkty, odznaki i poziomy" description="Zasady programu motywacyjnego.">
        <Tabs
          value={tab}
          onValueChange={(v) => url.set("tab", v === "rules" ? null : v)}
          items={[
            { value: "rules", label: "Reguły punktowe", icon: <Coins />, count: rules.data?.count },
            { value: "badges", label: "Odznaki", icon: <Award /> },
            { value: "levels", label: "Poziomy", icon: <Layers3 /> },
          ]}
        />
      </PageHeader>

      {tab === "rules" &&
        (rules.isError ? (
          <ErrorState description={errorText(rules.error)} onRetry={() => rules.refetch()} />
        ) : (
          <>
            <DataTable
              columns={ruleColumns}
              data={rules.data?.results}
              loading={rules.isLoading}
              rowKey={(r) => r.id}
              onRowClick={setEditRule}
            />
            <p className="mt-2 text-xs text-subtle">Kliknij regułę, aby zmienić punkty, limit lub ją wyłączyć.</p>
            <RuleSheet rule={editRule} onClose={() => setEditRule(null)} />
          </>
        ))}

      {tab === "badges" && (
        <ResourceManager<BadgeRow>
          key="badges"
          resource="badges"
          fields={badgeFields}
          columns={badgeColumns}
          searchKeys={["name", "code", "description"]}
          addLabel="Nowa odznaka"
          titleNew="Nowa odznaka"
          titleEdit={(b) => `Odznaka: ${b.name}`}
          defaultSort={{ key: "name", dir: "asc" }}
        />
      )}

      {tab === "levels" && (
        <ResourceManager<LevelRow>
          key="levels"
          resource="levels"
          fields={levelFields}
          columns={levelColumns}
          addLabel="Nowy poziom"
          titleNew="Nowy poziom"
          titleEdit={(l) => `Poziom: ${l.name}`}
          defaultSort={{ key: "min_points", dir: "asc" }}
        />
      )}
    </div>
  );
}

export default function AdminGamificationPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <GamificationContent />
    </Suspense>
  );
}
