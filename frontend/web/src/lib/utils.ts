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
