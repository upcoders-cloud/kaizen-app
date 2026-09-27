"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Layers, Lightbulb, SlidersHorizontal, X } from "lucide-react";
import { cn, fmtNum, plural } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  useCategories,
  useDepartmentOptions,
  useInfinitePosts,
  type PostFilters,
  type PostOrdering,
} from "@/lib/ideas";
import { IdeaCard, IdeaCardSkeleton } from "@/components/ideas";
import { MyLevelCard, NewIdeaCta, TopRankingCard, TrendingCard } from "@/components/ideas/FeedPanels";
import { SearchInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge, STATUS_META, type PostStatus } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Popover } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/misc";
import { useDebouncedValue } from "@/components/ui/use-debounce";

const ORDERING: { value: PostOrdering; label: string }[] = [
  { value: "newest", label: "Najnowsze" },
  { value: "likes", label: "Najwięcej polubień" },
  { value: "comments", label: "Najczęściej komentowane" },
  { value: "savings", label: "Największe oszczędności" },
  { value: "oldest", label: "Najstarsze" },
];

const PUBLIC_STATUSES: PostStatus[] = ["SUBMITTED", "IN_PROGRESS", "IMPLEMENTED"];
const MGMT_STATUSES: PostStatus[] = ["TO_VERIFY", "CANCELLED"];

function useFeedFilters() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters: PostFilters = {
    search: sp.get("search") ?? "",
    category: sp.get("category") ?? "",
    status: sp.get("status") ?? "",
    department: sp.get("department") ?? "",
    ordering: (sp.get("ordering") as PostOrdering) || "newest",
  };
  const setFilter = (key: keyof PostFilters, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value && !(key === "ordering" && value === "newest")) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const clear = () => router.replace(pathname, { scroll: false });
  return { filters, setFilter, clear };
}

function FilterList<T extends string>({
  title,
  items,
  value,
  onChange,
}: {
  title: string;
  items: { value: T | ""; label: string; dot?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-subtle">{title}</p>
      <ul className="flex flex-col gap-px">
        {items.map((it) => {
          const active = value === it.value;
          return (
            <li key={it.value || "all"}>
              <button
                type="button"
                onClick={() => onChange(it.value)}
                className={cn(
                  "flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors",
                  active ? "bg-accent font-medium text-foreground" : "text-muted hover:bg-accent/60 hover:text-foreground",
                )}
              >
                {it.dot ? (
                  <span className="size-2 shrink-0 rounded-full" style={{ background: it.dot }} />
                ) : (
                  <span className="size-2 shrink-0 rounded-full border border-border-strong" />
                )}
                <span className="truncate">{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FeedContent() {
  const { isManagement } = useAuth();
  const { filters, setFilter, clear } = useFeedFilters();
  const categories = useCategories();
  const departments = useDepartmentOptions(isManagement);
  const [search, setSearch] = useState(filters.search ?? "");
  const debounced = useDebouncedValue(search, 350);

  useEffect(() => {
    if ((filters.search ?? "") !== debounced) setFilter("search", debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const query = useInfinitePosts({ ...filters, search: debounced });
  const posts = useMemo(() => query.data?.pages.flatMap((p) => p.results) ?? [], [query.data]);
  const total = query.data?.pages[0]?.count ?? 0;

  // Infinite scroll: sentinel na końcu listy.
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const statusItems = [
    { value: "" as const, label: "Wszystkie" },
    ...(isManagement ? [...PUBLIC_STATUSES, ...MGMT_STATUSES] : PUBLIC_STATUSES).map((s) => ({
      value: s,
      label: STATUS_META[s].label,
      dot: STATUS_META[s].color,
    })),
  ];
  const categoryItems = [
    { value: "", label: "Wszystkie kategorie" },
    ...(categories.data ?? []).filter((c) => c.is_active !== false).map((c) => ({ value: String(c.id), label: c.name })),
  ];
  const deptOptions = (departments.data ?? []).map((d) => ({ value: String(d.id), label: d.name }));

  const activeChips = [
    filters.status && { key: "status" as const, label: STATUS_META[filters.status as PostStatus]?.label ?? filters.status },
    filters.category && {
      key: "category" as const,
      label: categories.data?.find((c) => String(c.id) === filters.category)?.name ?? "Kategoria",
    },
    filters.department && {
      key: "department" as const,
      label: departments.data?.find((d) => String(d.id) === filters.department)?.name ?? "Dział",
    },
    debounced && { key: "search" as const, label: `"${debounced}"` },
  ].filter(Boolean) as { key: keyof PostFilters; label: string }[];

  const filtersPanel = (
    <div className="flex flex-col gap-5">
      <FilterList title="Status" items={statusItems} value={filters.status ?? ""} onChange={(v) => setFilter("status", v)} />
      <FilterList
        title="Kategoria"
        items={categoryItems}
        value={filters.category ?? ""}
        onChange={(v) => setFilter("category", v)}
      />
      {deptOptions.length > 0 && (
        <div>
          <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-subtle">Dział</p>
          <Select
            selectSize="sm"
            value={filters.department ?? ""}
            onValueChange={(v) => setFilter("department", v)}
            placeholder="Wszystkie działy"
            options={deptOptions}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[13rem_minmax(0,1fr)_18rem]">
      {/* lewa kolumna: filtry */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 flex flex-col gap-5">
          <SearchInput value={search} onValueChange={setSearch} placeholder="Szukaj pomysłów..." inputSize="sm" />
          {filtersPanel}
        </div>
      </aside>

      {/* środek: lista */}
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Feed pomysłów</h1>
            <p className="mt-0.5 text-[13px] text-muted">
              {query.isLoading ? "Wczytywanie..." : `${fmtNum(total)} ${plural(total, "pomysł", "pomysły", "pomysłów")}`}
            </p>
          </div>
          <div className="w-full lg:hidden">
            <SearchInput value={search} onValueChange={setSearch} placeholder="Szukaj pomysłów..." inputSize="sm" />
          </div>
          <Popover
            align="start"
            className="w-64 p-3"
            triggerClassName="lg:hidden"
            trigger={
              <Button variant="secondary" size="sm">
                <SlidersHorizontal /> Filtry
                {activeChips.length > 0 && (
                  <Badge tone="primary" className="ml-0.5">
                    {activeChips.length}
                  </Badge>
                )}
              </Button>
            }
          >
            {filtersPanel}
          </Popover>
          <Select
            selectSize="sm"
            value={filters.ordering ?? "newest"}
            onValueChange={(v) => setFilter("ordering", v)}
            options={ORDERING}
            aria-label="Sortowanie"
            className="w-52"
          />
        </div>

        {activeChips.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {activeChips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => (c.key === "search" ? setSearch("") : setFilter(c.key, ""))}
                className="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-surface pl-2.5 pr-1.5 text-xs text-foreground transition-colors hover:border-border-strong"
              >
                {c.label}
                <X className="size-3 text-subtle" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSearch("");
                clear();
              }}
              className="ml-1 text-xs font-medium text-muted hover:text-foreground"
            >
              Wyczyść
            </button>
          </div>
        )}

        {query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : query.isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <IdeaCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            variant="card"
            icon={activeChips.length ? <Layers /> : <Lightbulb />}
            title={activeChips.length ? "Brak pomysłów dla tych filtrów" : "Jeszcze nikt nic nie zgłosił"}
            description={
              activeChips.length ? "Zmień lub wyczyść filtry, aby zobaczyć więcej." : "Bądź pierwszą osobą, która zgłosi usprawnienie."
            }
            action={
              activeChips.length ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    clear();
                  }}
                >
                  Wyczyść filtry
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((p, i) => (
              <IdeaCard key={p.id} post={p} index={i % 15} />
            ))}
            <div ref={sentinel} />
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}
            {hasNextPage && !isFetchingNextPage && (
              <Button variant="ghost" size="sm" className="mx-auto" onClick={() => fetchNextPage()}>
                Załaduj więcej
              </Button>
            )}
            {!hasNextPage && posts.length > 5 && (
              <p className="py-4 text-center text-xs text-subtle">To już wszystko.</p>
            )}
          </div>
        )}
      </section>

      {/* prawa kolumna: panel */}
      <aside className="hidden xl:block">
        <div className="sticky top-6 flex flex-col gap-4">
          <MyLevelCard />
          <TopRankingCard />
          <TrendingCard />
          <NewIdeaCta />
        </div>
      </aside>
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <IdeaCardSkeleton key={i} />
          ))}
        </div>
      }
    >
      <FeedContent />
    </Suspense>
  );
}
