"use client";
import { useEffect, useState } from "react";

/** Zwraca wartość opóźnioną o `delay` ms (np. do wyszukiwarek). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
