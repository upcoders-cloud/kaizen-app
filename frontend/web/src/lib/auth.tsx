"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  AuthUser,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  tokenStore,
} from "./api";

const MANAGEMENT = new Set(["MANAGER", "DIRECTOR"]);

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  isManagement: boolean;
  signIn: (u: string, p: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const bootstrap = useCallback(async () => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    try {
      setUser(await fetchMe());
    } catch {
      tokenStore.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signIn = async (username: string, password: string) => {
    await apiLogin(username, password);
    setUser(await fetchMe());
    router.replace("/");
  };

  const signOut = async () => {
    await apiLogout();
    setUser(null);
    router.replace("/login");
  };

  const isManagement =
    !!user &&
    (MANAGEMENT.has(user.role || "") ||
      // backend traktuje staff/superuser jak kierownictwo
      (user as AuthUser & { is_staff?: boolean }).is_staff === true);

  return (
    <Ctx.Provider
      value={{ user, loading, isManagement, signIn, signOut }}
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
