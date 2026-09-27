"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, fmtNum } from "@/lib/utils";
import { IconButton } from "./button";

export interface PaginationProps {
  /** Numer strony od 1. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Ukrywa licznik "1-20 z 134". */
  compact?: boolean;
}

function pageList(page: number, pages: number): (number | "...")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "...")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push("...");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pages - 1) out.push("...");
  out.push(pages);
  return out;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
  compact,
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className={cn("flex items-center justify-between gap-3 text-[13px]", className)}>
      {!compact ? (
        <span className="text-muted tabular">
          {fmtNum(from)}-{fmtNum(to)} z {fmtNum(total)}
        </span>
      ) : (
        <span />
      )}
      <nav aria-label="Paginacja" className="flex items-center gap-0.5">
        <IconButton
          label="Poprzednia strona"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
        </IconButton>
        {pageList(page, pages).map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="px-1 text-subtle">
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
              className={cn(
                "h-7 min-w-7 rounded-md px-1.5 text-[13px] tabular transition-colors",
                p === page
                  ? "bg-primary-soft font-semibold text-primary"
                  : "text-muted hover:bg-accent hover:text-foreground",
              )}
            >
              {p}
            </button>
          ),
        )}
        <IconButton
          label="Następna strona"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight />
        </IconButton>
      </nav>
    </div>
  );
}
