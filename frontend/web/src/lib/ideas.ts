"use client";
// Warstwa API pomysłów (webcore): posty, komentarze, akceptacje, realizacja, słowniki.
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { api } from "./api";
import type {
  ApprovalStage,
  Category,
  Comment,
  Department,
  Notification,
  Paginated,
  Post,
  PostLite,
  PostStatus,
  UserProfile,
  UserPublic,
} from "./types";

/* ------------------------------------------------------------------ */
/* Klucze zapytań. Inne moduły (webflow) mogą invalidować ["posts"].   */
/* ------------------------------------------------------------------ */

export const ideaKeys = {
  all: ["posts"] as const,
  list: (f: PostFilters) => ["posts", "list", f] as const,
  detail: (id: number) => ["posts", "detail", id] as const,
  comments: (id: number) => ["posts", "comments", id] as const,
  queue: (stage?: string, page?: number) => ["posts", "queue", stage ?? "all", page ?? 1] as const,
  queueCount: ["posts", "queue", "count"] as const,
  pipeline: (f: object) => ["posts", "pipeline", f] as const,
  trending: ["posts", "trending"] as const,
};

export const NOTIFICATIONS_KEY = ["notifications"] as const;

function unpack<T>(data: T[] | Paginated<T>): T[] {
  return Array.isArray(data) ? data : (data?.results ?? []);
}

function status(err: unknown) {
  return (err as { response?: { status?: number } })?.response?.status;
}

/* ------------------------------ lista ------------------------------ */

export type PostOrdering = "newest" | "oldest" | "likes" | "comments" | "savings";

export interface PostFilters {
  search?: string;
  category?: string;
  status?: string;
  department?: string;
  author?: string | number;
  mine?: boolean;
  ordering?: PostOrdering;
  date_from?: string;
  date_to?: string;
  page_size?: number;
}

function cleanParams(f: PostFilters & { page?: number }) {
  const params: Record<string, string | number> = {};
  Object.entries(f).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" || v === false) return;
    params[k] = v === true ? "1" : (v as string | number);
  });
  return params;
}

export async function fetchPosts(f: PostFilters & { page?: number } = {}) {
  const res = await api.get<Paginated<Post> | Post[]>("/posts/", { params: cleanParams(f) });
  const data = res.data;
  if (Array.isArray(data)) return { count: data.length, next: null, previous: null, results: data };
  return data;
}

export function usePosts(f: PostFilters & { page?: number }) {
  return useQuery({
    queryKey: ideaKeys.list(f),
    queryFn: () => fetchPosts(f),
    placeholderData: (prev) => prev,
  });
}

export function useInfinitePosts(f: PostFilters) {
  return useInfiniteQuery({
    queryKey: [...ideaKeys.list(f), "infinite"],
    queryFn: ({ pageParam }) => fetchPosts({ ...f, page: pageParam, page_size: f.page_size ?? 15 }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  });
}

export function usePost(id: number | undefined) {
  return useQuery({
    queryKey: ideaKeys.detail(id ?? 0),
    queryFn: async () => (await api.get<Post>(`/posts/${id}/`)).data,
    enabled: !!id,
  });
}

export function useTrending(limit = 5) {
  return useQuery({
    queryKey: [...ideaKeys.trending, limit],
    queryFn: async () => {
      try {
        return (await api.get<PostLite[]>("/posts/trending/", { params: { limit } })).data;
      } catch (err) {
        // Fallback, gdy endpoint niedostępny: najczęściej lajkowane.
        if (status(err) === 404) {
          const res = await fetchPosts({ ordering: "likes", page_size: limit });
          return res.results as PostLite[];
        }
        throw err;
      }
    },
    staleTime: 5 * 60_000,
  });
}

/* ------------------- aktualizacja postów w cache ------------------- */

type PostPatch = Partial<Post> & { id: number };

/** Nakłada zmianę na post we wszystkich listach i szczegółach w cache. */
export function patchPostInCache(qc: QueryClient, patch: PostPatch) {
  const apply = (p: Post) => (p.id === patch.id ? { ...p, ...patch } : p);
  qc.setQueriesData<unknown>({ queryKey: ideaKeys.all, predicate: (q) => q.queryKey[1] !== "comments" }, (old: unknown) => {
    if (!old || typeof old !== "object") return old;
    // szczegóły
    if ("id" in (old as Post) && (old as Post).id === patch.id && "title" in (old as Post)) {
      return { ...(old as Post), ...patch };
    }
    // infinite
    if ("pages" in (old as InfiniteData<Paginated<Post>>)) {
      const inf = old as InfiniteData<Paginated<Post>>;
      return {
        ...inf,
        pages: inf.pages.map((pg) => (pg?.results ? { ...pg, results: pg.results.map(apply) } : pg)),
      };
    }
    // paginowana lista
    if ("results" in (old as Paginated<Post>) && Array.isArray((old as Paginated<Post>).results)) {
      const pg = old as Paginated<Post>;
      return { ...pg, results: pg.results.map(apply) };
    }
    if (Array.isArray(old)) return (old as Post[]).map((p) => (p && typeof p === "object" ? apply(p) : p));
    return old;
  });
}

/** Optymistyczny lajk. */
export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: Pick<Post, "id" | "likes_count" | "is_liked_by_me">) =>
      (await api.post<{ likes_count: number; is_liked_by_me: boolean }>(`/posts/${post.id}/like/`)).data,
    onMutate: async (post: Pick<Post, "id" | "likes_count" | "is_liked_by_me">) => {
      await qc.cancelQueries({ queryKey: ideaKeys.all });
      const liked = !post.is_liked_by_me;
      patchPostInCache(qc, {
        id: post.id,
        is_liked_by_me: liked,
        likes_count: Math.max(0, post.likes_count + (liked ? 1 : -1)),
      });
      return { post };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.post)
        patchPostInCache(qc, {
          id: ctx.post.id,
          is_liked_by_me: ctx.post.is_liked_by_me,
          likes_count: ctx.post.likes_count,
        });
    },
    onSuccess: (data, post) => {
      patchPostInCache(qc, { id: post.id, likes_count: data.likes_count, is_liked_by_me: data.is_liked_by_me });
    },
  });
}

/** Optymistyczna zakładka. */
export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: Pick<Post, "id" | "is_bookmarked_by_me">) =>
      (await api.post<{ is_bookmarked_by_me: boolean }>(`/posts/${post.id}/bookmark/`)).data,
    onMutate: async (post) => {
      await qc.cancelQueries({ queryKey: ideaKeys.all });
      patchPostInCache(qc, { id: post.id, is_bookmarked_by_me: !post.is_bookmarked_by_me });
      return { post };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.post) patchPostInCache(qc, { id: ctx.post.id, is_bookmarked_by_me: ctx.post.is_bookmarked_by_me });
    },
    onSuccess: (data, post) => {
      patchPostInCache(qc, { id: post.id, is_bookmarked_by_me: data.is_bookmarked_by_me });
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

/* ---------------------------- zapis ---------------------------- */

export interface SurveyInput {
  frequency_value: number;
  frequency_unit: "DAY" | "WEEK" | "MONTH";
  affected_people: number;
  time_lost_minutes: number;
}

export type ImageType = "GENERAL" | "BEFORE" | "AFTER";

export const IMAGE_TYPE_LABELS: Record<ImageType, string> = {
  GENERAL: "Ogólne",
  BEFORE: "Przed",
  AFTER: "Po",
};

export interface PostInput {
  title: string;
  content: string;
  category: number;
  assigned_manager?: number | null;
  assigned_team_lead?: number | null;
  /** base64 data URL (jak w mobile) albo obiekt z typem zdjęcia. */
  images?: (string | { image: string; type: ImageType })[];
  remove_images?: number[];
}

export async function createPost(input: PostInput) {
  return (await api.post<Post>("/posts/", input)).data;
}

export async function updatePost(id: number, input: Partial<PostInput>) {
  return (await api.patch<Post>(`/posts/${id}/`, input)).data;
}

export async function saveSurvey(id: number, input: SurveyInput, exists: boolean) {
  const res = exists
    ? await api.put(`/posts/${id}/survey/`, input)
    : await api.post(`/posts/${id}/survey/`, input);
  return res.data;
}

export async function deletePost(id: number) {
  await api.delete(`/posts/${id}/`);
}

export function useInvalidatePosts() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ideaKeys.all });
}

/* -------------------------- akceptacje -------------------------- */

export interface ApproveInput {
  comment?: string;
  /** Wymagane na etapie MANAGER. */
  estimated_cost?: string | number;
  deadline?: string | null;
  assigned_director?: number | null;
}

/** Próg kosztu wymagający akceptacji dyrektora (backend: COST_THRESHOLD_DIRECTOR). */
export const DIRECTOR_COST_THRESHOLD = 10000;

function usePostAction<TVars>(fn: (vars: TVars) => Promise<Post>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (post) => {
      qc.setQueryData(ideaKeys.detail(post.id), post);
      qc.invalidateQueries({ queryKey: ideaKeys.all });
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useApprove() {
  return usePostAction(async ({ id, ...body }: ApproveInput & { id: number }) =>
    (await api.post<Post>(`/posts/${id}/approve/`, body)).data,
  );
}

export function useReject() {
  return usePostAction(async ({ id, rejection_reason }: { id: number; rejection_reason: string }) =>
    (await api.post<Post>(`/posts/${id}/reject/`, { rejection_reason })).data,
  );
}

export function useResubmit() {
  return usePostAction(async ({ id }: { id: number }) => (await api.post<Post>(`/posts/${id}/resubmit/`)).data);
}

export function useUpdateProgress() {
  return usePostAction(
    async ({ id, ...body }: { id: number; progress_percent?: number; deadline?: string | null }) =>
      (await api.patch<Post>(`/posts/${id}/progress/`, body)).data,
  );
}

/** Kolejka akceptacji; fallback na my_cases, gdy endpoint niedostępny. */
export function useApprovalsQueue(stage?: ApprovalStage | "", page = 1, enabled = true) {
  return useQuery({
    queryKey: ideaKeys.queue(stage || undefined, page),
    enabled,
    queryFn: async (): Promise<Paginated<Post>> => {
      try {
        const res = await api.get<Paginated<Post> | Post[]>("/posts/approvals_queue/", {
          params: cleanParams({ stage: stage || undefined, page, page_size: 50 } as PostFilters),
        });
        const d = res.data;
        return Array.isArray(d) ? { count: d.length, next: null, previous: null, results: d } : d;
      } catch (err) {
        if (status(err) !== 404) throw err;
        const res = await api.get<Post[]>("/posts/my_cases/");
        const list = res.data.filter(
          (p) => p.status === "TO_VERIFY" && (!stage || p.current_stage?.stage === stage),
        );
        return { count: list.length, next: null, previous: null, results: list };
      }
    },
  });
}

export function useApprovalsCount(enabled: boolean) {
  return useQuery({
    queryKey: ideaKeys.queueCount,
    enabled,
    queryFn: async () => {
      try {
        return (await api.get<{ count: number }>("/posts/approvals_queue/count/")).data.count;
      } catch (err) {
        if (status(err) === 404) return 0;
        throw err;
      }
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/* --------------------------- realizacja --------------------------- */

export type Pipeline = Record<"SUBMITTED" | "IN_PROGRESS" | "IMPLEMENTED", PostLite[]>;

export function usePipeline(f: { department?: string; category?: string; mine_only?: boolean }) {
  return useQuery({
    queryKey: ideaKeys.pipeline(f),
    queryFn: async (): Promise<Pipeline> => {
      try {
        return (
          await api.get<Pipeline>("/posts/pipeline/", {
            params: cleanParams(f as PostFilters),
          })
        ).data;
      } catch (err) {
        if (status(err) !== 404) throw err;
        // Fallback: trzy zapytania listy.
        const cols = ["SUBMITTED", "IN_PROGRESS", "IMPLEMENTED"] as const;
        const res = await Promise.all(
          cols.map((s) => fetchPosts({ status: s, page_size: 100, department: f.department, category: f.category })),
        );
        return Object.fromEntries(cols.map((c, i) => [c, res[i].results as PostLite[]])) as Pipeline;
      }
    },
  });
}

/* --------------------------- komentarze --------------------------- */

export function useComments(postId: number | undefined) {
  return useQuery({
    queryKey: ideaKeys.comments(postId ?? 0),
    queryFn: async () => unpack((await api.get<Comment[] | Paginated<Comment>>(`/posts/${postId}/comments/`)).data),
    enabled: !!postId,
  });
}

export function useAddComment(postId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { text: string; parent?: number | null }) =>
      (await api.post<Comment>(`/posts/${postId}/comments/`, body)).data,
    onSuccess: (comment) => {
      qc.setQueryData<Comment[]>(ideaKeys.comments(postId), (old) => [...(old ?? []), comment]);
      qc.setQueryData<Post>(ideaKeys.detail(postId), (old) =>
        old ? { ...old, comments_count: old.comments_count + 1 } : old,
      );
    },
  });
}

export function useDeleteComment(postId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/comments/${id}/`);
      return id;
    },
    onSuccess: (id) => {
      // Backend kasuje odpowiedzi kaskadowo - usuwamy całe poddrzewo.
      qc.setQueryData<Comment[]>(ideaKeys.comments(postId), (old) => {
        const list = old ?? [];
        const removed = new Set([id]);
        let grew = true;
        while (grew) {
          grew = false;
          for (const c of list) {
            if (c.parent !== null && removed.has(c.parent) && !removed.has(c.id)) {
              removed.add(c.id);
              grew = true;
            }
          }
        }
        return list.filter((c) => !removed.has(c.id));
      });
      qc.invalidateQueries({ queryKey: ideaKeys.detail(postId) });
    },
  });
}

/* ---------------------------- słowniki ---------------------------- */

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      unpack((await api.get<Category[] | Paginated<Category>>("/categories/", { params: { page_size: 100 } })).data),
    staleTime: 10 * 60_000,
  });
}

/**
 * Lista działów do filtrów: publiczny `GET /departments/` (tablica {id, name}).
 * `/analytics/departments/` tylko jako fallback dla management (inne role dostają 403).
 */
export function useDepartmentOptions(allowAnalyticsFallback = false) {
  return useQuery({
    queryKey: ["departments", "options", allowAnalyticsFallback],
    queryFn: async (): Promise<Department[]> => {
      const toOptions = (rows: Record<string, unknown>[]) =>
        rows
          .map((r) => ({ id: Number(r.id ?? r.department_id), name: String(r.name ?? r.department ?? "") }))
          .filter((d) => d.id && d.name);
      try {
        const res = await api.get<Record<string, unknown>[] | Paginated<Record<string, unknown>>>("/departments/");
        return toOptions(unpack(res.data));
      } catch (err) {
        if (status(err) !== 404 || !allowAnalyticsFallback) return [];
        try {
          const res = await api.get<Record<string, unknown>[] | Paginated<Record<string, unknown>>>(
            "/analytics/departments/",
          );
          return toOptions(unpack(res.data));
        } catch {
          return [];
        }
      }
    },
    staleTime: 10 * 60_000,
    retry: false,
  });
}

export function useApprovers(role?: "TEAM_LEAD" | "MANAGER" | "DIRECTOR") {
  return useQuery({
    queryKey: ["users", "approvers", role ?? "all"],
    queryFn: async () => {
      try {
        return unpack(
          (await api.get<UserPublic[] | Paginated<UserPublic>>("/users/approvers/", { params: { role } })).data,
        );
      } catch (err) {
        if (status(err) !== 404) throw err;
        return unpack(
          (await api.get<UserPublic[]>("/users/managers/", { params: { role: role ?? "MANAGER" } })).data,
        );
      }
    },
    staleTime: 10 * 60_000,
  });
}

export function useUserSearch(search: string, enabled = true) {
  return useQuery({
    queryKey: ["users", "search", search],
    enabled: enabled && search.length > 0,
    queryFn: async () =>
      unpack(
        (await api.get<UserPublic[] | Paginated<UserPublic>>("/users/", { params: { search, page_size: 8 } })).data,
      ),
    staleTime: 60_000,
  });
}

export function useUserProfile(id: number | undefined) {
  return useQuery({
    queryKey: ["users", "profile", id],
    enabled: !!id,
    queryFn: async () => (await api.get<UserProfile>(`/users/${id}/`)).data,
  });
}

/* ------------------------- powiadomienia (dzwonek) ------------------------- */
// Pełna strona powiadomień: webflow (src/lib/notifications.ts). Wspólny prefiks klucza: ["notifications"].

export function useUnreadCount() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, "unread-count"],
    queryFn: async () => (await api.get<{ count: number }>("/notifications/unread_count/")).data.count,
    refetchInterval: 60_000,
    staleTime: 20_000,
  });
}

export function useRecentNotifications(enabled: boolean) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, "recent"],
    enabled,
    queryFn: async () =>
      unpack(
        (await api.get<Notification[] | Paginated<Notification>>("/notifications/", { params: { page: 1, page_size: 8 } }))
          .data,
      ).slice(0, 8),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | "all") => {
      if (id === "all") await api.post("/notifications/mark_all_read/");
      else await api.post(`/notifications/${id}/mark_read/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

/* ------------------------------ pomocnicze ------------------------------ */

export const STATUS_ORDER: PostStatus[] = ["TO_VERIFY", "SUBMITTED", "IN_PROGRESS", "IMPLEMENTED", "CANCELLED"];

export const STAGE_LABELS: Record<ApprovalStage, string> = {
  TEAM_LEAD: "Lider zespołu",
  MANAGER: "Kierownik",
  DIRECTOR: "Dyrektor",
};

export const DECISION_LABELS: Record<string, string> = {
  PENDING: "Oczekuje",
  APPROVED: "Zaakceptowano",
  REJECTED: "Odrzucono",
  SKIPPED: "Pominięto",
};

export const FREQUENCY_LABELS: Record<string, string> = {
  DAY: "dziennie",
  WEEK: "tygodniowo",
  MONTH: "miesięcznie",
};

/** Plik -> data URL base64 (z opcjonalnym zmniejszeniem do maxSize px). */
export async function fileToDataUrl(file: File, maxSize = 1600, quality = 0.85): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  if (!file.type.startsWith("image/") || file.type === "image/gif") return raw;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = raw;
    });
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    if (scale === 1 && file.size < 1_500_000) return raw;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return raw;
  }
}
