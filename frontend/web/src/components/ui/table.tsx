"use client";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { EmptyState } from "./empty-state";
import { Pagination } from "./pagination";
import { Checkbox } from "./checkbox";

/* -------------------- prymitywy (gdy potrzebujesz własnej tabeli) -------------------- */

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom border-collapse text-[13px]", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-surface-muted", className)} {...props} />;
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-border transition-colors hover:bg-surface-muted/60", className)}
      {...props}
    />
  );
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-9 whitespace-nowrap border-b border-border px-3 text-left text-xs font-medium text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2.5 align-middle text-foreground", className)} {...props} />;
}

/* ------------------------------------ DataTable ------------------------------------ */

export type SortDir = "asc" | "desc";
export interface SortState {
  key: string;
  dir: SortDir;
}

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Renderer komórki; domyślnie `row[key]`. */
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  /** Wartość do sortowania po stronie klienta; domyślnie `row[key]`. */
  sortValue?: (row: T) => string | number | null | undefined;
  align?: "left" | "right" | "center";
  /** Klasa dla th i td (np. "w-32", "hidden md:table-cell"). */
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  rowKey: (row: T) => string | number;
  loading?: boolean;
  /** Treść dla pustej listy. */
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Paginacja klienta: rozmiar strony (brak = wszystkie wiersze). */
  pageSize?: number;
  /** Paginacja serwerowa (nadpisuje pageSize). `data` to wtedy bieżąca strona. */
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void };
  /** Sortowanie kontrolowane (serwerowe). Bez tego sortuje lokalnie. */
  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  defaultSort?: SortState;
  /** Zaznaczanie wierszy. */
  selectedKeys?: (string | number)[];
  onSelectionChange?: (keys: (string | number)[]) => void;
  className?: string;
  dense?: boolean;
}

function compare(a: unknown, b: unknown) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && a !== "" && b !== "") return na - nb;
  return String(a).localeCompare(String(b), "pl");
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  empty,
  onRowClick,
  pageSize,
  pagination,
  sort: sortProp,
  onSortChange,
  defaultSort,
  selectedKeys,
  onSelectionChange,
  className,
  dense,
}: DataTableProps<T>) {
  const [localSort, setLocalSort] = useState<SortState | null>(defaultSort ?? null);
  const [localPage, setLocalPage] = useState(1);
  const controlledSort = onSortChange !== undefined;
  const sort = controlledSort ? (sortProp ?? null) : localSort;

  const toggleSort = (key: string) => {
    const next: SortState | null =
      sort?.key !== key
        ? { key, dir: "asc" }
        : sort.dir === "asc"
          ? { key, dir: "desc" }
          : null;
    if (controlledSort) onSortChange?.(next);
    else {
      setLocalSort(next);
      setLocalPage(1);
    }
  };

  const rows = useMemo(() => {
    const list = data ?? [];
    if (controlledSort || !sort) return list;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return list;
    const get =
      col.sortValue ?? ((r: T) => (r as Record<string, unknown>)[col.key] as string | number);
    const sorted = [...list].sort((a, b) => compare(get(a), get(b)));
    return sort.dir === "desc" ? sorted.reverse() : sorted;
  }, [data, sort, columns, controlledSort]);

  const clientPaged = !pagination && pageSize && rows.length > pageSize;
  const pageCount = clientPaged ? Math.ceil(rows.length / pageSize!) : 1;
  const safePage = Math.min(localPage, pageCount);
  const visible = clientPaged
    ? rows.slice((safePage - 1) * pageSize!, safePage * pageSize!)
    : rows;

  const selectable = !!onSelectionChange;
  const selected = new Set(selectedKeys ?? []);
  const visibleKeys = visible.map(rowKey);
  const allSelected = visibleKeys.length > 0 && visibleKeys.every((k) => selected.has(k));
  const someSelected = visibleKeys.some((k) => selected.has(k));

  const alignCls = (a?: string) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";
  const cellPad = dense ? "py-1.5" : "py-2.5";

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-surface shadow-card", className)}>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-surface-muted">
            <tr>
              {selectable && (
                <th className="w-10 border-b border-border px-3">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={!allSelected && someSelected}
                    onCheckedChange={(v) => {
                      const next = new Set(selected);
                      visibleKeys.forEach((k) => (v ? next.add(k) : next.delete(k)));
                      onSelectionChange?.([...next]);
                    }}
                  />
                </th>
              )}
              {columns.map((col) => {
                const active = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "h-9 whitespace-nowrap border-b border-border px-3 text-xs font-medium text-muted",
                      alignCls(col.align),
                      col.className,
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-accent hover:text-foreground",
                          active && "text-foreground",
                          col.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {col.header}
                        {active ? (
                          sort!.dir === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && !data?.length
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {selectable && <td className="px-3" />}
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-3", cellPad, c.className)}>
                        <Skeleton className="h-3.5 w-full max-w-32" />
                      </td>
                    ))}
                  </tr>
                ))
              : visible.map((row, i) => {
                  const key = rowKey(row);
                  const isSel = selected.has(key);
                  return (
                    <tr
                      key={key}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      data-selected={isSel || undefined}
                      className={cn(
                        "border-b border-border transition-colors last:border-0 hover:bg-surface-muted/70 data-[selected]:bg-primary-soft/50",
                        onRowClick && "cursor-pointer",
                      )}
                    >
                      {selectable && (
                        <td className="px-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSel}
                            onCheckedChange={(v) => {
                              const next = new Set(selected);
                              if (v) next.add(key);
                              else next.delete(key);
                              onSelectionChange?.([...next]);
                            }}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn("px-3 text-foreground", cellPad, alignCls(col.align), col.className)}
                        >
                          {col.cell
                            ? col.cell(row, i)
                            : String((row as Record<string, unknown>)[col.key] ?? "-")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && (
        <div className="border-t border-border">
          {empty ?? <EmptyState size="sm" title="Brak danych" description="Zmień filtry, aby zobaczyć wyniki." />}
        </div>
      )}
      {pagination && pagination.total > pagination.pageSize && (
        <div className="border-t border-border px-3 py-2">
          <Pagination {...pagination} />
        </div>
      )}
      {clientPaged && (
        <div className="border-t border-border px-3 py-2">
          <Pagination page={safePage} pageSize={pageSize!} total={rows.length} onPageChange={setLocalPage} />
        </div>
      )}
    </div>
  );
}
