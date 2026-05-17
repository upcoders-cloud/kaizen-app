"use client";
import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const ACCESS_KEY = "kaizen_web_access";

export const tokenStore = {
  get: () =>
    typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY),
  set: (t: string) => localStorage.setItem(ACCESS_KEY, t),
  clear: () => localStorage.removeItem(ACCESS_KEY),
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

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post(
      `${API_BASE_URL}/api/access/token/refresh/`,
      {},
      { withCredentials: true },
    );
    const access = res?.data?.access;
    if (access) {
      tokenStore.set(access);
      return access;
    }
  } catch {
    /* fallthrough */
  }
  tokenStore.clear();
  return null;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;
    const isRefreshCall = original?.url?.includes(
      "/access/token/refresh",
    );

    if (status === 401 && !original?._retry && !isRefreshCall) {
      original._retry = true;
      if (!refreshing) refreshing = refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers = {
          ...(original.headers || {}),
          Authorization: `Bearer ${newToken}`,
        };
        return api(original);
      }
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export interface AuthUser {
  id?: number;
  username: string;
  nickname?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  avatar_url?: string | null;
  department_name?: string | null;
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
