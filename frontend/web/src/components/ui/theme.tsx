"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark" | "system";
export const THEME_STORAGE_KEY = "kaizen_theme";

/**
 * Skrypt wstrzykiwany w <head> root layoutu, ustawia klasę `.dark` zanim
 * React się załaduje (brak mignięcia jasnego motywu).
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* brak dostępu do storage */
  }
  return "system";
}

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(pref: ThemePreference) {
  const dark = pref === "dark" || (pref === "system" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
}

function subscribe(l: () => void) {
  listeners.add(l);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (readPreference() === "system") apply("system");
    l();
  };
  mq.addEventListener("change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(l);
    mq.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * `theme` - preferencja użytkownika, `resolved` - faktycznie użyty motyw.
 * Działa bez providera (stan w localStorage + klasa na <html>).
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readPreference, () => "system" as ThemePreference);
  const resolved = useSyncExternalStore(
    subscribe,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "light" as const,
  );

  const setTheme = useCallback((pref: ThemePreference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      /* ignore */
    }
    apply(pref);
    listeners.forEach((l) => l());
  }, []);

  return { theme, resolved, setTheme };
}

/** Pilnuje synchronizacji klasy `.dark` (np. po nawigacji). Montowany w root layout. */
export function ThemeSync() {
  useEffect(() => {
    apply(readPreference());
  }, []);
  return null;
}
