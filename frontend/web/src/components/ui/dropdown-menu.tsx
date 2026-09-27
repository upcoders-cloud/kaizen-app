"use client";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover } from "./popover";
import type { Align, Side } from "./overlay";

export type DropdownItem =
  | {
      type?: "item";
      label: React.ReactNode;
      icon?: React.ReactNode;
      onSelect?: () => void;
      href?: string;
      shortcut?: string;
      danger?: boolean;
      disabled?: boolean;
      checked?: boolean;
      description?: React.ReactNode;
    }
  | { type: "separator" }
  | { type: "label"; label: React.ReactNode };

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  /** Dowolna treść nad pozycjami (np. dane użytkownika). */
  header?: React.ReactNode;
  side?: Side;
  align?: Align;
  className?: string;
}

function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'),
  );
  const idx = items.indexOf(document.activeElement as HTMLElement);
  if (e.key === "ArrowDown") {
    e.preventDefault();
    items[(idx + 1) % items.length]?.focus();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    items[(idx - 1 + items.length) % items.length]?.focus();
  } else if (e.key === "Home") {
    e.preventDefault();
    items[0]?.focus();
  } else if (e.key === "End") {
    e.preventDefault();
    items[items.length - 1]?.focus();
  }
}

const itemClass =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground outline-none transition-colors hover:bg-accent focus-visible:bg-accent aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted";

export function DropdownMenu({
  trigger,
  items,
  header,
  side = "bottom",
  align = "end",
  className,
}: DropdownMenuProps) {
  return (
    <Popover trigger={trigger} side={side} align={align} role="menu" className={cn("w-56", className)}>
      {(close) => (
        <div onKeyDown={onMenuKeyDown}>
          {header && (
            <>
              <div className="px-2 py-1.5">{header}</div>
              <div className="-mx-1 my-1 h-px bg-border" />
            </>
          )}
          {items.map((item, i) => {
            if (item.type === "separator")
              return <div key={i} className="-mx-1 my-1 h-px bg-border" />;
            if (item.type === "label")
              return (
                <div key={i} className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-subtle">
                  {item.label}
                </div>
              );
            const content = (
              <>
                {item.checked !== undefined ? (
                  <Check className={cn(!item.checked && "invisible")} />
                ) : (
                  item.icon
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.label}</span>
                  {item.description && (
                    <span className="block truncate text-xs text-muted">{item.description}</span>
                  )}
                </span>
                {item.shortcut && (
                  <kbd className="font-mono text-[10px] text-subtle">{item.shortcut}</kbd>
                )}
              </>
            );
            const cls = cn(
              itemClass,
              item.danger && "text-danger hover:bg-danger-soft focus-visible:bg-danger-soft [&_svg]:text-danger",
            );
            if (item.href) {
              return (
                <Link
                  key={i}
                  href={item.href}
                  role="menuitem"
                  aria-disabled={item.disabled || undefined}
                  className={cls}
                  onClick={() => close()}
                >
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={i}
                type="button"
                role="menuitem"
                aria-disabled={item.disabled || undefined}
                className={cls}
                onClick={() => {
                  close();
                  item.onSelect?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}
