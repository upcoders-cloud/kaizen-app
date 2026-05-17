"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#1d2b64", "#36d1dc", "#6366f1", "#f59e0b", "#16a34a", "#dc2626"];

const STATUS_LABELS: Record<string, string> = {
  TO_VERIFY: "Do weryfikacji",
  SUBMITTED: "Zgłoszone",
  IN_PROGRESS: "W trakcie",
  IMPLEMENTED: "Wdrożone",
  CANCELLED: "Odrzucone",
};
const STATUS_COLORS: Record<string, string> = {
  TO_VERIFY: "#94a3b8",
  SUBMITTED: "#36d1dc",
  IN_PROGRESS: "#6366f1",
  IMPLEMENTED: "#16a34a",
  CANCELLED: "#dc2626",
};

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e1e6ed",
  fontSize: 12,
};

export function StatusDonut({
  data,
}: {
  data: Record<string, number>;
}) {
  const rows = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      name: STATUS_LABELS[k] || k,
      value: v,
      color: STATUS_COLORS[k] || "#94a3b8",
    }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={95}
          paddingAngle={3}
        >
          {rows.map((r, i) => (
            <Cell key={i} fill={r.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({
  data,
}: {
  data: { period: string; submissions: number; implementations: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#36d1dc" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#36d1dc" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d2b64" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#1d2b64" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => String(v).slice(0, 7)}
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          name="Zgłoszenia"
          dataKey="submissions"
          stroke="#36d1dc"
          fill="url(#g1)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          name="Wdrożenia"
          dataKey="implementations"
          stroke="#1d2b64"
          fill="url(#g2)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function HBar<T extends object>({
  data,
  dataKey,
  labelKey,
  color = "#1d2b64",
}: {
  data: T[];
  dataKey: string;
  labelKey: string;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
      <BarChart
        data={data as unknown as object[]}
        layout="vertical"
        margin={{ left: 16, right: 16 }}
      >
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey={labelKey}
          tick={{ fontSize: 12 }}
          width={120}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey={dataKey} radius={[0, 6, 6, 0]} barSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length] || color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
