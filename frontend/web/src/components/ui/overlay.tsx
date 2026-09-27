"use client";
/**
 * Wewnętrzne helpery dla warstw (Dialog, Sheet, Popover, DropdownMenu, Tooltip).
 * Nie importuj bezpośrednio w stronach, chyba że budujesz nowy prymityw.
 */
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const noopSubscribe = () => () => {};

export function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function Portal({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(children, document.body);
}

// Stos warstw: Esc zamyka tylko najwyższą (np. Dialog otwarty nad Sheetem).
const escapeStack: { current: () => void }[] = [];
let escapeListening = false;

function onGlobalEscape(e: KeyboardEvent) {
  if (e.key !== "Escape" || escapeStack.length === 0) return;
  e.stopPropagation();
  escapeStack[escapeStack.length - 1].current();
}

export function useEscape(active: boolean, onEscape: () => void) {
  const handler = useRef(onEscape);
  useEffect(() => {
    handler.current = onEscape;
  });
  useEffect(() => {
    if (!active) return;
    const entry = { current: () => handler.current() };
    escapeStack.push(entry);
    if (!escapeListening) {
      document.addEventListener("keydown", onGlobalEscape);
      escapeListening = true;
    }
    return () => {
      const i = escapeStack.indexOf(entry);
      if (i >= 0) escapeStack.splice(i, 1);
    };
  }, [active]);
}

let scrollLocks = 0;
export function useLockScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    scrollLocks += 1;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) document.body.style.overflow = prev;
    };
  }, [active]);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusables(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("data-focus-skip"),
  );
}

/** Pułapka fokusu + przywracanie fokusu po zamknięciu. */
export function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const raf = requestAnimationFrame(() => {
      if (!root) return;
      const auto = root.querySelector<HTMLElement>("[data-autofocus]");
      (auto ?? focusables(root)[0] ?? root).focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !root) return;
      const items = focusables(root);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [active, ref]);
}

export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";

/**
 * Pozycjonuje element pływający (position: fixed) względem kotwicy.
 * Mutuje style bezpośrednio (bez setState), aktualizuje przy scrollu i resize.
 */
export function useAnchoredPosition(
  anchorRef: React.RefObject<HTMLElement | null>,
  floatingRef: React.RefObject<HTMLElement | null>,
  open: boolean,
  side: Side = "bottom",
  align: Align = "start",
  offset = 6,
) {
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = anchorRef.current;
      const floating = floatingRef.current;
      if (!anchor || !floating) return;
      const a = anchor.getBoundingClientRect();
      const f = floating.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let actualSide = side;
      if (side === "bottom" && a.bottom + offset + f.height > vh && a.top - offset - f.height > 0)
        actualSide = "top";
      if (side === "top" && a.top - offset - f.height < 0) actualSide = "bottom";
      if (side === "right" && a.right + offset + f.width > vw) actualSide = "left";
      if (side === "left" && a.left - offset - f.width < 0) actualSide = "right";

      let top = 0;
      let left = 0;
      if (actualSide === "bottom" || actualSide === "top") {
        top = actualSide === "bottom" ? a.bottom + offset : a.top - offset - f.height;
        if (align === "start") left = a.left;
        else if (align === "end") left = a.right - f.width;
        else left = a.left + a.width / 2 - f.width / 2;
      } else {
        left = actualSide === "right" ? a.right + offset : a.left - offset - f.width;
        if (align === "start") top = a.top;
        else if (align === "end") top = a.bottom - f.height;
        else top = a.top + a.height / 2 - f.height / 2;
      }
      left = Math.max(8, Math.min(left, vw - f.width - 8));
      top = Math.max(8, Math.min(top, vh - f.height - 8));
      floating.style.top = `${top}px`;
      floating.style.left = `${left}px`;
      floating.dataset.side = actualSide;
    };
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, side, align, offset, anchorRef, floatingRef]);
}

export function useClickOutside(
  refs: React.RefObject<HTMLElement | null>[],
  active: boolean,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (refs.some((r) => r.current?.contains(target))) return;
      onOutside();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [active, onOutside, refs]);
}
