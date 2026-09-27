"use client";
import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const ACCESS_KEY = "kaizen_web_access";

const tokenListeners = new Set<() => void>();

export const tokenStore = {
  get: () =>
    typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY),
  set: (t: string) => {
    localStorage.setItem(ACCESS_KEY, t);
    tokenListeners.forEach((l) => l());
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    tokenListeners.forEach((l) => l());
  },
  /** Subskrypcja zmian tokenu (dla useSyncExternalStore). */
  subscribe: (l: () => void) => {
    tokenListeners.add(l);
    return () => {
      tokenListeners.delete(l);
    };
  },
};

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true, // refresh token cookie (HttpOnly)
  headers: { Accept: "application/json", "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  // Blokada między kartami: tylko jedna karta naraz odświeża token (ciasteczko refresh jest rotowane).
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks?.request) return locks.request("kaizen-refresh", fn) as Promise<T>;
  return fn();
}

/**
 * Odświeża access token. `sentToken` = token, z którym zapytanie dostało 401.
 * Jeśli w międzyczasie inna karta (albo inne zapytanie) zapisała nowy token, używamy go
 * zamiast rotować ciasteczko jeszcze raz. Token czyścimy tylko, gdy nikt go nie odświeżył.
 */
async function refreshAccessToken(sentToken: string | null): Promise<string | null> {
  return withRefreshLock(async () => {
    const current = tokenStore.get();
    if (current && current !== sentToken) return current;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/access/token/refresh/`,
        {},
        { withCredentials: true },
      );
      const access = res?.data?.access;
      if (access) {
        tokenStore.set(access);
        return access as string;
      }
    } catch {
      /* niżej sprawdzamy, czy inna karta nie zdążyła odświeżyć */
    }
    const after = tokenStore.get();
    if (after && after !== sentToken) return after;
    tokenStore.clear();
    return null;
  });
}

function bearerOf(config: AxiosRequestConfig | undefined) {
  const header = (config?.headers as Record<string, unknown> | undefined)?.Authorization;
  return typeof header === "string" ? header.replace(/^Bearer\s+/i, "") : null;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;
    // Logowanie i odświeżanie tokenu nie mogą wywoływać kolejnego odświeżenia.
    const isAuthCall = /\/access\/token/.test(original?.url ?? "");

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      const sent = bearerOf(original);
      if (!refreshing) {
        refreshing = refreshAccessToken(sent).finally(() => {
          refreshing = null;
        });
      }
      const newToken = await refreshing;
      if (newToken) {
        original.headers = {
          ...(original.headers || {}),
          Authorization: `Bearer ${newToken}`,
        };
        return api(original);
      }
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        const next = encodeURIComponent(
          window.location.pathname + window.location.search,
        );
        window.location.href = `/login?next=${next}`;
      }
    }
    return Promise.reject(error);
  },
);

// Inne karty zmieniają localStorage: odświeżamy subskrybentów (np. wylogowanie w jednej karcie).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === ACCESS_KEY) tokenListeners.forEach((l) => l());
  });
}

export interface AuthUser {
  id: number;
  username: string;
  nickname?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  gender?: string;
  role?: string;
  avatar_url?: string | null;
  department?: number | null;
  department_name?: string | null;
  is_staff?: boolean;
  is_superuser?: boolean;
  permissions?: {
    is_admin: boolean;
    is_approver: boolean;
    is_management: boolean;
  };
}

export async function login(username: string, password: string) {
  const res = await api.post("/access/token/", { username, password });
  const access = res.data?.access;
  if (access) tokenStore.set(access);
  return res.data as AuthUser & { access: string };
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await api.get("/users/me/");
  return res.data;
}

export async function logout() {
  try {
    await api.post("/access/logout/", {});
  } catch {
    /* ignore */
  }
  tokenStore.clear();
}
