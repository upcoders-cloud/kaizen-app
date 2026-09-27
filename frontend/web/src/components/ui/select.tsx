"use client";
import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputBase } from "./input";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "size"> {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  /** Opcja z pustą wartością na początku listy, np. "Wszystkie kategorie". */
  placeholder?: string;
  selectSize?: "sm" | "md";
  invalid?: boolean;
}

/**
 * Natywny <select> ostylowany tokenami: w pełni dostępny, działa z klawiaturą
 * i na urządzeniach mobilnych.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    value,
    onValueChange,
    options,
    placeholder,
    selectSize = "md",
    invalid,
    className,
    ...props
  },
  ref,
) {
  return (
    <div className={cn("relative", className)}>
      <select
        ref={ref}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={cn(
          inputBase,
          "appearance-none pr-8",
          selectSize === "sm" ? "h-8 pl-2.5 text-[13px]" : "h-9 pl-3",
          !value && placeholder && "text-muted",
        )}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
    </div>
  );
});
