"use client";
import { Gift, LogOut, Monitor, Moon, Sun, TrendingUp, UserCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { displayName } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge, roleLabel } from "@/components/ui/badge";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/button";
import { useTheme, type ThemePreference } from "@/components/ui/theme";

export function UserMenu() {
  const { user, signOut, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  if (!user) return null;

  return (
    <DropdownMenu
      align="end"
      className="w-64"
      trigger={
        <button
          type="button"
          aria-label="Menu użytkownika"
          className="flex items-center rounded-full outline-none ring-offset-2 ring-offset-surface transition-shadow hover:ring-2 hover:ring-border focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar user={user} size="md" />
        </button>
      }
      header={
        <div className="flex items-center gap-2.5">
          <Avatar user={user} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{displayName(user)}</p>
            <p className="truncate text-xs text-muted">
              {roleLabel(user.role)}
              {user.department_name ? ` · ${user.department_name}` : ""}
            </p>
            {isAdmin && (
              <Badge tone="primary" className="mt-1">
                Administrator
              </Badge>
            )}
          </div>
        </div>
      }
      items={[
        { label: "Mój profil", icon: <UserCircle />, href: "/profile" },
        { label: "Mój wkład", icon: <TrendingUp />, href: "/impact" },
        { label: "Nagrody", icon: <Gift />, href: "/rewards" },
        { type: "separator" },
        { type: "label", label: "Motyw" },
        ...(
          [
            ["light", "Jasny", <Sun key="s" />],
            ["dark", "Ciemny", <Moon key="m" />],
            ["system", "Systemowy", <Monitor key="c" />],
          ] as [ThemePreference, string, React.ReactNode][]
        ).map(([value, label, icon]) => ({
          label: (
            <span className="flex items-center gap-2">
              {icon}
              {label}
            </span>
          ),
          checked: theme === value,
          onSelect: () => setTheme(value),
        })),
        { type: "separator" },
        { label: "Wyloguj", icon: <LogOut />, danger: true, onSelect: () => void signOut() },
      ]}
    />
  );
}

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const dark = resolved === "dark";
  return (
    <IconButton
      label={dark ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
      size="lg"
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun /> : <Moon />}
    </IconButton>
  );
}
