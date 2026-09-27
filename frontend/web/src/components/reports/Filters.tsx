"use client";
import { useMemo } from "react";
import { CalendarRange, X } from "lucide-react";
import type { AnalyticsFilters } from "@/lib/analytics";
import { useCategories as useCategoryDict, useDepartmentOptions } from "@/lib/ideas";
import { cn, fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Popover } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { STATUS_META, type PostStatus } from "@/components/ui/badge";
import { useUrlState } from "@/components/ui/use-url-state";

export type PeriodPreset = "30d" | "90d" | "12m" | "ytd" | "all" | "custom";

export const PERIOD_ITEMS: { value: PeriodPreset; label: string }[] = [
  { value: "30d", label: "30 dni" },
  { value: "90d", label: "90 dni" },
  { value: "12m", label: "12 mies." },
  { value: "ytd", label: "Ten rok" },
  { value: "all", label: "Całość" },
];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function periodRange(preset: PeriodPreset, from?: string, to?: string): { date_from?: string; date_to?: string } {
  const now = new Date();
  const start = new Date(now);
  switch (preset) {
    case "30d":
      start.setDate(start.getDate() - 30);
      return { date_from: iso(start), date_to: iso(now) };
    case "90d":
      start.setDate(start.getDate() - 90);
      return { date_from: iso(start), date_to: iso(now) };
    case "12m":
      start.setFullYear(start.getFullYear() - 1);
      return { date_from: iso(start), date_to: iso(now) };
    case "ytd":
      return { date_from: `${now.getFullYear()}-01-01`, date_to: iso(now) };
    case "custom":
      return { date_from: from || undefined, date_to: to || undefined };
    default:
      return {};
  }
}

export const STATUS_OPTIONS = (Object.keys(STATUS_META) as PostStatus[]).map((s) => ({
  value: s,
  label: STATUS_META[s].label,
}));

/**
 * Filtry analityki w URL: `period`, `from`, `to`, `department`, `category`, `status`.
 * Zwraca gotowe `AnalyticsFilters` dla hooków z `@/lib/analytics`.
 */
export function useAnalyticsFilters(defaultPeriod: PeriodPreset = "12m") {
  const url = useUrlState();
  const period = (url.get("period") as PeriodPreset) || defaultPeriod;
  const from = url.get("from");
  const to = url.get("to");
  const department = url.get("department");
  const category = url.get("category");
  const status = url.get("status");

  const filters = useMemo<AnalyticsFilters>(
    () => ({
      ...periodRange(period, from, to),
      department: department || undefined,
      category: category || undefined,
      status: status || undefined,
    }),
    [period, from, to, department, category, status],
  );

  return { filters, period, from, to, department, category, status, url, defaultPeriod };
}

export function AnalyticsFilterBar({
  state,
  showDepartment = true,
  showCategory = false,
  showStatus = false,
  className,
}: {
  state: ReturnType<typeof useAnalyticsFilters>;
  showDepartment?: boolean;
  showCategory?: boolean;
  showStatus?: boolean;
  className?: string;
}) {
  const { period, from, to, department, category, status, url, defaultPeriod } = state;
  const departments = useDepartmentOptions(true);
  const categories = useCategoryDict();
  const dirty =
    period !== defaultPeriod || !!department || !!category || !!status;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Tabs
        variant="pills"
        size="sm"
        value={period === "custom" ? ("custom" as PeriodPreset) : period}
        onValueChange={(v) => url.setMany({ period: v === defaultPeriod ? null : v, from: null, to: null })}
        items={PERIOD_ITEMS}
      />
      <Popover
        align="start"
        className="w-72 p-3"
        trigger={
          <Button variant={period === "custom" ? "soft" : "secondary"} size="sm">
            <CalendarRange />
            {period === "custom" && (from || to)
              ? `${from ? fmtDate(from) : "..."} - ${to ? fmtDate(to) : "dziś"}`
              : "Zakres"}
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Od">
            <Input
              type="date"
              inputSize="sm"
              value={from}
              onChange={(e) => url.setMany({ period: "custom", from: e.target.value })}
            />
          </Field>
          <Field label="Do">
            <Input
              type="date"
              inputSize="sm"
              value={to}
              onChange={(e) => url.setMany({ period: "custom", to: e.target.value })}
            />
          </Field>
        </div>
      </Popover>
      {showDepartment && (
        <Select
          selectSize="sm"
          aria-label="Dział"
          value={department}
          onValueChange={(v) => url.set("department", v)}
          placeholder="Wszystkie działy"
          options={(departments.data ?? []).map((d) => ({ value: String(d.id), label: d.name }))}
          className="w-44"
        />
      )}
      {showCategory && (
        <Select
          selectSize="sm"
          aria-label="Kategoria"
          value={category}
          onValueChange={(v) => url.set("category", v)}
          placeholder="Wszystkie kategorie"
          options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
          className="w-44"
        />
      )}
      {showStatus && (
        <Select
          selectSize="sm"
          aria-label="Status"
          value={status}
          onValueChange={(v) => url.set("status", v)}
          placeholder="Wszystkie statusy"
          options={STATUS_OPTIONS}
          className="w-40"
        />
      )}
      {dirty && (
        <Button variant="ghost" size="sm" onClick={() => url.clear()}>
          <X /> Wyczyść
        </Button>
      )}
    </div>
  );
}
