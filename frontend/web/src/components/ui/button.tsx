import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-fg shadow-xs hover:bg-primary-hover",
        secondary:
          "border border-border bg-surface text-foreground shadow-xs hover:bg-accent hover:border-border-strong",
        outline:
          "border border-border bg-surface text-foreground shadow-xs hover:bg-accent hover:border-border-strong",
        ghost: "text-muted hover:bg-accent hover:text-foreground",
        soft: "bg-primary-soft text-primary hover:bg-primary-soft/70",
        danger: "bg-danger text-white shadow-xs hover:bg-danger/90",
        "danger-soft": "bg-danger-soft text-danger hover:bg-danger-soft/70",
        success: "bg-success text-white shadow-xs hover:bg-success/90 dark:text-background",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        xs: "h-7 px-2 text-xs [&_svg]:size-3.5",
        sm: "h-8 px-2.5 text-[13px] [&_svg]:size-4",
        md: "h-9 px-3.5 [&_svg]:size-4",
        lg: "h-10 px-5 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Pokazuje spinner i blokuje przycisk. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant, size, loading, disabled, children, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" />}
        {children}
      </button>
    );
  },
);

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        ghost: "text-muted hover:bg-accent hover:text-foreground",
        outline:
          "border border-border bg-surface text-muted shadow-xs hover:bg-accent hover:text-foreground",
        primary: "bg-primary text-primary-fg hover:bg-primary-hover",
        danger: "text-muted hover:bg-danger-soft hover:text-danger",
      },
      size: {
        xs: "size-6 [&_svg]:size-3.5",
        sm: "size-7 [&_svg]:size-4",
        md: "size-8 [&_svg]:size-4",
        lg: "size-9 [&_svg]:size-[18px]",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  /** Wymagana etykieta dostępności (też jako title). */
  label: string;
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { className, variant, size, label, active, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          iconButtonVariants({ variant, size }),
          active && "bg-accent text-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);
