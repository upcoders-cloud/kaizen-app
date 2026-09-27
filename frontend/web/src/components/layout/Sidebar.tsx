"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { hasLevel } from "@/lib/roles";
import { useApprovalsCount, useUnreadCount } from "@/lib/ideas";
import { Tooltip } from "@/components/ui/tooltip";
import { buttonVariants } from "@/components/ui/button";
import { BRAND, NAV_GROUPS, type NavItem } from "./nav";

export interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Wywoływane po kliknięciu linku (zamyka drawer na mobile). */
  onNavigate?: () => void;
  className?: string;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function CountPill({ value, collapsed }: { value?: number; collapsed?: boolean }) {
  if (!value) return null;
  const text = value > 99 ? "99+" : String(value);
  if (collapsed)
    return <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-surface" />;
  return (
    <span className="ml-auto rounded-full bg-primary-soft px-1.5 text-[10px] font-semibold leading-4 text-primary tabular">
      {text}
    </span>
  );
}

export function Sidebar({ collapsed = false, onToggleCollapsed, onNavigate, className }: SidebarProps) {
  const pathname = usePathname();
  const { user, isApprover } = useAuth();
  const approvals = useApprovalsCount(isApprover);
  const unread = useUnreadCount();
  const counts: Record<NonNullable<NavItem["badge"]>, number | undefined> = {
    approvals: approvals.data,
    notifications: unread.data,
  };
  const Brand = BRAND.icon;

  const groups = NAV_GROUPS.filter((g) => hasLevel(user, g.level))
    .map((g) => ({ ...g, items: g.items.filter((i) => hasLevel(user, i.level)) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn(
        "no-print flex h-full flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out",
        collapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-[var(--topbar-height)] shrink-0 items-center gap-2 border-b border-border",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <Link href="/feed" onClick={onNavigate} className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-fg shadow-xs">
            <Brand className="size-4" />
          </span>
          {!collapsed && (
            <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">{BRAND.name}</span>
          )}
        </Link>
      </div>

      <div className={cn("shrink-0 pt-3", collapsed ? "px-2" : "px-3")}>
        {collapsed ? (
          <Tooltip content="Nowy pomysł" side="right" triggerClassName="flex w-full">
            <Link
              href="/ideas/new"
              onClick={onNavigate}
              aria-label="Nowy pomysł"
              className={cn(buttonVariants({ size: "md" }), "w-full px-0")}
            >
              <Plus />
            </Link>
          </Tooltip>
        ) : (
          <Link
            href="/ideas/new"
            onClick={onNavigate}
            className={cn(buttonVariants({ size: "md" }), "w-full justify-start")}
          >
            <Plus /> Nowy pomysł
          </Link>
        )}
      </div>

      <nav className={cn("flex-1 overflow-y-auto pb-4 scrollbar-none", collapsed ? "px-2" : "px-3")}>
        {groups.map((group) => (
          <div key={group.id} className="mt-4">
            {collapsed ? (
              <div className="mx-auto mb-1 h-px w-6 bg-border" />
            ) : (
              <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-subtle">
                {group.label}
              </div>
            )}
            <ul className="flex flex-col gap-px">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                const count = item.badge ? counts[item.badge] : undefined;
                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-8 items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors",
                      collapsed ? "w-full justify-center" : "px-2",
                      active ? "text-foreground" : "text-muted hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        className="absolute inset-0 rounded-md bg-accent"
                      />
                    )}
                    <Icon
                      className={cn(
                        "relative size-4 shrink-0",
                        active ? "text-primary" : "text-subtle group-hover:text-muted",
                      )}
                    />
                    {!collapsed && <span className="relative truncate">{item.label}</span>}
                    <span className={cn(!collapsed && "relative ml-auto")}>
                      <CountPill value={count} collapsed={collapsed} />
                    </span>
                  </Link>
                );
                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip content={item.label} side="right" triggerClassName="flex w-full">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {onToggleCollapsed && (
        <div className={cn("shrink-0 border-t border-border p-2", collapsed && "flex justify-center")}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-muted transition-colors hover:bg-accent hover:text-foreground",
              !collapsed && "w-full",
            )}
            aria-label={collapsed ? "Rozwiń panel" : "Zwiń panel"}
            title={collapsed ? "Rozwiń panel ([)" : "Zwiń panel ([)"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && "Zwiń panel"}
          </button>
        </div>
      )}
    </aside>
  );
}
