"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { CornerDownLeft, Lightbulb, LogOut, Moon, Search, Sun } from "lucide-react";
import { cn, displayName } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { hasLevel } from "@/lib/roles";
import { fetchPosts, useUserSearch } from "@/lib/ideas";
import { Portal, useEscape, useFocusTrap, useLockScroll } from "@/components/ui/overlay";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/misc";
import { useTheme } from "@/components/ui/theme";
import { useDebouncedValue } from "@/components/ui/use-debounce";
import { ALL_NAV_ITEMS } from "./nav";

interface PaletteItem {
  id: string;
  group: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  run: () => void;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l");
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Portal>
      <AnimatePresence>{open && <PaletteBody onClose={() => onOpenChange(false)} />}</AnimatePresence>
    </Portal>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { resolved, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const q = useDebouncedValue(query.trim(), 250);
  useEscape(true, onClose);
  useLockScroll(true);
  useFocusTrap(ref, true);

  const posts = useQuery({
    queryKey: ["palette", "posts", q],
    enabled: q.length >= 2,
    queryFn: () => fetchPosts({ search: q, page_size: 6 }),
    staleTime: 30_000,
  });
  const people = useUserSearch(q, q.length >= 2);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const items = useMemo<PaletteItem[]>(() => {
    const nq = normalize(query.trim());
    const nav = ALL_NAV_ITEMS.filter((i) => hasLevel(user, i.level))
      .filter((i) => !nq || normalize(`${i.label} ${i.group ?? ""} ${i.keywords ?? ""}`).includes(nq))
      .map<PaletteItem>((i) => {
        const Icon = i.icon;
        return {
          id: `nav:${i.href}`,
          group: "Nawigacja",
          label: i.label,
          hint: i.group,
          icon: <Icon />,
          run: () => go(i.href),
        };
      });
    const actions: PaletteItem[] = [
      {
        id: "act:theme",
        group: "Akcje",
        label: resolved === "dark" ? "Włącz jasny motyw" : "Włącz ciemny motyw",
        icon: resolved === "dark" ? <Sun /> : <Moon />,
        run: () => {
          setTheme(resolved === "dark" ? "light" : "dark");
          onClose();
        },
      },
      {
        id: "act:logout",
        group: "Akcje",
        label: "Wyloguj",
        icon: <LogOut />,
        run: () => {
          onClose();
          void signOut();
        },
      },
    ].filter((a) => !nq || normalize(String(a.label)).includes(nq) || normalize("motyw wyloguj").includes(nq));
    const postItems = (q.length >= 2 ? (posts.data?.results ?? []) : []).map<PaletteItem>((p) => ({
      id: `post:${p.id}`,
      group: "Pomysły",
      label: p.title,
      hint: <StatusBadge status={p.status} />,
      icon: <Lightbulb />,
      run: () => go(`/ideas/${p.id}`),
    }));
    const peopleItems = (q.length >= 2 ? (people.data ?? []) : []).map<PaletteItem>((u) => ({
      id: `user:${u.id}`,
      group: "Osoby",
      label: displayName(u),
      hint: u.department_name ?? undefined,
      icon: <Avatar user={u} size="xs" />,
      run: () => go(`/profile/${u.id}`),
    }));
    return [...postItems, ...nav, ...peopleItems, ...actions];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, q, posts.data, people.data, user, resolved]);

  const safeActive = Math.min(active, Math.max(0, items.length - 1));
  const loading = q.length >= 2 && (posts.isFetching || people.isFetching);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next =
        e.key === "ArrowDown"
          ? (safeActive + 1) % Math.max(1, items.length)
          : (safeActive - 1 + items.length) % Math.max(1, items.length);
      setActive(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[safeActive]?.run();
    }
  };

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <motion.div
        className="fixed inset-0 bg-overlay backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        onClick={onClose}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta poleceń"
        initial={{ opacity: 0, scale: 0.97, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-elevated shadow-dialog"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-subtle" />
          <input
            data-autofocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Szukaj pomysłów, osób, stron..."
            className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle"
            role="combobox"
            aria-expanded
            aria-controls="palette-list"
            aria-activedescendant={items[safeActive] ? `palette-${safeActive}` : undefined}
          />
          {loading && <Spinner />}
          <kbd className="rounded border border-border px-1.5 font-mono text-[10px] text-subtle">Esc</kbd>
        </div>
        <div ref={listRef} id="palette-list" role="listbox" className="max-h-[22rem] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">
              {loading ? "Szukam..." : "Brak wyników"}
            </p>
          ) : (
            items.map((item, i) => {
              const header = item.group !== lastGroup ? item.group : null;
              lastGroup = item.group;
              return (
                <div key={item.id}>
                  {header && (
                    <div className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-subtle">
                      {header}
                    </div>
                  )}
                  <button
                    type="button"
                    id={`palette-${i}`}
                    role="option"
                    aria-selected={i === safeActive}
                    data-index={i}
                    tabIndex={-1}
                    onMouseMove={() => i !== safeActive && setActive(i)}
                    onClick={item.run}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px] text-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted",
                      i === safeActive && "bg-accent",
                    )}
                  >
                    {item.icon}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.hint && <span className="shrink-0 text-xs text-subtle">{item.hint}</span>}
                    {i === safeActive && <CornerDownLeft className="size-3.5 text-subtle" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-subtle">
          <span>
            <kbd className="font-mono">↑↓</kbd> wybór
          </span>
          <span>
            <kbd className="font-mono">Enter</kbd> otwórz
          </span>
          <span className="ml-auto">
            <kbd className="font-mono">Ctrl K</kbd> paleta
          </span>
        </div>
      </motion.div>
    </div>
  );
}
