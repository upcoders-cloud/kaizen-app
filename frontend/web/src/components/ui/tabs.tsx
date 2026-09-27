"use client";
import { useId, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  items: TabItem<T>[];
  /** "underline" (domyślnie) - pod nagłówkiem strony; "pills" - segmentowany przełącznik. */
  variant?: "underline" | "pills";
  size?: "sm" | "md";
  className?: string;
}

/**
 * Kontrolowane zakładki. Zawartość renderujesz sam na podstawie `value`.
 * Obsługa klawiatury: strzałki lewo/prawo, Home, End.
 */
export function Tabs<T extends string>({
  value,
  onValueChange,
  items,
  variant = "underline",
  size = "md",
  className,
}: TabsProps<T>) {
  const layoutId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const enabled = items.filter((i) => !i.disabled);
    const idx = enabled.findIndex((i) => i.value === value);
    let next: TabItem<T> | undefined;
    if (e.key === "ArrowRight") next = enabled[(idx + 1) % enabled.length];
    if (e.key === "ArrowLeft") next = enabled[(idx - 1 + enabled.length) % enabled.length];
    if (e.key === "Home") next = enabled[0];
    if (e.key === "End") next = enabled[enabled.length - 1];
    if (next) {
      e.preventDefault();
      onValueChange(next.value);
      const el = listRef.current?.querySelector<HTMLButtonElement>(
        `[data-value="${next.value}"]`,
      );
      el?.focus();
    }
  };

  const pills = variant === "pills";

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn(
        "flex items-center",
        pills
          ? "inline-flex gap-0.5 rounded-md bg-accent p-0.5"
          : "gap-4 border-b border-border",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            data-value={item.value}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 [&_svg]:size-4",
              size === "sm" ? "text-xs" : "text-[13px]",
              pills
                ? cn("rounded-[5px] px-2.5", size === "sm" ? "h-6" : "h-7")
                : "-mb-px h-9 px-0.5",
              active ? "text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className={cn(
                  "absolute",
                  pills
                    ? "inset-0 rounded-[5px] bg-surface shadow-xs"
                    : "inset-x-0 -bottom-px h-0.5 rounded-full bg-primary",
                )}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {item.icon}
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] leading-4 tabular",
                    active ? "bg-primary-soft text-primary" : "bg-accent text-muted",
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
