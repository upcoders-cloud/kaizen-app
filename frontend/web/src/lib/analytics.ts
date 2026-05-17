"use client";
import { useQuery } from "@tanstack/react-query";
import { api, API_BASE_URL, tokenStore } from "./api";

export interface Overview {
  total_ideas: number;
  status_breakdown: Record<string, number>;
  implemented_rate: number;
  avg_approval_hours: number;
  avg_progress: number;
  savings: {
    realized_money: number;
    realized_hours: number;
    potential_money: number;
    potential_hours: number;
  };
  engagement: { comments: number; authors: number };
}

export interface DepartmentRow {
  department_id: number;
  department: string;
  total_ideas: number;
  implemented: number;
  implemented_rate: number;
  savings_money: number;
  savings_potential: number;
  estimated_cost: number;
  roi: number;
  avg_approval_hours: number;
}

export interface CategoryRow {
  category_id: number;
  category: string;
  total_ideas: number;
  implemented: number;
  implemented_rate: number;
  savings_money: number;
}

export interface TrendRow {
  period: string;
  submissions: number;
  implementations: number;
  savings: number;
}

export interface HeatmapData {
  year: number;
  days: Record<string, number>;
  total: number;
}

export interface MyImpact {
  total_ideas: number;
  status_breakdown: Record<string, number>;
  implemented: number;
  implemented_rate: number;
  savings_generated: number;
  savings_hours: number;
  comments_made: number;
  points: number;
  rank: number | null;
  longest_streak: number;
  badges_count: number;
}

const get = async <T>(url: string): Promise<T> => (await api.get(url)).data;

export const useOverview = () =>
  useQuery({ queryKey: ["overview"], queryFn: () => get<Overview>("/analytics/overview/") });

export const useDepartments = () =>
  useQuery({
    queryKey: ["departments"],
    queryFn: () => get<DepartmentRow[]>("/analytics/departments/"),
  });

export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: () => get<CategoryRow[]>("/analytics/categories/"),
  });

export const useTrends = (granularity: "month" | "quarter" = "month") =>
  useQuery({
    queryKey: ["trends", granularity],
    queryFn: () =>
      get<TrendRow[]>(`/analytics/trends/?granularity=${granularity}`),
  });

export const useHeatmap = (year: number) =>
  useQuery({
    queryKey: ["heatmap", year],
    queryFn: () => get<HeatmapData>(`/analytics/heatmap/?year=${year}`),
  });

export const useMyImpact = () =>
  useQuery({
    queryKey: ["my-impact"],
    queryFn: () => get<MyImpact>("/analytics/me/impact/"),
  });

export async function downloadExport(
  report: string,
  fmt: "csv" | "xlsx",
) {
  const token = tokenStore.get();
  const res = await fetch(
    `${API_BASE_URL}/api/analytics/export/?report=${report}&fmt=${fmt}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    },
  );
  if (!res.ok) throw new Error("Eksport nie powiódł się");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kaizen-${report}.${fmt}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
