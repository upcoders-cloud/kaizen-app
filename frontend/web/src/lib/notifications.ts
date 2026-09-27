import { api } from "@/lib/api";
import type { Notification, Paginated, Post } from "@/lib/types";

export async function getMyIdeas(page = 1, status?: string) {
  const { data } = await api.get<Paginated<Post>>("/posts/", {
    params: { mine: true, status: status || "all", page },
  });
  return data;
}

export async function resubmitIdea(id: number) {
  const { data } = await api.post<Post>(`/posts/${id}/resubmit/`);
  return data;
}

export async function getBookmarkedIdeas(page = 1) {
  const { data } = await api.get<Paginated<Post>>("/posts/bookmarked/", { params: { page } });
  return data;
}

// Akcja backendu przełącza stan zakładki; wywołuj tylko dla aktualnie zapisanych pomysłów.
export async function removeBookmark(id: number) {
  const { data } = await api.post<{ status: string; is_bookmarked_by_me: boolean }>(`/posts/${id}/bookmark/`);
  return data;
}

// Endpoint zwraca obecnie tablicę; obsługa paginacji zachowuje zgodność z przyszłym kontraktem.
export async function getNotifications(page = 1): Promise<Paginated<Notification>> {
  const { data } = await api.get<Paginated<Notification> | Notification[]>("/notifications/", { params: { page } });
  if (Array.isArray(data)) return { count: data.length, next: null, previous: null, results: data };
  return data;
}

export async function markNotificationRead(id: number) {
  const { data } = await api.post<Notification>(`/notifications/${id}/mark_read/`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.post<{ marked_count: number }>("/notifications/mark_all_read/");
  return data;
}

export async function getUnreadNotificationCount() {
  const { data } = await api.get<{ count: number }>("/notifications/unread_count/");
  return data.count;
}
