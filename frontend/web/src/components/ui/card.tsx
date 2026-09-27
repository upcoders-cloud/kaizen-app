import { cn } from "@/lib/utils";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({
  className,
  interactive,
  ...props
}: DivProps & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface shadow-card",
        interactive &&
          "transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-pop",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  title,
  description,
  action,
  children,
  ...props
}: Omit<DivProps, "title"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  if (title === undefined && description === undefined && action === undefined) {
    return (
      <div className={cn("flex flex-col gap-1 p-4 pb-2", className)} {...props}>
        {children}
      </div>
    );
  }
  return (
    <div
      className={cn("flex items-start justify-between gap-3 p-4 pb-2", className)}
      {...props}
    >
      <div className="min-w-0">
        {title !== undefined && <CardTitle>{title}</CardTitle>}
        {description !== undefined && (
          <CardDescription>{description}</CardDescription>
        )}
        {children}
      </div>
      {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
    </div>
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-0.5 text-xs text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: DivProps) {
  return <div className={cn("p-4 pt-2", className)} {...props} />;
}

export function CardFooter({ className, ...props }: DivProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-border px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}
