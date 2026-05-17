"use client";
import { motion } from "framer-motion";
import { useDepartments } from "@/lib/analytics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HBar } from "@/components/charts/Charts";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtPLN, fmtPct, fmtNum, fmtHours } from "@/lib/utils";

export default function DepartmentsPage() {
  const { data, isLoading } = useDepartments();

  if (isLoading || !data) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>ROI per dział (oszczędności / koszt)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.length > 0 ? (
              <HBar data={data} dataKey="roi" labelKey="department" />
            ) : (
              <p className="py-10 text-center text-sm text-muted">
                Brak danych działowych.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>KPI działów</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Dział</th>
                <th className="px-5 py-3">Pomysły</th>
                <th className="px-5 py-3">Wdrożone</th>
                <th className="px-5 py-3">% wdrożeń</th>
                <th className="px-5 py-3">Oszczędności</th>
                <th className="px-5 py-3">Koszt</th>
                <th className="px-5 py-3">ROI</th>
                <th className="px-5 py-3">Śr. akceptacja</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <motion.tr
                  key={d.department_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b last:border-0 hover:bg-accent/50"
                >
                  <td className="px-5 py-3 font-semibold">
                    {d.department}
                  </td>
                  <td className="px-5 py-3">{fmtNum(d.total_ideas)}</td>
                  <td className="px-5 py-3">{fmtNum(d.implemented)}</td>
                  <td className="px-5 py-3">
                    {fmtPct(d.implemented_rate)}
                  </td>
                  <td className="px-5 py-3 font-medium text-success">
                    {fmtPLN(d.savings_money)}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {fmtPLN(d.estimated_cost)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        d.roi >= 1
                          ? "rounded-md bg-success/10 px-2 py-1 font-semibold text-success"
                          : "text-muted"
                      }
                    >
                      {d.roi.toFixed(2)}×
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {fmtHours(d.avg_approval_hours)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
