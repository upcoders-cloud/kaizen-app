"use client";
import { motion } from "framer-motion";
import {
  Lightbulb,
  CheckCircle2,
  Clock,
  Wallet,
  MessageSquare,
  Users,
} from "lucide-react";
import {
  useOverview,
  useTrends,
  useCategories,
} from "@/lib/analytics";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusDonut, TrendChart, HBar } from "@/components/charts/Charts";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPLN, fmtNum, fmtPct, fmtHours } from "@/lib/utils";

export default function DashboardPage() {
  const { data: ov, isLoading } = useOverview();
  const { data: trends } = useTrends("month");
  const { data: cats } = useCategories();

  if (isLoading || !ov) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
        <Skeleton className="h-72 sm:col-span-2" />
        <Skeleton className="h-72 sm:col-span-2" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Wszystkie pomysły"
          value={ov.total_ideas}
          format={fmtNum}
          icon={<Lightbulb size={18} />}
          accent="#1d2b64"
          delay={0}
        />
        <KpiCard
          label="% wdrożeń"
          value={ov.implemented_rate}
          format={fmtPct}
          icon={<CheckCircle2 size={18} />}
          accent="#16a34a"
          hint={`${ov.status_breakdown.IMPLEMENTED || 0} wdrożonych`}
          delay={0.05}
        />
        <KpiCard
          label="Śr. czas akceptacji"
          value={ov.avg_approval_hours}
          format={fmtHours}
          icon={<Clock size={18} />}
          accent="#6366f1"
          delay={0.1}
        />
        <KpiCard
          label="Oszczędności zrealizowane"
          value={ov.savings.realized_money}
          format={fmtPLN}
          icon={<Wallet size={18} />}
          accent="#36d1dc"
          hint={`potencjał: ${fmtPLN(ov.savings.potential_money)}`}
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card>
            <CardHeader>
              <CardTitle>Rozkład statusów</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusDonut data={ov.status_breakdown} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Trend zgłoszeń i wdrożeń</CardTitle>
            </CardHeader>
            <CardContent>
              {trends && trends.length > 0 ? (
                <TrendChart data={trends} />
              ) : (
                <p className="py-16 text-center text-sm text-muted">
                  Brak danych w wybranym okresie.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top kategorie (liczba pomysłów)</CardTitle>
          </CardHeader>
          <CardContent>
            {cats && cats.length > 0 ? (
              <HBar
                data={cats.slice(0, 8)}
                dataKey="total_ideas"
                labelKey="category"
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted">
                Brak kategorii.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <KpiCard
            label="Komentarze"
            value={ov.engagement.comments}
            format={fmtNum}
            icon={<MessageSquare size={18} />}
            accent="#6366f1"
          />
          <KpiCard
            label="Aktywni autorzy"
            value={ov.engagement.authors}
            format={fmtNum}
            icon={<Users size={18} />}
            accent="#f59e0b"
          />
          <KpiCard
            label="Śr. postęp wdrożeń"
            value={ov.avg_progress}
            format={fmtPct}
            icon={<Clock size={18} />}
            accent="#16a34a"
          />
        </div>
      </div>
    </div>
  );
}
