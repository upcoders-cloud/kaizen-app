"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Page } from "./admin";

export type Period = "week" | "month" | "quarter" | "all";
export type Scope = "users" | "departments" | "categories";

export interface Level {
  id: number;
  name: string;
  min_points: number;
  order: number;
  color?: string;
  icon?: string;
}

export interface Badge {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  criteria_type: string;
  tier: string;
  order: number;
  threshold: number;
  value?: number;
  progress?: number;
  earned: boolean;
  awarded_at: string | null;
}

export interface BadgeProgress {
  badge: Omit<Badge, "earned" | "awarded_at" | "value" | "progress">;
  earned: boolean;
  value: number;
  threshold: number;
  progress: number;
  awarded_at?: string | null;
}

export interface GamificationProfile {
  points: number;
  rank: number | null;
  current_streak: number;
  longest_streak: number;
  level: Level | null;
  next_level: Level | null;
  /** 0-1 */
  level_progress: number;
  points_to_next: number;
  badges: BadgeProgress[];
}

export interface PublicGamificationProfile extends Omit<GamificationProfile, "badges"> {
  user: { id: number; username: string; nickname?: string };
  badges: Badge[];
}

export interface LeaderboardUser {
  id: number;
  username: string;
  nickname?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  department_name?: string | null;
}

export interface LeaderboardRow {
  rank: number;
  points: number;
  user?: LeaderboardUser;
  department_id?: number;
  department?: string;
  category_id?: number;
  category?: string;
  level?: Level | null;
  streak?: number | null;
}

export interface Leaderboard {
  results: LeaderboardRow[];
  me?: { rank: number | null; points: number } | null;
}

export interface Reward {
  id: number;
  name: string;
  description: string;
  cost_points: number;
  stock: number | null;
  icon?: string;
  affordable?: boolean;
}

export interface Redemption {
  id: number;
  reward: Reward;
  points_spent: number;
  status: string;
  note?: string;
  created_at: string;
  handled_at?: string | null;
}

export interface Transaction {
  id: number;
  action: string;
  action_display?: string;
  points: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

const unpack = <T,>(data: T[] | Page<T>): T[] => (Array.isArray(data) ? data : data.results);

/** Stabilny klucz wiersza rankingu (remisy mają ten sam `rank`). */
export function leaderboardKey(row: LeaderboardRow, index: number) {
  return String(row.user?.id ?? row.department_id ?? row.category_id ?? row.category ?? `i${index}`);
}

export const useGamificationMe = () =>
  useQuery({
    queryKey: ["gamification", "me"],
    queryFn: async () => (await api.get<GamificationProfile>("/gamification/me/")).data,
  });

export const usePublicGamification = (id?: number) =>
  useQuery({
    queryKey: ["gamification", "user", id],
    enabled: !!id,
    queryFn: async () => (await api.get<PublicGamificationProfile>(`/gamification/users/${id}/`)).data,
  });

export const useLeaderboard = (period: Period, scope: Scope, department?: number) =>
  useQuery({
    queryKey: ["gamification", "leaderboard", period, scope, department],
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<Leaderboard> => {
      const { data } = await api.get<Leaderboard | LeaderboardRow[]>("/gamification/leaderboard/", {
        params: { period, scope, department, limit: 100 },
      });
      return Array.isArray(data) ? { results: data.map((row, i) => ({ ...row, rank: row.rank ?? i + 1 })) } : data;
    },
  });

export const useBadges = () =>
  useQuery({
    queryKey: ["gamification", "badges"],
    queryFn: async () => unpack((await api.get<Badge[] | Page<Badge>>("/gamification/badges/")).data),
  });

export const useRewards = () =>
  useQuery({
    queryKey: ["gamification", "rewards"],
    queryFn: async () => unpack((await api.get<Reward[] | Page<Reward>>("/gamification/rewards/")).data),
  });

export const useRedemptions = () =>
  useQuery({
    queryKey: ["gamification", "redemptions"],
    queryFn: async () =>
      unpack((await api.get<Redemption[] | Page<Redemption>>("/gamification/rewards/my-redemptions/")).data),
  });

export const useTransactions = () =>
  useQuery({
    queryKey: ["gamification", "transactions"],
    queryFn: async () => unpack((await api.get<Transaction[] | Page<Transaction>>("/gamification/transactions/")).data),
  });

export function useRedeem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.post<Redemption>(`/gamification/rewards/${id}/redeem/`)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: ["gamification"] }),
  });
}

export const REDEMPTION_STATUS: Record<string, { label: string; tone: "warning" | "info" | "success" | "danger" }> = {
  PENDING: { label: "Oczekuje", tone: "warning" },
  APPROVED: { label: "Zatwierdzona", tone: "info" },
  DELIVERED: { label: "Wydana", tone: "success" },
  REJECTED: { label: "Odrzucona", tone: "danger" },
};
