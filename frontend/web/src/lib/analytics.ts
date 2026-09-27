"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

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

export interface AnalyticsFilters {
  date_from?: string;
  date_to?: string;
  department?: number | string;
  category?: number | string;
  status?: string;
}

export interface ApprovalAnalytics {
  pending_by_stage: Record<string, number>;
  pending_total: number;
  decided_total: number;
  avg_decision_hours: number;
  median_decision_hours: number;
  overdue_count: number;
  sla_days: number;
  approval_rate: number;
  by_stage: { stage: string; pending: number; approved: number; rejected: number; avg_decision_hours: number }[];
  overdue: { post_id: number; title: string; stage: string; approver_id: number | null; approver_name: string | null; waiting_hours: number }[];
}

export interface TopIdea {
  id: number;
  title: string;
  status?: string;
  author?: { id: number; username: string; nickname?: string; first_name?: string; last_name?: string; avatar_url?: string | null };
  category_name?: string;
  department?: string;
  savings?: number | null;
  likes_count?: number;
  comments_count?: number;
  progress_percent?: number;
  deadline?: string | null;
}

export interface TeamMember {
  id: number;
  username: string;
  nickname?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  ideas: number;
  implemented: number;
  in_progress: number;
  pending: number;
  points: number;
  last_activity?: string | null;
}

export interface TeamAnalytics {
  department: { id: number; name: string; lead_id?: number | null; lead_name?: string | null };
  summary: { members: number; active_members: number; ideas: number; implemented: number; in_progress: number; pending_approval: number; points: number; savings: number };
  members: TeamMember[];
  ideas_in_progress?: TopIdea[];
}

export interface ParticipationRow {
  period?: string;
  department_id?: number;
  department?: string;
  active_users: number;
  total_users: number;
  rate: number;
}

export interface ParticipationAnalytics {
  date_from: string;
  date_to: string;
  summary: { active_users: number; total_users: number; rate: number };
  monthly: ParticipationRow[];
  departments: ParticipationRow[];
}

const paramsOf = (filters: AnalyticsFilters = {}) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ""));

async function getData<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return (await api.get<T>(url, { params })).data;
}

export const useOverview = (filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ["analytics", "overview", filters],
    queryFn: () => getData<Overview>("/analytics/overview/", paramsOf(filters)),
  });

export const useDepartments = (filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ["analytics", "departments", filters],
    queryFn: () => getData<DepartmentRow[]>("/analytics/departments/", paramsOf(filters)),
  });

export const useCategories = (filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ["analytics", "categories", filters],
    queryFn: () => getData<CategoryRow[]>("/analytics/categories/", paramsOf(filters)),
  });

export const useTrends = (granularity: "month" | "quarter" = "month", filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ["analytics", "trends", granularity, filters],
    queryFn: () => getData<TrendRow[]>("/analytics/trends/", { granularity, ...paramsOf(filters) }),
  });

export const useApprovalsAnalytics = (filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ["analytics", "approvals", filters],
    queryFn: () => getData<ApprovalAnalytics>("/analytics/approvals/", paramsOf(filters)),
  });

export const useTopIdeas = (by: "savings" | "likes" | "comments" = "savings", filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ["analytics", "top-ideas", by, filters],
    queryFn: () => getData<TopIdea[]>("/analytics/top-ideas/", { by, limit: 10, ...paramsOf(filters) }),
  });

/** `department` tylko dla management (TEAM_LEAD zawsze dostaje własny dział). */
export const useTeamAnalytics = (department?: number | string, enabled = true) =>
  useQuery({
    queryKey: ["analytics", "team", department ?? "own"],
    enabled,
    retry: false,
    queryFn: () => getData<TeamAnalytics>("/analytics/team/", department ? { department } : {}),
  });

export const useParticipation = (filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ["analytics", "participation", filters],
    queryFn: () => getData<ParticipationAnalytics>("/analytics/participation/", paramsOf(filters)),
  });

export const useHeatmap = (year: number) =>
  useQuery({
    queryKey: ["analytics", "heatmap", year],
    queryFn: () => getData<HeatmapData>("/analytics/heatmap/", { year }),
  });

export const useMyImpact = () =>
  useQuery({
    queryKey: ["analytics", "my-impact"],
    queryFn: () => getData<MyImpact>("/analytics/me/impact/"),
  });

export type ExportReport = "overview" | "departments" | "categories" | "trends" | "ideas";

/**
 * Pobiera plik eksportu przez klienta `api` (interceptor odświeży wygasły token i ponowi zapytanie).
 */
export async function downloadExport(report: ExportReport | string, fmt: "csv" | "xlsx", filters: AnalyticsFilters = {}) {
  const res = await api.get<Blob>("/analytics/export/", {
    params: { report, fmt, ...paramsOf(filters) },
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kaizen-${report}.${fmt}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
