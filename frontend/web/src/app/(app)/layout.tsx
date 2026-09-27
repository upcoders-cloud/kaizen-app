"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ErrorState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { Portal, useEscape, useLockScroll } from "@/components/ui/overlay";

const COLLAPSED_KEY = "kaizen_sidebar_collapsed";

function FullscreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-fg shadow-pop"
      >
        <Sparkles className="size-5 animate-pulse" />
      </motion.div>
    </div>
  );
}

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEscape(open, onClose);
  useLockScroll(open);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-50 lg:hidden">
        <motion.div
          className="absolute inset-0 bg-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClose}
        />
        <motion.div
          className="absolute inset-y-0 left-0 shadow-dialog"
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 42 }}
        >
          <Sidebar onNavigate={onClose} />
        </motion.div>
      </div>
    </Portal>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, error, retry } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const deniedFor = useRef<string | null>(null);

  const allowed = !!user && canAccess(user, pathname);

  // Guardy: brak sesji -> /login, brak uprawnień -> /feed + toast.
  useEffect(() => {
    if (loading || error) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!canAccess(user, pathname)) {
      if (deniedFor.current !== pathname) {
        deniedFor.current = pathname;
        toast.warning("Brak uprawnień", "Nie masz dostępu do tej sekcji.");
      }
      router.replace("/feed");
    }
  }, [user, loading, error, pathname, router]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Skróty: Ctrl/Cmd+K - paleta, "[" - zwiń panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.key === "[" && !e.ctrlKey && !e.metaKey && !isTypingTarget(e.target)) {
        setCollapsed((c) => {
          try {
            localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
          } catch {
            /* ignore */
          }
          return !c;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (error && !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <ErrorState
          title="Nie można połączyć się z serwerem"
          description="Sprawdź, czy backend działa, i spróbuj ponownie."
          onRetry={retry}
        />
      </div>
    );
  }

  if (loading || !user || !allowed) return <FullscreenLoader />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:flex">
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </div>
      <MobileNav open={mobileNav} onClose={() => setMobileNav(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onOpenPalette={() => setPaletteOpen(true)} onOpenMobileNav={() => setMobileNav(true)} />
        <main id="app-main" className="flex-1 overflow-y-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
