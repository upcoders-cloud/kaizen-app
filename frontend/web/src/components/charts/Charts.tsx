"use client";
/**
 * Wykresy analityki (Recharts) na tokenach design systemu.
 * Zasady: stała kolejność kolorów kategorycznych (--chart-1..6), jedna oś Y, cienkie znaczniki,
 * stonowana siatka, tooltip z krzyżem/podświetleniem, legenda dla >= 2 serii.
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { useId } from "react";
import Link from "next/link";
import { cn, fmtNum } from "@/lib/utils";
import { STATUS_META, type PostStatus } from "@/components/ui/badge";

export const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

const AXIS_TICK = { fontSize: 11, fill: "var(--subtle)" };
const MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

/** "2026-03-01" / "2026-03" -> "mar 26"; "2026-Q1" zostaje. */
export function fmtPeriod(v: string | number, long = false) {
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (!m) return s;
  const month = MONTHS[Number(m[2]) - 1] ?? m[2];
  return long ? `${month} ${m[1]}` : `${month} ${m[1].slice(2)}`;
}

/* ------------------------------ tooltip + legenda ------------------------------ */

type Formatter = (v: number) => string;

function ChartTooltip({
  active,
  payload,
  label,
  format = fmtNum,
  labelFormat = (l) => String(l),
}: TooltipProps<number, string> & { format?: Formatter; labelFormat?: (l: string | number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-md border border-border bg-elevated px-3 py-2 text-xs shadow-pop">
      {label !== undefined && <p className="mb-1.5 font-medium text-foreground">{labelFormat(label)}</p>}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="flex-1 text-muted">{p.name}</span>
            <span className="font-medium tabular text-foreground">{format(Number(p.value ?? 0))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartLegend({ items, className }: { items: { label: string; color: string }[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted", className)}>
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ trend (linie/obszary) ------------------------------ */

export interface TrendSeries<T> {
  key: keyof T & string;
  label: string;
  /** Indeks koloru kategorycznego (stały dla encji, nie dla pozycji). */
  color?: number;
}

export function TrendChart<T extends { period: string }>({
  data,
  series,
  height = 260,
  format = fmtNum,
  area = true,
}: {
  data: T[];
  series: TrendSeries<T>[];
  height?: number;
  format?: Formatter;
  area?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const Chart = area ? AreaChart : LineChart;
  return (
    <div>
      {series.length > 1 && (
        <ChartLegend
          className="mb-3"
          items={series.map((s, i) => ({ label: s.label, color: SERIES[s.color ?? i] }))}
        />
      )}
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data} margin={{ left: -12, right: 8, top: 4, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`${id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES[s.color ?? i]} stopOpacity={0.18} />
                <stop offset="100%" stopColor={SERIES[s.color ?? i]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="period"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tickFormatter={(v) => fmtPeriod(v)}
            minTickGap={16}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={48}
            tickFormatter={(v) => format(Number(v))}
          />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
            content={<ChartTooltip format={format} labelFormat={(l) => fmtPeriod(l, true)} />}
          />
          {series.map((s, i) =>
            area ? (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={SERIES[s.color ?? i]}
                strokeWidth={2}
                fill={`url(#${id}-${s.key})`}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                dot={false}
              />
            ) : (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={SERIES[s.color ?? i]}
                strokeWidth={2}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                dot={false}
              />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------ słupki pionowe (1 seria) ------------------------------ */

export function ColumnChart<T extends { period: string }>({
  data,
  dataKey,
  label,
  height = 220,
  format = fmtNum,
  color = 0,
}: {
  data: T[];
  dataKey: keyof T & string;
  label: string;
  height?: number;
  format?: Formatter;
  color?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -12, right: 8, top: 4, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="period"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tickFormatter={(v) => fmtPeriod(v)}
          minTickGap={12}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v) => format(Number(v))}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)" }}
          content={<ChartTooltip format={format} labelFormat={(l) => fmtPeriod(l, true)} />}
        />
        <Bar dataKey={dataKey} name={label} fill={SERIES[color]} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------ słupki poziome (ranking) ------------------------------ */

export function HBar<T extends object>({
  data,
  dataKey,
  labelKey,
  label = "Wartość",
  format = fmtNum,
  color = 0,
  height,
}: {
  data: T[];
  dataKey: keyof T & string;
  labelKey: keyof T & string;
  label?: string;
  format?: Formatter;
  color?: number;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(160, data.length * 36)}>
      <BarChart
        data={data as unknown as object[]}
        layout="vertical"
        margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => format(Number(v))}
        />
        <YAxis
          type="category"
          dataKey={labelKey}
          tick={{ fontSize: 12, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={false}
          width={116}
        />
        <Tooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltip format={format} />} />
        <Bar dataKey={dataKey} name={label} fill={SERIES[color]} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------ sparkline ------------------------------ */

export function Sparkline({
  data,
  color = 0,
  height = 32,
}: {
  data: number[];
  color?: number;
  height?: number;
}) {
  const id = useId().replace(/:/g, "");
  if (data.length < 2) return <div style={{ height }} />;
  const rows = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES[color]} stopOpacity={0.22} />
            <stop offset="100%" stopColor={SERIES[color]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={SERIES[color]}
          strokeWidth={1.5}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------ rozkład statusów ------------------------------ */

const STATUS_ORDER: PostStatus[] = ["TO_VERIFY", "SUBMITTED", "IN_PROGRESS", "IMPLEMENTED", "CANCELLED"];

/**
 * Lejek statusów jako pasek segmentowy + lista (etykieta, liczba, udział).
 * Kolory statusów pochodzą z palety statusowej (STATUS_META), nie kategorycznej.
 */
export function StatusBreakdown({ data }: { data: Record<string, number> }) {
  const rows = STATUS_ORDER.map((s) => ({ status: s, value: Number(data[s] ?? 0) }));
  const total = rows.reduce((a, r) => a + r.value, 0);
  return (
    <div>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-accent" role="img" aria-label="Rozkład statusów">
        {rows
          .filter((r) => r.value > 0)
          .map((r) => (
            <div
              key={r.status}
              title={`${STATUS_META[r.status].label}: ${r.value}`}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(r.value / Math.max(1, total)) * 100}%`, background: STATUS_META[r.status].color }}
            />
          ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.map((r) => {
          const pct = total ? (r.value / total) * 100 : 0;
          return (
            <li key={r.status} className="flex items-center gap-2.5 text-[13px]">
              <span className="size-2 shrink-0 rounded-full" style={{ background: STATUS_META[r.status].color }} />
              <span className="flex-1 text-muted">{STATUS_META[r.status].label}</span>
              <span className="font-medium tabular text-foreground">{fmtNum(r.value)}</span>
              <span className="w-12 text-right text-xs tabular text-subtle">
                {pct.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------ lista z paskami ------------------------------ */

/** Lista "etykieta + pasek + wartość" (np. top działy) - czytelniejsza niż wykres przy < 10 pozycjach. */
export function BarList<T>({
  rows,
  label,
  value,
  format = fmtNum,
  href,
  color = 0,
  secondary,
}: {
  rows: T[];
  label: (r: T) => React.ReactNode;
  value: (r: T) => number;
  format?: Formatter;
  href?: (r: T) => string | undefined;
  color?: number;
  secondary?: (r: T) => React.ReactNode;
}) {
  const max = Math.max(1, ...rows.map(value));
  return (
    <ul className="space-y-1">
      {rows.map((r, i) => {
        const v = value(r);
        const link = href?.(r);
        const inner = (
          <>
            <div className="relative flex-1 overflow-hidden rounded-md">
              <div
                className="absolute inset-y-0 left-0 rounded-md opacity-15"
                style={{ width: `${(v / max) * 100}%`, background: SERIES[color] }}
              />
              <div className="relative flex items-center gap-2 px-2 py-1.5">
                <span className="truncate text-[13px] text-foreground">{label(r)}</span>
                {secondary && <span className="truncate text-xs text-subtle">{secondary(r)}</span>}
              </div>
            </div>
            <span className="w-24 shrink-0 text-right text-[13px] font-medium tabular text-foreground">{format(v)}</span>
          </>
        );
        return (
          <li key={i}>
            {link ? (
              <Link href={link} className="flex items-center gap-3 rounded-md transition-colors hover:bg-accent/60">
                {inner}
              </Link>
            ) : (
              <div className="flex items-center gap-3">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
