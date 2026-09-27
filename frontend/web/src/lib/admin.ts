"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export interface Page<T> { count: number; next: string | null; previous: string | null; results: T[] }
export type Role = "EMPLOYEE" | "TEAM_LEAD" | "MANAGER" | "DIRECTOR";
export interface AdminUser {
  id: number; username: string; nickname?: string; first_name?: string; last_name?: string;
  email?: string; role: Role; department: number | null; department_name?: string | null;
  is_active: boolean; is_staff: boolean; is_superuser: boolean; points: number;
  date_joined?: string; last_login?: string | null;
}
export interface UserPublic { id: number; username: string; nickname?: string; first_name?: string; last_name?: string; role: Role; department: number | null; department_name: string | null }
export interface Department { id: number; name: string; is_active: boolean; member_count?: number; lead?: number | null; lead_name?: string | null }
export interface Category { id: number; name: string; post_count: number; is_active: boolean }
export interface AdminReward { id: number; name: string; description: string; cost_points: number; stock: number | null; icon?: string; order?: number; is_active: boolean; redemption_count?: number }
export type RedemptionStatus = "PENDING" | "APPROVED" | "DELIVERED" | "REJECTED";
export interface AdminRedemption { id: number; user: UserPublic; reward: AdminReward; points_spent: number; status: RedemptionStatus; status_display: string; note: string; created_at: string; handled_at: string | null; handled_by: UserPublic | null }
export interface PointRule { id: number; action: string; action_display: string; points: number; daily_cap: number | null; is_active: boolean; description: string }
export interface AdminBadge { id: number; code: string; name: string; description: string; icon: string; criteria_type: string; threshold: number; tier: string; order: number; is_active: boolean; awarded_count: number }
export interface Level { id: number; name: string; min_points: number; order: number; color?: string; icon?: string }
export interface AdminStats { active_users: number; total_users: number; admins: number; pending_redemptions: number; categories: number; departments: number; active_rewards: number; active_badges: number; posts: number; pending_approvals: number }
export type AdminResource = "users" | "departments" | "categories" | "rewards" | "badges" | "levels";
export interface ListParams { page?: number; page_size?: number; search?: string; role?: string; department?: number | string; is_active?: boolean | ""; is_staff?: boolean | ""; status?: string }

const path = (resource: string, id?: number) => `/admin/${resource}/${id === undefined ? "" : `${id}/`}`;
export async function listAdmin<T>(resource: string, params: ListParams = {}): Promise<Page<T>> {
  const { data } = await api.get<Page<T> | T[]>(path(resource), { params });
  return Array.isArray(data) ? { count: data.length, next: null, previous: null, results: data } : data;
}
export async function createAdmin<T>(resource: AdminResource, payload: Partial<T>): Promise<T> {
  return (await api.post<T>(path(resource), payload)).data;
}
export async function updateAdmin<T>(resource: AdminResource, id: number, payload: Partial<T>): Promise<T> {
  return (await api.patch<T>(path(resource, id), payload)).data;
}
export async function deleteAdmin(resource: AdminResource, id: number): Promise<void> {
  await api.delete(path(resource, id));
}
export async function setUserPassword(id: number, password: string): Promise<void> {
  await api.post(`${path("users", id)}set_password/`, { password });
}
export async function adjustUserPoints(id: number, points: number, reason: string): Promise<void> {
  await api.post(`${path("users", id)}adjust_points/`, { points, reason });
}
export async function actOnRedemption(id: number, action: "approve" | "deliver" | "reject", note = ""): Promise<AdminRedemption> {
  return (await api.post<AdminRedemption>(`${path("redemptions", id)}${action}/`, { note })).data;
}
export async function updatePointRule(id: number, payload: Partial<PointRule>): Promise<PointRule> {
  return (await api.patch<PointRule>(path("point-rules", id), payload)).data;
}
export const useAdminList = <T,>(resource: string, params: ListParams = {}) =>
  useQuery({ queryKey: ["admin", resource, params], queryFn: () => listAdmin<T>(resource, params) });
export const useAdminStats = () => useQuery({ queryKey: ["admin", "stats"], queryFn: async () => (await api.get<AdminStats>("/admin/stats/")).data });
export function useAdminMutation<T>(resource: AdminResource) {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: ["admin"] });
  return {
    create: useMutation({ mutationFn: (payload: Partial<T>) => createAdmin<T>(resource, payload), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, payload }: { id: number; payload: Partial<T> }) => updateAdmin<T>(resource, id, payload), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: number) => deleteAdmin(resource, id), onSuccess: invalidate }),
  };
}
export function useRedemptionAction() {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, action, note }: { id: number; action: "approve" | "deliver" | "reject"; note?: string }) => actOnRedemption(id, action, note), onSuccess: () => client.invalidateQueries({ queryKey: ["admin"] }) });
}
