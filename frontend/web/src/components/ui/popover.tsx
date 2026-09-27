"use client";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Portal,
  useAnchoredPosition,
  useClickOutside,
  useEscape,
  type Align,
  type Side,
} from "./overlay";

export interface PopoverProps {
  /** Element wyzwalający, np. <Button>. Kliknięcie przełącza popover. */
  trigger: React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  side?: Side;
  align?: Align;
  /** Tryb kontrolowany (opcjonalnie). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Klasa wrappera triggera (domyślnie inline-flex). */
  triggerClassName?: string;
  role?: "dialog" | "menu" | "listbox";
}

export function Popover({
  trigger,
  children,
  side = "bottom",
  align = "start",
  open: openProp,
  onOpenChange,
  className,
  triggerClassName,
  role = "dialog",
}: PopoverProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = useCallback(
    (v: boolean) => {
      if (openProp === undefined) setOpenState(v);
      onOpenChange?.(v);
    },
    [openProp, onOpenChange],
  );
  const close = useCallback(() => setOpen(false), [setOpen]);

  const anchorRef = useRef<HTMLSpanElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  useAnchoredPosition(anchorRef, floatingRef, open, side, align);
  useEscape(open, close);
  useClickOutside([anchorRef, floatingRef], open, close);

  return (
    <>
      <span
        ref={anchorRef}
        className={cn("inline-flex", triggerClassName)}
        aria-haspopup={role}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {trigger}
      </span>
      <Portal>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={floatingRef}
              role={role}
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              style={{ position: "fixed", top: -9999, left: -9999 }}
              className={cn(
                "z-50 min-w-40 rounded-lg border border-border bg-elevated p-1 text-sm shadow-pop outline-none",
                className,
              )}
            >
              {typeof children === "function" ? children(close) : children}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
