"use client";
import { useMemo } from "react";
import {
  eachDayOfInterval,
  endOfYear,
  format,
  getDay,
  startOfYear,
} from "date-fns";

const LEVELS = ["#eef2f7", "#bfe3ea", "#7fcdd9", "#36d1dc", "#1d8fa3"];
const MONTHS = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

export function Heatmap({
  year,
  days,
}: {
  year: number;
  days: Record<string, number>;
}) {
  const { weeks, max } = useMemo(() => {
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(start);
    const all = eachDayOfInterval({ start, end });
    const max = Math.max(1, ...Object.values(days));
    const cols: { date: Date; count: number }[][] = [];
    let col: { date: Date; count: number }[] = [];
    // pad first week (Mon-based)
    const firstDow = (getDay(start) + 6) % 7;
    for (let i = 0; i < firstDow; i++)
      col.push({ date: new Date(NaN), count: -1 });
    all.forEach((d) => {
      const key = format(d, "yyyy-MM-dd");
      col.push({ date: d, count: days[key] || 0 });
      if (col.length === 7) {
        cols.push(col);
        col = [];
      }
    });
    if (col.length) cols.push(col);
    return { weeks: cols, max };
  }, [year, days]);

  const colorFor = (c: number) => {
    if (c < 0) return "transparent";
    if (c === 0) return LEVELS[0];
    const idx = Math.min(
      LEVELS.length - 1,
      1 + Math.floor((c / max) * (LEVELS.length - 2)),
    );
    return LEVELS[idx];
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        <div className="ml-7 flex gap-[3px] text-[10px] text-muted">
          {weeks.map((w, i) => {
            const d = w.find((x) => x.count >= 0)?.date;
            const showMonth =
              d && d.getDate() <= 7 ? MONTHS[d.getMonth()] : "";
            return (
              <span key={i} className="w-[13px] text-center">
                {showMonth}
              </span>
            );
          })}
        </div>
        <div className="flex gap-[3px]">
          <div className="flex flex-col gap-[3px] pr-1 text-[10px] text-muted">
            {["Pon", "", "Śr", "", "Pt", "", "Nd"].map((d, i) => (
              <span key={i} className="h-[13px] leading-[13px]">
                {d}
              </span>
            ))}
          </div>
          {weeks.map((w, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {w.map((cell, j) => (
                <div
                  key={j}
                  title={
                    cell.count >= 0
                      ? `${format(cell.date, "dd.MM.yyyy")}: ${cell.count}`
                      : ""
                  }
                  className="h-[13px] w-[13px] rounded-[3px]"
                  style={{ background: colorFor(cell.count) }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="ml-7 mt-1 flex items-center gap-1 text-[10px] text-muted">
          <span>mniej</span>
          {LEVELS.map((c) => (
            <span
              key={c}
              className="h-[11px] w-[11px] rounded-[3px]"
              style={{ background: c }}
            />
          ))}
          <span>więcej</span>
        </div>
      </div>
    </div>
  );
}
