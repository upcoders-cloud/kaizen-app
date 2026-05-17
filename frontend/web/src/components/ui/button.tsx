import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary/90",
        outline:
          "border border-border bg-surface text-foreground hover:bg-accent",
        ghost: "text-muted hover:bg-accent hover:text-foreground",
        danger: "bg-danger text-white hover:bg-danger/90",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  );
}
