"use client";
import { Ban, KeyRound, MoreHorizontal, Pencil, RotateCcw, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import type { AdminUser } from "@/lib/admin";
import { displayName, fmtDateTime, fmtNum, fmtRelative } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge, roleLabel } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import type { Column } from "@/components/ui/table";
import { ActiveBadge } from "@/components/admin/Feedback";
import { ROLE_TONE } from "./constants";

export interface UserRowActions {
  currentUserId?: number;
  onEdit: (user: AdminUser) => void;
  onPassword: (user: AdminUser) => void;
  onPoints: (user: AdminUser) => void;
  onDeactivate: (user: AdminUser) => void;
  onActivate: (user: AdminUser) => void;
}

/** Kolumny tabeli `/admin/users` (sortowanie po stronie serwera: nazwisko, imię, login). */
export function userColumns(a: UserRowActions): Column<AdminUser>[] {
  return [
    {
      key: "user",
      header: "Użytkownik",
      cell: (u) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar user={u} size="sm" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-medium">{displayName(u)}</span>
              {u.id === a.currentUserId && <Badge size="sm" tone="outline">Ty</Badge>}
            </span>
            <span className="block truncate text-xs text-muted">
              @{u.username}
              {u.email ? ` · ${u.email}` : ""}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "role",
      header: "Rola",
      cell: (u) => (
        <span className="flex flex-wrap items-center gap-1">
          <Badge tone={ROLE_TONE[u.role] ?? "neutral"}>{roleLabel(u.role)}</Badge>
          {(u.is_staff || u.is_superuser) && (
            <Badge tone="warning" title={u.is_superuser ? "Superużytkownik" : "Administrator"}>
              <ShieldCheck /> Admin
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: "department_name",
      header: "Dział",
      className: "hidden md:table-cell",
      cell: (u) => (u.department_name ? u.department_name : <span className="text-subtle">Bez działu</span>),
    },
    {
      key: "points",
      header: "Punkty",
      align: "right",
      cell: (u) => <span className="tabular">{fmtNum(u.points)}</span>,
    },
    {
      key: "last_login",
      header: "Ostatnio",
      className: "hidden lg:table-cell",
      cell: (u) =>
        u.last_login ? (
          <span className="text-xs text-muted" title={fmtDateTime(u.last_login)}>
            {fmtRelative(u.last_login)}
          </span>
        ) : (
          <span className="text-xs text-subtle">nigdy</span>
        ),
    },
    { key: "is_active", header: "Status", className: "hidden sm:table-cell", cell: (u) => <ActiveBadge active={u.is_active} /> },
    {
      key: "__actions",
      header: "",
      align: "right",
      className: "w-12",
      cell: (u) => {
        const self = u.id === a.currentUserId;
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <DropdownMenu
              trigger={
                <IconButton label="Akcje" size="sm">
                  <MoreHorizontal />
                </IconButton>
              }
              items={[
                { label: "Edytuj", icon: <Pencil />, onSelect: () => a.onEdit(u) },
                { label: "Ustaw hasło", icon: <KeyRound />, onSelect: () => a.onPassword(u) },
                { label: "Koryguj punkty", icon: <Sparkles />, onSelect: () => a.onPoints(u) },
                { label: "Profil publiczny", icon: <UserRound />, href: `/profile/${u.id}` },
                ...(self
                  ? []
                  : [
                      { type: "separator" as const },
                      u.is_active
                        ? { label: "Dezaktywuj", icon: <Ban />, danger: true, onSelect: () => a.onDeactivate(u) }
                        : { label: "Aktywuj", icon: <RotateCcw />, onSelect: () => a.onActivate(u) },
                    ]),
              ]}
            />
          </span>
        );
      },
    },
  ];
}
