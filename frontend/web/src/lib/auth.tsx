"use client";
import { createContext, useContext, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AuthUser,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  tokenStore,
} from "./api";
import { isAdmin, isApprover, isManagement } from "./roles";

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  /** Błąd sieci/serwera przy pobieraniu /users/me/ (sesja może być nadal ważna). */
  error: boolean;
  retry: () => void;
  isApprover: boolean;
  isManagement: boolean;
  isAdmin: boolean;
  /** Loguje i przekierowuje na `next` (albo /feed). */
  signIn: (u: string, p: string, next?: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  /** Odświeża dane /users/me/ (np. po edycji profilu). */
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export const ME_QUERY_KEY = ["auth", "me"] as const;

async function loadMe() {
  try {
    return await fetchMe();
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    // Sesja nieważna -> wyloguj. Błąd sieci/serwera -> zostaw token (ekran błędu z ponowieniem).
    if (status && status >= 400 && status < 500) tokenStore.clear();
    throw err;
  }
}

export function safeNext(next: string | null | undefined) {
  // tylko ścieżki wewnętrzne
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")) {
    return next;
  }
  return "/feed";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // null = jeszcze nie wiadomo (SSR / przed hydratacją)
  const hasToken = useSyncExternalStore(
    tokenStore.subscribe,
    () => !!tokenStore.get(),
    () => null,
  );

  const me = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: loadMe,
    enabled: hasToken === true,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const user = hasToken ? (me.data ?? null) : null;
  const loading = hasToken === null || (hasToken === true && me.isPending);

  const signIn = async (username: string, password: string, next?: string | null) => {
    await apiLogin(username, password);
    await queryClient.fetchQuery({ queryKey: ME_QUERY_KEY, queryFn: loadMe });
    router.replace(safeNext(next));
  };

  const signOut = async () => {
    await apiLogout();
    queryClient.clear();
    router.replace("/login");
  };

  const refreshUser = async () => {
    await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
  };

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        error: hasToken === true && me.isError,
        retry: () => void me.refetch(),
        isApprover: isApprover(user),
        isManagement: isManagement(user),
        isAdmin: isAdmin(user),
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
