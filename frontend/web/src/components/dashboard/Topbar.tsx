"use client";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function Topbar({ title }: { title: string }) {
  const { user, signOut } = useAuth();
  const initials = (
    user?.first_name?.[0] ||
    user?.nickname?.[0] ||
    user?.username?.[0] ||
    "U"
  ).toUpperCase();

  return (
    <header className="no-print sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-surface/80 px-6 backdrop-blur">
      <h1 className="text-lg font-bold text-foreground">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold leading-tight text-foreground">
            {[user?.first_name, user?.last_name]
              .filter(Boolean)
              .join(" ") ||
              user?.nickname ||
              user?.username}
          </p>
          <p className="text-xs text-muted">
            {user?.role}
            {user?.department_name ? ` · ${user.department_name}` : ""}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-primary-fg">
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <button
          onClick={() => signOut()}
          title="Wyloguj"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-accent hover:text-danger"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
