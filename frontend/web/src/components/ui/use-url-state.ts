"use client";
import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Stan filtrów w query stringu (linki do widoku da się udostępniać, "wstecz" działa).
 * Komponent używający hooka musi być w <Suspense> (wymóg useSearchParams w Next 16).
 *
 * const { get, set, setMany, clear } = useUrlState();
 * get("role")                 // "" gdy brak
 * set("role", "MANAGER")      // pusta wartość usuwa parametr; zmiana filtra zeruje "page"
 */
export function useUrlState() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const get = useCallback((key: string) => sp.get(key) ?? "", [sp]);

  const setMany = useCallback(
    (patch: Record<string, string | number | null | undefined>, opts: { resetPage?: boolean } = {}) => {
      const next = new URLSearchParams(sp.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") next.delete(k);
        else next.set(k, String(v));
      });
      if (opts.resetPage !== false && !("page" in patch)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname],
  );

  const set = useCallback(
    (key: string, value: string | number | null | undefined) => setMany({ [key]: value }),
    [setMany],
  );

  const clear = useCallback(
    (keep: string[] = []) => {
      const next = new URLSearchParams();
      keep.forEach((k) => sp.get(k) && next.set(k, sp.get(k)!));
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname],
  );

  const all = useMemo(() => Object.fromEntries(sp.entries()), [sp]);

  return { get, set, setMany, clear, all };
}
