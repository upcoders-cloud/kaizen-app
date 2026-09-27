import type { Role } from "@/lib/admin";
import type { BadgeTone } from "@/components/ui/badge";

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "EMPLOYEE", label: "Pracownik" },
  { value: "TEAM_LEAD", label: "Lider zespołu" },
  { value: "MANAGER", label: "Kierownik" },
  { value: "DIRECTOR", label: "Dyrektor" },
];

export const ROLE_TONE: Record<Role, BadgeTone> = {
  EMPLOYEE: "neutral",
  TEAM_LEAD: "info",
  MANAGER: "violet",
  DIRECTOR: "primary",
};

export const ACTIVE_OPTIONS = [
  { value: "true", label: "Aktywni" },
  { value: "false", label: "Nieaktywni" },
];

export const STAFF_OPTIONS = [
  { value: "true", label: "Administratorzy" },
  { value: "false", label: "Bez dostępu admina" },
];

export const USERS_PAGE_SIZE = 20;
