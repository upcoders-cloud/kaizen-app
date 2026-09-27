"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Portal, useAnchoredPosition, type Align, type Side } from "./overlay";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: Side;
  align?: Align;
  /** Opóźnienie pokazania w ms. */
  delay?: number;
  disabled?: boolean;
  className?: string;
  /** Klasa wrappera wyzwalacza (domyślnie inline-flex). */
  triggerClassName?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delay = 350,
  disabled,
  className,
  triggerClassName,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useAnchoredPosition(anchorRef, floatingRef, open, side, align, 6);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const show = () => {
    if (disabled || !content) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <>
      <span
        ref={anchorRef}
        className={cn("inline-flex", triggerClassName)}
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
        onPointerDown={hide}
      >
        {children}
      </span>
      <Portal>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={floatingRef}
              role="tooltip"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              style={{ position: "fixed", top: -9999, left: -9999 }}
              className={cn(
                "pointer-events-none z-[60] max-w-xs rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-pop",
                className,
              )}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
