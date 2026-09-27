"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/button";
import { Kbd } from "@/components/ui/misc";
import { NotificationsBell } from "./NotificationsBell";
import { ThemeToggle, UserMenu } from "./UserMenu";
import { breadcrumbFor } from "./nav";

export interface TopbarProps {
  onOpenPalette: () => void;
  onOpenMobileNav: () => void;
}

export function Topbar({ onOpenPalette, onOpenMobileNav }: TopbarProps) {
  const pathname = usePathname();
  const crumbs = breadcrumbFor(pathname);

  return (
    <header className="no-print sticky top-0 z-30 flex h-[var(--topbar-height)] shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-surface/70 lg:px-6">
      <IconButton label="Menu" size="lg" className="lg:hidden" onClick={onOpenMobileNav}>
        <Menu />
      </IconButton>

      <nav aria-label="Ścieżka" className="flex min-w-0 items-center gap-1 text-[13px]">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={i} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-subtle" />}
              {c.href && !last ? (
                <Link href={c.href} className="truncate text-muted transition-colors hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className={cn("truncate", last ? "font-medium text-foreground" : "text-muted")}>
                  {c.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenPalette}
          className="mr-1 hidden h-8 w-64 items-center gap-2 rounded-md border border-border bg-surface-muted px-2.5 text-[13px] text-subtle shadow-xs transition-colors hover:border-border-strong hover:text-muted md:flex"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Szukaj...</span>
          <Kbd>Ctrl K</Kbd>
        </button>
        <IconButton label="Szukaj (Ctrl K)" size="lg" className="md:hidden" onClick={onOpenPalette}>
          <Search />
        </IconButton>
        <ThemeToggle />
        <NotificationsBell />
        <div className="ml-1">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
