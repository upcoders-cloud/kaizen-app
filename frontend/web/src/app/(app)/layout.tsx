"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";

const TITLES: Record<string, string> = {
  "/dashboard": "Przegląd organizacji",
  "/departments": "Działy",
  "/reports": "Raporty",
  "/impact": "Mój wkład",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isManagement } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    // Strony zarządcze niedostępne dla pracownika → przekieruj na "Mój wkład"
    const mgmtOnly = ["/dashboard", "/departments", "/reports"];
    if (!isManagement && mgmtOnly.some((p) => pathname.startsWith(p))) {
      router.replace("/impact");
    }
  }, [user, loading, isManagement, pathname, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-muted">
        Ładowanie…
      </div>
    );
  }

  const title =
    Object.entries(TITLES).find(([p]) => pathname.startsWith(p))?.[1] ||
    "Kaizen";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
