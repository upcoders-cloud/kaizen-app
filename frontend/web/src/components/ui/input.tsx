"use client";
import { forwardRef, useId, cloneElement, isValidElement } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputBase =
  "w-full rounded-md border border-border bg-surface text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-subtle hover:border-border-strong focus:border-primary/60 focus:ring-3 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20";

const SIZE = {
  sm: "h-8 px-2.5 text-[13px]",
  md: "h-9 px-3",
  lg: "h-10 px-3.5",
} as const;

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  inputSize?: keyof typeof SIZE;
  /** Ikona po lewej (lucide). */
  icon?: React.ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, inputSize = "md", icon, invalid, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(inputBase, SIZE[inputSize], icon && "pl-8", className)}
      {...props}
    />
  );
  if (!icon) return input;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle [&_svg]:size-4">
        {icon}
      </span>
      {input}
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(inputBase, "min-h-20 resize-y px-3 py-2 leading-relaxed", className)}
      {...props}
    />
  );
});

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("text-[13px] font-medium text-foreground", className)}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  );
}

/**
 * Pole formularza: etykieta + kontrolka + podpowiedź / błąd.
 * Dziecko (Input/Textarea/Select) dostaje automatycznie `id` i `invalid`.
 */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
  id: idProp,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  id?: string;
  children: React.ReactElement<{ id?: string; invalid?: boolean }>;
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const child = isValidElement(children)
    ? cloneElement(children, { id, invalid: !!error || undefined })
    : children;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {child}
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export interface SearchInputProps
  extends Omit<InputProps, "onChange" | "value" | "icon"> {
  value: string;
  onValueChange: (v: string) => void;
  /** Skrót wyświetlany po prawej, np. "Ctrl K". */
  shortcut?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      value,
      onValueChange,
      shortcut,
      className,
      inputSize = "md",
      invalid,
      placeholder = "Szukaj...",
      ...props
    },
    ref,
  ) {
    return (
      <div className={cn("relative", className)}>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          className={cn(
            inputBase,
            SIZE[inputSize],
            "pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden",
          )}
          {...props}
        />
        {value ? (
          <button
            type="button"
            aria-label="Wyczyść"
            onClick={() => onValueChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-subtle hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : shortcut ? (
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-muted px-1.5 font-mono text-[10px] text-subtle">
            {shortcut}
          </kbd>
        ) : null}
      </div>
    );
  },
);
