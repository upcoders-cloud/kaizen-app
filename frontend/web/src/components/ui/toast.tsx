"use client";
import { useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export interface ToastOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  /** Czas w ms; 0 = do zamknięcia ręcznego. Domyślnie 4000. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastOptions {
  id: number;
}

/* Prosty globalny store: toast() można wołać z dowolnego miejsca (także poza komponentami). */
let items: ToastItem[] = [];
let counter = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function push(opts: ToastOptions) {
  const id = ++counter;
  items = [...items.slice(-4), { id, variant: "default", duration: 4000, ...opts }];
  emit();
  return id;
}

type ToastFn = ((opts: ToastOptions) => number) & {
  success: (title: React.ReactNode, description?: React.ReactNode) => number;
  error: (title: React.ReactNode, description?: React.ReactNode) => number;
  warning: (title: React.ReactNode, description?: React.ReactNode) => number;
  info: (title: React.ReactNode, description?: React.ReactNode) => number;
  dismiss: (id: number) => void;
};

export const toast: ToastFn = Object.assign(push, {
  success: (title: React.ReactNode, description?: React.ReactNode) =>
    push({ title, description, variant: "success" }),
  error: (title: React.ReactNode, description?: React.ReactNode) =>
    push({ title, description, variant: "error", duration: 6000 }),
  warning: (title: React.ReactNode, description?: React.ReactNode) =>
    push({ title, description, variant: "warning" }),
  info: (title: React.ReactNode, description?: React.ReactNode) =>
    push({ title, description, variant: "info" }),
  dismiss: dismissToast,
});

/** Hook dla wygody w komponentach: `const { toast } = useToast()`. */
export function useToast() {
  return { toast, dismiss: dismissToast };
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  default: null,
  success: <CheckCircle2 className="size-4 text-success" />,
  error: <XCircle className="size-4 text-danger" />,
  warning: <AlertTriangle className="size-4 text-warning" />,
  info: <Info className="size-4 text-info" />,
};

function ToastView({ item }: { item: ToastItem }) {
  useEffect(() => {
    if (!item.duration) return;
    const t = setTimeout(() => dismissToast(item.id), item.duration);
    return () => clearTimeout(t);
  }, [item.id, item.duration]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 500, damping: 38 }}
      role={item.variant === "error" ? "alert" : "status"}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-border bg-elevated p-3 pr-2 shadow-pop"
    >
      {ICONS[item.variant ?? "default"] && (
        <span className="mt-0.5 shrink-0">{ICONS[item.variant ?? "default"]}</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{item.title}</p>
        {item.description && <p className="mt-0.5 text-xs text-muted">{item.description}</p>}
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action!.onClick();
              dismissToast(item.id);
            }}
            className="mt-1.5 text-xs font-semibold text-primary hover:underline"
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="Zamknij"
        onClick={() => dismissToast(item.id)}
        className={cn("shrink-0 rounded p-1 text-subtle transition-colors hover:bg-accent hover:text-foreground")}
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}

const EMPTY: ToastItem[] = [];

/** Umieszczony raz w root layout. */
export function Toaster() {
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {list.map((t) => (
          <ToastView key={t.id} item={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
