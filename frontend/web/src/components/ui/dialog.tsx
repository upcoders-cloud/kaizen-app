"use client";
import { useCallback, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Portal, useEscape, useFocusTrap, useLockScroll } from "./overlay";

const DIALOG_SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Stopka (przyciski), wyrównana do prawej. */
  footer?: React.ReactNode;
  size?: keyof typeof DIALOG_SIZES;
  /** Blokuje zamknięcie kliknięciem w tło / Esc (np. w trakcie zapisu). */
  dismissible?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  size = "md",
  dismissible = true,
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const close = useCallback(() => {
    if (dismissible) onOpenChange(false);
  }, [dismissible, onOpenChange]);
  useEscape(open, close);
  useLockScroll(open);
  useFocusTrap(ref, open);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
            <motion.div
              className="fixed inset-0 bg-overlay backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={close}
            />
            <motion.div
              ref={ref}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-describedby={description ? descId : undefined}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "relative w-full rounded-xl border border-border bg-elevated shadow-dialog outline-none",
                DIALOG_SIZES[size],
                className,
              )}
            >
              {(title || description) && (
                <div className="flex items-start justify-between gap-4 px-5 pt-5">
                  <div className="min-w-0">
                    {title && (
                      <h2 id={titleId} className="text-base font-semibold text-foreground">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p id={descId} className="mt-1 text-sm text-muted">
                        {description}
                      </p>
                    )}
                  </div>
                  {dismissible && (
                    <button
                      type="button"
                      aria-label="Zamknij"
                      data-focus-skip
                      onClick={close}
                      className="-mr-1 -mt-1 rounded-md p-1 text-subtle transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              )}
              {children && <div className="px-5 py-4">{children}</div>}
              {footer && (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}

/** Dialog potwierdzenia akcji (np. usunięcie, wymiana nagrody). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Potwierdź",
  cancelLabel = "Anuluj",
  tone = "primary",
  loading,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
            data-autofocus
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}

/* ---------------------------- Sheet (drawer) ---------------------------- */

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Elementy obok przycisku zamknięcia (np. link "Otwórz stronę"). */
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  side?: "right" | "left";
  /** Klasa szerokości, domyślnie max-w-xl. */
  width?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  headerActions,
  footer,
  side = "right",
  width = "max-w-xl",
  className,
  children,
}: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  useEscape(open, close);
  useLockScroll(open);
  useFocusTrap(ref, open);
  const offscreen = side === "right" ? "100%" : "-100%";

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50">
            <motion.div
              className="absolute inset-0 bg-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={close}
            />
            <motion.div
              ref={ref}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              tabIndex={-1}
              initial={{ x: offscreen }}
              animate={{ x: 0 }}
              exit={{ x: offscreen }}
              transition={{ type: "spring", stiffness: 420, damping: 42 }}
              className={cn(
                "absolute inset-y-0 flex w-full flex-col border-border bg-elevated shadow-dialog outline-none",
                side === "right" ? "right-0 border-l" : "left-0 border-r",
                width,
                className,
              )}
            >
              <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
                <div className="min-w-0">
                  {title && (
                    <h2 id={titleId} className="truncate text-sm font-semibold text-foreground">
                      {title}
                    </h2>
                  )}
                  {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {headerActions}
                  <button
                    type="button"
                    aria-label="Zamknij"
                    data-focus-skip
                    onClick={close}
                    className="rounded-md p-1 text-subtle transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
              {footer && (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
