import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const plnFmt = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 0,
});

const numFmt = new Intl.NumberFormat("pl-PL");

export const fmtPLN = (v: number | string | null | undefined) =>
  plnFmt.format(Number(v ?? 0));

export const fmtNum = (v: number | string | null | undefined) =>
  numFmt.format(Number(v ?? 0));

export const fmtPct = (v: number | string | null | undefined) =>
  `${numFmt.format(Number(v ?? 0))}%`;

export const fmtHours = (v: number | string | null | undefined) =>
  `${numFmt.format(Math.round(Number(v ?? 0)))} h`;

const dateFmt = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const rtf = new Intl.RelativeTimeFormat("pl-PL", { numeric: "auto" });

export const fmtDate = (v: string | Date | null | undefined) =>
  v ? dateFmt.format(new Date(v)) : "-";

export const fmtDateTime = (v: string | Date | null | undefined) =>
  v ? dateTimeFmt.format(new Date(v)) : "-";

/** "5 min temu", "wczoraj", "3 dni temu"; starsze niż 30 dni jako data. */
export function fmtRelative(v: string | Date | null | undefined) {
  if (!v) return "-";
  const date = new Date(v);
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return "przed chwilą";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return dateFmt.format(date);
}

/** Pluralizacja PL: plural(3, "pomysł", "pomysły", "pomysłów"). */
export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export interface PersonLike {
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  username?: string | null;
}

export function displayName(u: PersonLike | null | undefined) {
  if (!u) return "Nieznany";
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return full || u.nickname || u.username || "Nieznany";
}

export function initials(u: PersonLike | null | undefined) {
  if (!u) return "?";
  const a = u.first_name?.[0];
  const b = u.last_name?.[0];
  if (a && b) return (a + b).toUpperCase();
  return (a || u.nickname?.[0] || u.username?.[0] || "?").toUpperCase();
}

/** Wyciąga czytelny komunikat z błędu axios/DRF. */
export function errorMessage(err: unknown, fallback = "Coś poszło nie tak.") {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data.length < 300 ? data : fallback;
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;
    for (const value of Object.values(obj)) {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  return fallback;
}
