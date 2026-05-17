"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number;
  format?: (n: number) => string;
  icon?: React.ReactNode;
  hint?: string;
  accent?: string;
  delay?: number;
}

export function KpiCard({
  label,
  value,
  format = (n) => String(Math.round(n)),
  icon,
  hint,
  accent = "var(--primary)",
  delay = 0,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 700;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-muted">{label}</span>
          {icon && (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: `${accent}1a`, color: accent }}
            >
              {icon}
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-3 text-3xl font-bold tracking-tight text-foreground",
          )}
        >
          {format(display)}
        </p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </Card>
    </motion.div>
  );
}
