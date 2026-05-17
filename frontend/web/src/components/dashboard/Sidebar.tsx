"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  FileBarChart,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Przegląd", icon: LayoutDashboard, mgmt: true },
  { href: "/departments", label: "Działy", icon: Building2, mgmt: true },
  { href: "/reports", label: "Raporty", icon: FileBarChart, mgmt: true },
  { href: "/impact", label: "Mój wkład", icon: TrendingUp, mgmt: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isManagement } = useAuth();

  return (
    <aside className="no-print hidden w-60 shrink-0 flex-col border-r bg-surface lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
          <Sparkles size={16} />
        </div>
        <span className="text-base font-bold text-foreground">Kaizen</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.filter((n) => !n.mgmt || isManagement).map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-fg"
                  : "text-muted hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-xs text-muted">
        © {new Date().getFullYear()} Kaizen · Upcoders
      </div>
    </aside>
  );
}
