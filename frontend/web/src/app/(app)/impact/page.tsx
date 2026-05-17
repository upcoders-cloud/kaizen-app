"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Lightbulb,
  CheckCircle2,
  Wallet,
  Clock,
  Trophy,
  Flame,
  Award,
  MessageSquare,
} from "lucide-react";
import { useMyImpact, useHeatmap } from "@/lib/analytics";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Heatmap } from "@/components/dashboard/Heatmap";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPLN, fmtNum, fmtPct, fmtHours } from "@/lib/utils";

export default function ImpactPage() {
  const year = new Date().getFullYear();
  const [hmYear, setHmYear] = useState(year);
  const { data: me, isLoading } = useMyImpact();
  const { data: hm } = useHeatmap(hmYear);

  if (isLoading || !me) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Moje pomysły"
          value={me.total_ideas}
          format={fmtNum}
          icon={<Lightbulb size={18} />}
          accent="#1d2b64"
        />
        <KpiCard
          label="Wdrożone"
          value={me.implemented}
          format={fmtNum}
          icon={<CheckCircle2 size={18} />}
          accent="#16a34a"
          hint={fmtPct(me.implemented_rate) + " skuteczności"}
          delay={0.05}
        />
        <KpiCard
          label="Wygenerowane oszczędności"
          value={me.savings_generated}
          format={fmtPLN}
          icon={<Wallet size={18} />}
          accent="#36d1dc"
          hint={fmtHours(me.savings_hours) + " czasu"}
          delay={0.1}
        />
        <KpiCard
          label="Punkty"
          value={me.points}
          format={fmtNum}
          icon={<Trophy size={18} />}
          accent="#f59e0b"
          hint={me.rank ? `#${me.rank} w rankingu` : undefined}
          delay={0.15}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Najdłuższa passa"
          value={me.longest_streak}
          format={(n) => `${Math.round(n)} dni`}
          icon={<Flame size={18} />}
          accent="#dc2626"
        />
        <KpiCard
          label="Odznaki"
          value={me.badges_count}
          format={fmtNum}
          icon={<Award size={18} />}
          accent="#6366f1"
        />
        <KpiCard
          label="Komentarze"
          value={me.comments_made}
          format={fmtNum}
          icon={<MessageSquare size={18} />}
          accent="#36d1dc"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>
              Aktywność w {hmYear}
              {hm ? ` · ${hm.total} akcji` : ""}
            </CardTitle>
            <div className="flex gap-1">
              {[year - 1, year].map((y) => (
                <button
                  key={y}
                  onClick={() => setHmYear(y)}
                  className={
                    "rounded-md px-2 py-1 text-xs font-semibold " +
                    (y === hmYear
                      ? "bg-primary text-primary-fg"
                      : "text-muted hover:bg-accent")
                  }
                >
                  {y}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {hm ? (
              <Heatmap year={hm.year} days={hm.days} />
            ) : (
              <Skeleton className="h-32" />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
