"use client";
import { useId } from "react";
import { Check, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Stan pośredni (np. "zaznacz wszystko" w tabeli). */
  indeterminate?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  indeterminate,
  label,
  description,
  disabled,
  className,
  id: idProp,
}: CheckboxProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const on = checked || indeterminate;
  const box = (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        on
          ? "border-primary bg-primary text-primary-fg"
          : "border-border-strong bg-surface hover:border-primary/60",
      )}
    >
      {indeterminate ? (
        <Minus className="size-3" strokeWidth={3} />
      ) : checked ? (
        <Check className="size-3" strokeWidth={3} />
      ) : null}
    </button>
  );
  if (!label) return <span className={className}>{box}</span>;
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <span className="pt-0.5">{box}</span>
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block text-sm text-foreground">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </label>
    </div>
  );
}

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  id?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  size = "md",
  className,
  id: idProp,
}: SwitchProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const dims = size === "sm" ? { w: "w-7 h-4", knob: "size-3", x: 12 } : { w: "w-9 h-5", knob: "size-4", x: 16 };
  const control = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        dims.w,
        checked ? "bg-primary" : "bg-border-strong",
      )}
    >
      <motion.span
        initial={false}
        animate={{ x: checked ? dims.x : 0 }}
        transition={{ type: "spring", stiffness: 600, damping: 35 }}
        className={cn("block rounded-full bg-white shadow-xs dark:bg-foreground", dims.knob)}
      />
    </button>
  );
  if (!label) return <span className={className}>{control}</span>;
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block text-sm text-foreground">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </label>
      {control}
    </div>
  );
}
