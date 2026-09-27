# Web UI - design system (frontend/web)

Właściciel: webcore. Prośby o nowe warianty lub komponenty zgłaszaj w swoim statusie.

## Zasady

- Import: `import { Button, Card, DataTable } from "@/components/ui";` (barrel) albo z pliku,
  np. `@/components/ui/button`. Stare importy (`@/components/ui/card`, `button`, `skeleton`) działają.
- **Kolory wyłącznie przez tokeny** (klasy Tailwind poniżej). Żadnych `#hex`, `bg-[#...]`,
  `text-gray-500` itp. Dzięki temu działa ciemny motyw.
- Gęstość: tekst bazowy `text-[13px]`/`text-sm`, odstępy w kartach `p-4`, siatki `gap-4`.
- Liczby w tabelach/KPI: klasa `tabular` (cyfry o stałej szerokości).
- Animacje: framer-motion, krótkie (120-250 ms). Listy: `initial={{opacity:0,y:4}}`.
- Ikony: `lucide-react`, rozmiar dziedziczony z komponentu (Button/IconButton ustawiają sami).
- Formatowanie: `@/lib/utils` -> `cn, fmtPLN, fmtNum, fmtPct, fmtHours, fmtDate, fmtDateTime,
  fmtRelative, plural, displayName, initials, errorMessage`.
- Strony w `(app)` są klienckie (`"use client"`), dane przez React Query. `useSearchParams`
  wymaga opakowania komponentu w `<Suspense>` (inaczej `next build` się wywali).

## Tokeny (globals.css)

Jasny i ciemny motyw (klasa `.dark` na `<html>`, wariant Tailwind `dark:`).

| Rola | Klasy |
|---|---|
| Tło aplikacji | `bg-background` |
| Karty/panele | `bg-surface`, delikatne tło: `bg-surface-muted`, popovery/dialogi: `bg-elevated` |
| Tekst | `text-foreground` (główny), `text-muted` (drugorzędny), `text-subtle` (etykiety, placeholder) |
| Obramowania | `border-border`, mocniejsze: `border-border-strong` |
| Hover/zaznaczenie neutralne | `bg-accent` (`text-accent-fg`) |
| Marka | `bg-primary text-primary-fg`, `hover:bg-primary-hover`, tint: `bg-primary-soft text-primary` |
| Akcent cyan | `bg-secondary text-secondary-fg`, tint: `bg-secondary-soft` |
| Semantyczne | `success`, `warning`, `danger`, `info`, `violet` + wersje `-soft` (np. `bg-success-soft text-success`) |
| Wykresy | `var(--chart-1)`...`var(--chart-6)`, siatka `var(--chart-grid)`; w Tailwind `fill-chart-1`, `bg-chart-2` itd. W Recharts przekazuj `stroke="var(--chart-1)"`. Kolory osi: `var(--subtle)`, tooltip: `var(--elevated)` + `var(--border)` |
| Marka stała (bez zmiany w dark) | `bg-brand-navy`, `bg-brand-navy-mid`, `bg-brand-navy-deep`, `text-brand-cyan`, `text-brand-on`, `var(--brand-grid)` - tylko dla elementów zawsze w kolorach marki (np. panel logowania) |
| Cienie | `shadow-xs`, `shadow-card`, `shadow-pop`, `shadow-dialog` |
| Promienie | `rounded-sm` 6px, `rounded-md` 8px, `rounded-lg` 10px (karty), `rounded-xl` 14px (dialogi) |
| Fonty | `font-sans` (Geist), `font-mono` (Geist Mono) |

Statusy pomysłów: `STATUS_META` z `@/components/ui/badge` (label, tone, `color` jako `var(--...)` do wykresów).

## Komponenty

### Button, IconButton (`button.tsx`)
```tsx
<Button variant="primary|secondary|outline|ghost|soft|danger|danger-soft|success|link" size="xs|sm|md|lg" loading={saving}>
  <Plus /> Nowy pomysł
</Button>
<IconButton label="Więcej" variant="ghost|outline|primary|danger" size="xs|sm|md|lg"><MoreHorizontal /></IconButton>
```
`label` w IconButton jest wymagany (aria-label + title). `buttonVariants()` do stylowania `<Link>`:
`<Link href="/x" className={buttonVariants({ variant: "secondary", size: "sm" })}>`.

### Card (`card.tsx`)
```tsx
<Card interactive?>
  <CardHeader title="Trendy" description="Ostatnie 12 mies." action={<Button size="xs" variant="ghost">...</Button>} />
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```
`CardHeader` bez propsów działa po staremu (children), `CardTitle`, `CardDescription` dostępne osobno.

### Badge, StatusBadge (`badge.tsx`)
```tsx
<Badge tone="neutral|primary|secondary|success|warning|danger|info|violet|outline" size="sm|md" dot>Tekst</Badge>
<StatusBadge status={post.status} size="sm|md" />
statusLabel("IN_PROGRESS") // "W realizacji"
roleLabel("TEAM_LEAD")     // "Lider zespołu"; też ROLE_LABELS
```

### Avatar, AvatarGroup (`avatar.tsx`)
```tsx
<Avatar user={post.author} size="xs|sm|md|lg|xl|2xl" />   // zdjęcie albo inicjały w kolorze deterministycznym
<Avatar name="Dział IT" />
<AvatarGroup users={members} max={4} />
```

### Input, Textarea, Label, Field, SearchInput (`input.tsx`)
```tsx
<Field label="Tytuł" required hint="Maks. 200 znaków" error={errors.title}>
  <Input value={v} onChange={(e) => setV(e.target.value)} inputSize="sm|md|lg" icon={<Mail />} />
</Field>
<Textarea rows={6} />
<SearchInput value={q} onValueChange={setQ} placeholder="Szukaj..." shortcut="/" inputSize="sm" />
```
`Field` automatycznie przekazuje `id` i `invalid` do dziecka.

### Select (`select.tsx`)
Natywny select (dostępność, klawiatura).
```tsx
<Select value={dept} onValueChange={setDept} placeholder="Wszystkie działy"
  options={depts.map((d) => ({ value: String(d.id), label: d.name }))} selectSize="sm|md" />
```

### Checkbox, Switch (`checkbox.tsx`)
```tsx
<Checkbox checked={v} onCheckedChange={setV} label="Aktywny" description="..." indeterminate? />
<Switch checked={v} onCheckedChange={setV} label="Administrator" size="sm|md" />
```

### Tabs (`tabs.tsx`)
Kontrolowane, treść renderujesz sam.
```tsx
<Tabs value={tab} onValueChange={setTab} variant="underline|pills" size="sm|md"
  items={[{ value: "users", label: "Osoby", count: 12, icon: <Users /> }, { value: "departments", label: "Działy" }]} />
```

### Dialog, ConfirmDialog, Sheet (`dialog.tsx`)
```tsx
<Dialog open={open} onOpenChange={setOpen} title="Edytuj użytkownika" description="..." size="sm|md|lg|xl"
  footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Anuluj</Button><Button loading={saving}>Zapisz</Button></>}>
  ...formularz...
</Dialog>

<ConfirmDialog open={o} onOpenChange={setO} title="Usunąć kategorię?" description="Tej operacji nie można cofnąć."
  tone="danger" confirmLabel="Usuń" loading={m.isPending} onConfirm={() => m.mutate()} />

<Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title="Podgląd" width="max-w-2xl"
  headerActions={<IconButton label="Otwórz"><ExternalLink /></IconButton>} footer={...}>...</Sheet>
```
Esc, klik w tło, pułapka fokusu, blokada scrolla. `data-autofocus` na elemencie = fokus startowy.

### Popover, DropdownMenu (`popover.tsx`, `dropdown-menu.tsx`)
```tsx
<DropdownMenu
  trigger={<IconButton label="Akcje"><MoreHorizontal /></IconButton>}
  align="end" side="bottom"
  items={[
    { label: "Edytuj", icon: <Pencil />, onSelect: () => edit(row) },
    { label: "Profil", icon: <User />, href: `/profile/${row.id}` },
    { type: "separator" },
    { type: "label", label: "Niebezpieczne" },
    { label: "Dezaktywuj", icon: <Ban />, danger: true, onSelect: ... },
  ]} />

<Popover trigger={<Button variant="secondary" size="sm">Filtry</Button>} align="start" className="w-72 p-3">
  {(close) => <FiltersForm onApply={close} />}
</Popover>
```
Pozycjonowanie `fixed` w portalu (nie ucina się w `overflow-hidden`), strzałki w menu.

### Tooltip (`tooltip.tsx`)
```tsx
<Tooltip content="Średni czas decyzji" side="top|bottom|left|right"><InfoIcon /></Tooltip>
```

### DataTable + prymitywy tabeli (`table.tsx`)
```tsx
const columns: Column<User>[] = [
  { key: "name", header: "Użytkownik", sortable: true, sortValue: (u) => displayName(u),
    cell: (u) => <div className="flex items-center gap-2"><Avatar user={u} size="sm" />{displayName(u)}</div> },
  { key: "points", header: "Punkty", align: "right", sortable: true, cell: (u) => <span className="tabular">{fmtNum(u.points)}</span> },
  { key: "dept", header: "Dział", className: "hidden md:table-cell" },
];
<DataTable columns={columns} data={rows} rowKey={(u) => u.id} loading={isLoading}
  pageSize={20}                                   // paginacja klienta
  // albo serwerowa: pagination={{ page, pageSize: 20, total: data.count, onPageChange: setPage }}
  // sortowanie serwerowe: sort={sort} onSortChange={setSort}
  defaultSort={{ key: "points", dir: "desc" }}
  onRowClick={(u) => open(u)} selectedKeys={sel} onSelectionChange={setSel}
  empty={<EmptyState title="Brak użytkowników" />} dense />
```
Własna tabela: `Table, THead, TBody, TR, TH, TD`.

### EmptyState, ErrorState (`empty-state.tsx`)
```tsx
<EmptyState icon={<Lightbulb />} title="Brak pomysłów" description="..." action={<Button>Dodaj</Button>} variant="plain|card" size="sm|md" />
<ErrorState onRetry={() => q.refetch()} />
```

### Skeleton (`skeleton.tsx`)
`<Skeleton className="h-4 w-32" />`, `<SkeletonText lines={3} />`.

### PageHeader (`page-header.tsx`)
Tytuł strony jest też w Topbarze (breadcrumb), więc PageHeader to nagłówek treści.
```tsx
<PageHeader title="Raporty" description="Konfigurowalny raport zgłoszeń"
  actions={<Button variant="secondary" size="sm"><Download /> CSV</Button>}>
  <Tabs ... />
</PageHeader>
```

### StatCard (`stat-card.tsx`)
```tsx
<StatCard label="Oszczędności" value={fmtPLN(v)} icon={<PiggyBank />} delta={12.4} invertDelta? hint="vs poprzedni okres" loading={isLoading} footer={<Sparkline />} />
```

### Pagination (`pagination.tsx`)
`<Pagination page={page} pageSize={20} total={count} onPageChange={setPage} compact? />` (strony od 1).

### Toast (`toast.tsx`)
`<Toaster />` jest już w root layout. Wywołanie z dowolnego miejsca:
```tsx
import { toast } from "@/components/ui";
toast.success("Zapisano zmiany");
toast.error("Nie udało się zapisać", errorMessage(err));
toast({ title: "Wymiana złożona", description: "...", variant: "info", duration: 6000, action: { label: "Cofnij", onClick } });
```

### Misc (`misc.tsx`)
`<Spinner />`, `<LoadingState label="Ładowanie..." />`, `<Kbd>Ctrl K</Kbd>`, `<Separator vertical? />`,
`<Progress value={60} tone="primary|secondary|success|warning|danger|violet" size="sm|md" showLabel />`.

### Motyw (`theme.tsx`)
`const { theme, resolved, setTheme } = useTheme();` (`"light" | "dark" | "system"`). Przełącznik jest w Topbarze.

## Powłoka i role

- `src/lib/roles.ts`: `isApprover(u)`, `isManagement(u)`, `isAdmin(u)`, `canAccess(u, pathname)`.
  `useAuth()` z `@/lib/auth` zwraca `user` oraz flagi `isApprover`, `isManagement`, `isAdmin`.
- Layout `(app)` pilnuje dostępu do route wg macierzy z PLAN.md (redirect na `/feed` + toast),
  więc strony nie muszą same sprawdzać roli (mogą ukrywać akcje).
- Sidebar i paleta Ctrl+K zawierają wszystkie route z PLAN.md sekcja 2 (konfiguracja w
  `src/components/layout/nav.ts`).
- Treść strony renderuje się w kontenerze `max-w-[1400px] mx-auto px-6 py-6`; strona nie dodaje
  własnego zewnętrznego paddingu. Pełna szerokość (np. kanban): dodaj na wrapperze `-mx-6` wg potrzeby.

## Komponenty domenowe (pomysły)

Import: `import { IdeaCard, IdeaCardSkeleton, LikeButton, BookmarkButton, CommentsLink } from "@/components/ideas";`
Typy: `import type { Post, Paginated, Notification } from "@/lib/types";`

### IdeaCard
Karta pomysłu (feed, moje pomysły, zapisane). Cała karta jest linkiem do `/ideas/[id]`
(przyciski i linki w środku działają niezależnie).
```tsx
<IdeaCard
  post={post}                 // Post z /posts/, /posts/bookmarked/, /posts/my_cases/ ...
  index={i}                   // opóźnienie animacji wejścia na liście
  hideAuthor?                 // np. "Moje pomysły"
  hideStatus?
  hideSocial?                 // bez lajka/komentarzy/zakładki
  onOpen={(p) => setPreview(p)}   // zamiast nawigacji (np. podgląd w Sheet)
  actions={<Button size="xs" variant="soft" onClick={() => resubmit(post.id)}>Zgłoś ponownie</Button>}
>
  {/* opcjonalna treść pod opisem, np. powód odrzucenia */}
  {post.rejection_reason && (
    <p className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{post.rejection_reason}</p>
  )}
</IdeaCard>
<IdeaCardSkeleton />
```
Pokazuje: autora (awatar, dział, czas), status, tytuł, skrót treści, miniaturę (+ licznik zdjęć),
pasek postępu dla IN_PROGRESS/IMPLEMENTED, kategorię, oszczędności z ankiety, lajk (optymistyczny),
komentarze, zakładkę.

**Cache:** lajk i zakładka aktualizują optymistycznie wszystkie zapytania React Query o kluczu
zaczynającym się od `["posts", ...]` (listy paginowane, infinite, tablice, szczegóły). Żeby Twoje listy
aktualizowały się same, używaj kluczy z prefiksem `"posts"`, np. `["posts", "mine", status, page]`,
`["posts", "bookmarked", page]`. Zakładka dodatkowo invaliduje `["bookmarks"]`.
Powiadomienia: dzwonek w Topbarze używa kluczy `["notifications", "unread-count"]` i
`["notifications", "recent"]`; po oznaczeniu jako przeczytane zrób
`queryClient.invalidateQueries({ queryKey: ["notifications"] })`, żeby licznik się odświeżył.

### Inne komponenty pomysłów
- `ApproveDialog`, `RejectDialog`, `ProgressDialog` (`@/components/ideas/DecisionDialogs`): `post`, `open`, `onOpenChange`, `onDone?`.
- `ApprovalTimeline`, `ImageGallery`, `SurveySummary` (`@/components/ideas/IdeaDetailParts`).
- `CommentThread` (`@/components/comments/CommentThread`): `postId`, `postAuthorId?` - odpowiedzi i @wzmianki.

### LikeButton, CommentsLink, BookmarkButton
Te same przyciski osobno: `<LikeButton post={post} size="sm|md" />`, `<CommentsLink post={post} />`,
`<BookmarkButton post={post} withLabel />`.

### Hooki (`@/lib/ideas`)
`usePosts(filters)`, `useInfinitePosts(filters)`, `usePost(id)`, `useToggleLike()`, `useToggleBookmark()`,
`useResubmit()`, `useApprove()`, `useReject()`, `useUpdateProgress()`, `useCategories()`,
`useDepartmentOptions(allowAnalyticsFallback?)` (publiczne `/departments/`; fallback na analitykę tylko gdy przekażesz `isManagement`), `useApprovers(role?)`, `useComments(id)`, `patchPostInCache(qc, {id, ...})`,
klucze `ideaKeys`.
