"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Loader2,
} from "lucide-react";
import { useTrends, downloadExport } from "@/lib/analytics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendChart } from "@/components/charts/Charts";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPLN, fmtNum } from "@/lib/utils";

const REPORTS = [
  { key: "overview", label: "Przegląd ogólny" },
  { key: "departments", label: "Działy" },
  { key: "categories", label: "Kategorie" },
  { key: "trends", label: "Trendy" },
];

export default function ReportsPage() {
  const [granularity, setGranularity] = useState<"month" | "quarter">(
    "month",
  );
  const { data: trends, isLoading } = useTrends(granularity);
  const [busy, setBusy] = useState<string | null>(null);

  const handleExport = async (
    report: string,
    fmt: "csv" | "xlsx",
  ) => {
    setBusy(`${report}-${fmt}`);
    try {
      await downloadExport(report, fmt);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="no-print">
        <CardHeader>
          <CardTitle>Eksport raportów (manager-review)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {REPORTS.map((r) => (
            <div
              key={r.key}
              className="flex items-center justify-between rounded-lg border bg-background px-4 py-3"
            >
              <span className="text-sm font-medium">{r.label}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(r.key, "csv")}
                  disabled={busy === `${r.key}-csv`}
                >
                  {busy === `${r.key}-csv` ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FileText size={14} />
                  )}
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(r.key, "xlsx")}
                  disabled={busy === `${r.key}-xlsx`}
                >
                  {busy === `${r.key}-xlsx` ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={14} />
                  )}
                  Excel
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            className="mt-1"
          >
            <Printer size={14} /> Drukuj / zapisz jako PDF
          </Button>
        </CardContent>
      </Card>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>
              Trend {granularity === "month" ? "miesięczny" : "kwartalny"}
            </CardTitle>
            <div className="no-print flex gap-1">
              {(["month", "quarter"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={
                    "rounded-md px-3 py-1 text-xs font-semibold " +
                    (g === granularity
                      ? "bg-primary text-primary-fg"
                      : "text-muted hover:bg-accent")
                  }
                >
                  {g === "month" ? "Miesiąc" : "Kwartał"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading || !trends ? (
              <Skeleton className="h-72" />
            ) : trends.length > 0 ? (
              <>
                <TrendChart data={trends} />
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted">
                        <th className="py-2 pr-4">Okres</th>
                        <th className="py-2 pr-4">Zgłoszenia</th>
                        <th className="py-2 pr-4">Wdrożenia</th>
                        <th className="py-2">Oszczędności</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trends.map((t) => (
                        <tr key={t.period} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">
                            {t.period}
                          </td>
                          <td className="py-2 pr-4">
                            {fmtNum(t.submissions)}
                          </td>
                          <td className="py-2 pr-4">
                            {fmtNum(t.implementations)}
                          </td>
                          <td className="py-2 font-medium text-success">
                            {fmtPLN(t.savings)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="py-16 text-center text-sm text-muted">
                Brak danych w wybranym okresie.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
