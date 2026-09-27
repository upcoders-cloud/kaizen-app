import {
  Award,
  Bell,
  Bookmark,
  Building2,
  ClipboardCheck,
  FileBarChart,
  FolderTree,
  Gift,
  KanbanSquare,
  LayoutDashboard,
  Lightbulb,
  Newspaper,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  UserCircle,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { AccessLevel } from "@/lib/roles";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  level: AccessLevel;
  /** Słowa kluczowe dla palety Ctrl+K. */
  keywords?: string;
  /** Licznik w Sidebarze (np. kolejka akceptacji). */
  badge?: "approvals" | "notifications";
}

export interface NavGroup {
  id: string;
  label: string;
  level: AccessLevel;
  items: NavItem[];
}

/** Wszystkie route z PLAN.md sekcja 2. Kolejność = kolejność w Sidebarze. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "ideas",
    label: "Pomysły",
    level: "all",
    items: [
      { href: "/feed", label: "Feed", icon: Newspaper, level: "all", keywords: "pomysły lista start" },
      { href: "/my-ideas", label: "Moje pomysły", icon: Lightbulb, level: "all", keywords: "moje zgłoszenia" },
      { href: "/bookmarks", label: "Zapisane", icon: Bookmark, level: "all", keywords: "zakładki ulubione" },
      { href: "/notifications", label: "Powiadomienia", icon: Bell, level: "all", badge: "notifications" },
    ],
  },
  {
    id: "motivation",
    label: "Motywacja",
    level: "all",
    items: [
      { href: "/leaderboard", label: "Ranking", icon: Trophy, level: "all", keywords: "punkty top" },
      { href: "/rewards", label: "Nagrody", icon: Gift, level: "all", keywords: "sklep wymiana punkty" },
      { href: "/impact", label: "Mój wkład", icon: TrendingUp, level: "all", keywords: "statystyki oszczędności" },
    ],
  },
  {
    id: "team",
    label: "Zespół",
    level: "approver",
    items: [
      { href: "/approvals", label: "Do akceptacji", icon: ClipboardCheck, level: "approver", badge: "approvals", keywords: "akceptacje weryfikacja kolejka" },
      { href: "/team", label: "Mój zespół", icon: UsersRound, level: "approver", keywords: "dział członkowie" },
      { href: "/implementation", label: "Realizacja", icon: KanbanSquare, level: "management", keywords: "kanban wdrożenia postęp" },
    ],
  },
  {
    id: "analytics",
    label: "Analityka",
    level: "management",
    items: [
      { href: "/dashboard", label: "Przegląd", icon: LayoutDashboard, level: "management", keywords: "dashboard kpi organizacja" },
      { href: "/departments", label: "Działy", icon: Building2, level: "management" },
      { href: "/reports", label: "Raporty", icon: FileBarChart, level: "management", keywords: "eksport csv xlsx" },
    ],
  },
  {
    id: "admin",
    label: "Administracja",
    level: "admin",
    items: [
      { href: "/admin/users", label: "Użytkownicy", icon: Users, level: "admin", keywords: "konta role hasła" },
      { href: "/admin/structure", label: "Działy i kategorie", icon: FolderTree, level: "admin", keywords: "struktura" },
      { href: "/admin/rewards", label: "Nagrody i wymiany", icon: Gift, level: "admin", keywords: "katalog wymiany" },
      { href: "/admin/gamification", label: "Gamifikacja", icon: Award, level: "admin", keywords: "punkty odznaki poziomy" },
    ],
  },
];

/** Route spoza Sidebara (przycisk "Nowy pomysł", menu użytkownika). */
export const EXTRA_ITEMS: NavItem[] = [
  { href: "/ideas/new", label: "Nowy pomysł", icon: Plus, level: "all", keywords: "zgłoś dodaj utwórz" },
  { href: "/profile", label: "Mój profil", icon: UserCircle, level: "all", keywords: "konto ustawienia" },
];

export const BRAND = { name: "Kaizen", icon: Sparkles, adminIcon: ShieldCheck };

export const ALL_NAV_ITEMS: (NavItem & { group?: string })[] = [
  ...NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))),
  ...EXTRA_ITEMS,
];

/** Breadcrumb dla ścieżki: [{label, href?}]. */
export function breadcrumbFor(pathname: string): { label: string; href?: string }[] {
  if (pathname === "/ideas/new") return [{ label: "Pomysły", href: "/feed" }, { label: "Nowy pomysł" }];
  const idea = pathname.match(/^\/ideas\/(\d+)(\/edit)?/);
  if (idea) {
    const crumbs: { label: string; href?: string }[] = [
      { label: "Pomysły", href: "/feed" },
      { label: `#${idea[1]}`, href: idea[2] ? `/ideas/${idea[1]}` : undefined },
    ];
    if (idea[2]) crumbs.push({ label: "Edycja" });
    return crumbs;
  }
  if (/^\/profile\/\d+/.test(pathname)) return [{ label: "Profil użytkownika" }];
  const match = ALL_NAV_ITEMS.filter((i) => pathname === i.href || pathname.startsWith(i.href + "/")).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  if (!match) return [{ label: "Kaizen" }];
  return match.group ? [{ label: match.group }, { label: match.label }] : [{ label: match.label }];
}
