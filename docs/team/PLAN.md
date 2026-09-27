# Rozbudowa Kaizen App - plan zespołu

Koordynator: Claude (pane w19:p1). Ten plik jest źródłem prawdy dla wszystkich agentów.
Czytaj go w całości przed rozpoczęciem pracy i wracaj do niego przy wątpliwościach.

## 0. Zasady wspólne (obowiązują każdego)

1. **Własność plików.** Edytujesz WYŁĄCZNIE pliki/katalogi przypisane Tobie w sekcji 3.
   Pracujemy równolegle w jednym katalogu roboczym, więc edycja cudzego pliku = konflikt.
   Jeśli potrzebujesz zmiany w cudzym pliku, opisz ją w swoim pliku statusu (sekcja "Prośby do innych").
2. **Bez commitów.** Nie rób `git commit`, `git stash`, `git checkout -- .`, `git reset` ani niczego,
   co zmienia historię lub cofa cudze zmiany. Użytkownik przejrzy całość i zacommituje sam.
3. **Znak em dash (U+2014) jest zabroniony** (kod, komentarze, UI, dokumentacja). Używaj "-".
4. **Język UI: polski.** Kod, nazwy zmiennych: angielski. Komunikaty błędów z backendu po polsku.
5. **Status.** Prowadź plik `docs/team/status-<twoja-nazwa>.md`: co zrobione, co w toku, zmiany kontraktu,
   prośby do innych, instrukcje testowe. Aktualizuj po każdym kamieniu milowym.
6. **Weryfikacja przed zgłoszeniem "gotowe":**
   - backend: `python manage.py check`, `makemigrations --check` (po dodaniu migracji), testy (`python manage.py test`);
   - web: `npx tsc --noEmit` i `npm run lint` w `frontend/web` (błędy w cudzych plikach tylko zgłaszasz);
   - mobile: `npx expo export --platform web` lub przynajmniej `npx eslint`/bundling bez błędów importu.
7. Next.js w tym repo to wersja 16 z breaking changes. Przed pisaniem kodu web przeczytaj właściwe
   przewodniki w `frontend/web/node_modules/next/dist/docs/` (routing, layouts, client components).
8. Nie dodawaj ciężkich zależności bez potrzeby. Nowe paczki wpisz w status z uzasadnieniem.

## 1. Kierunek produktu

Kaizen to platforma zgłaszania i wdrażania usprawnień. Dwa klienty:

- **Mobile (Expo)** - codzienne użycie przez pracowników: szybkie zgłoszenie, feed, lajki, komentarze,
  akceptacje w drodze. Cel: dopracowana, płynna, nowoczesna stylistyka, spójny design system,
  refaktor przerośniętych ekranów, lepsze stany (loading/empty/error), mikroanimacje.
- **Web (Next.js)** - pełna wersja desktop: feed z panelami bocznymi, obsługa zgłoszeń i akceptacji,
  realizacja (kanban), raporty i analityka, ranking, sklep nagród, panel administracji.
  Styl: minimalistyczny, nowoczesny (inspiracja: Linear, Vercel dashboard), gęste ale czytelne informacje,
  jasny i ciemny motyw, spójne tokeny kolorów, Geist, subtelne animacje (framer-motion).

Kolory marki: primary `#1d2b64` (navy), secondary/accent `#36d1dc` (cyan), tło `#f4f6fb`.

## 2. Role i widoki (web)

Role użytkownika (`CustomUser.role`): `EMPLOYEE`, `TEAM_LEAD`, `MANAGER`, `DIRECTOR`.
Administrator = `is_staff` lub `is_superuser` (niezależnie od roli).

| Sekcja (route)                  | EMPLOYEE | TEAM_LEAD | MANAGER | DIRECTOR | ADMIN |
|---------------------------------|:--------:|:---------:|:-------:|:--------:|:-----:|
| `/feed` Feed pomysłów            | x | x | x | x | x |
| `/ideas/new` Nowy pomysł         | x | x | x | x | x |
| `/ideas/[id]` Szczegóły          | x | x | x | x | x |
| `/my-ideas` Moje pomysły         | x | x | x | x | x |
| `/bookmarks` Zapisane            | x | x | x | x | x |
| `/notifications` Powiadomienia   | x | x | x | x | x |
| `/profile` Profil (+ `/profile/[id]`) | x | x | x | x | x |
| `/leaderboard` Ranking           | x | x | x | x | x |
| `/rewards` Nagrody (sklep)       | x | x | x | x | x |
| `/impact` Mój wkład              | x | x | x | x | x |
| `/approvals` Do akceptacji       |   | x | x | x | x |
| `/team` Mój zespół (dział)       |   | x | x | x | x |
| `/implementation` Realizacja (kanban) |   |   | x | x | x |
| `/dashboard` Przegląd organizacji |   |   | x | x | x |
| `/departments` Działy            |   |   | x | x | x |
| `/reports` Raporty               |   |   | x | x | x |
| `/admin/users` Użytkownicy       |   |   |   |   | x |
| `/admin/structure` Działy i kategorie |   |   |   |   | x |
| `/admin/rewards` Nagrody i wymiany |   |   |   |   | x |
| `/admin/gamification` Punkty, odznaki, poziomy |   |   |   |   | x |

Helpery ról (web, `src/lib/roles.ts`, właściciel: web-core):
`isApprover(u)` = TEAM_LEAD/MANAGER/DIRECTOR/admin, `isManagement(u)` = MANAGER/DIRECTOR/admin, `isAdmin(u)` = is_staff/is_superuser.
Nawigacja w Sidebarze grupowana: "Pomysły", "Zespół" (approver), "Analityka" (management), "Administracja" (admin).
Strona `/` przekierowuje na `/feed`. Brak uprawnień = redirect na `/feed` + toast.

## 3. Podział pracy i własność plików

### backend (Claude, pane w19:p2)
Własność: cały `backend/`.
Zadania (kolejność = priorytet, bo web czeka na kontrakt):
1. Kontrakt w sekcji 4 zaimplementuj jako pierwszy; jeśli coś zmieniasz, zaktualizuj `docs/team/API.md`
   (właściciel: backend) z dokładnymi kształtami odpowiedzi (przykładowy JSON dla każdego endpointu).
2. Uprawnienia: `IsAdmin`, `IsApprover`, `IsManagement` w jednym module (np. `access_control/permissions.py`
   lub reuse `analytics/permissions.py`), zakres TEAM_LEAD = własny dział.
3. Seed demo: komenda `init_demo` (idempotentna) - działy (5-6), ~30 użytkowników we wszystkich rolach
   z przypisanymi działami, ~120 pomysłów rozłożonych na 12 miesięcy we wszystkich statusach,
   ścieżki akceptacji, ankiety z oszczędnościami, lajki, komentarze, transakcje punktowe, odznaki,
   wymiany nagród. Hasło = username. Wpięcie w `entrypoint.sh` pod `SEED_DB=true`.
4. Testy API dla nowych endpointów (uprawnienia per rola!).
5. Zaktualizuj `backend/CLAUDE.md` o nowe endpointy.

### web-core (Claude, pane w19:p5)
Własność w `frontend/web/`:
- `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/login/**`
- `src/app/(app)/layout.tsx`
- `src/components/ui/**` (design system), `src/components/layout/**` (Sidebar, Topbar, CommandPalette, NotificationsBell, UserMenu)
- `src/components/dashboard/Sidebar.tsx`, `src/components/dashboard/Topbar.tsx` (przenieś do `components/layout/`, stare usuń)
- `src/components/ideas/**`, `src/components/comments/**`
- `src/lib/api.ts`, `src/lib/auth.tsx`, `src/lib/roles.ts`, `src/lib/query.tsx`, `src/lib/utils.ts`, `src/lib/ideas.ts`, `src/lib/types.ts`
- Strony: `/feed`, `/ideas/new`, `/ideas/[id]`, `/ideas/[id]/edit`
  `/approvals`, `/implementation`, `/profile`, `/profile/[id]`
  (AKTUALIZACJA: `/my-ideas`, `/bookmarks`, `/notifications` przejmuje agent webflow, patrz niżej)
Zadania:
1. **Najpierw (blokuje web-admin):** design system w `src/components/ui/`: Button, IconButton, Card, Badge,
   StatusBadge (statusy postów), Avatar, Input, Textarea, Select, Checkbox/Switch, Tabs, Dialog, Sheet (drawer),
   DropdownMenu, Tooltip, Table (prosty DataTable z sortowaniem i paginacją), EmptyState, Skeleton,
   PageHeader, StatCard, Toast (provider + hook), Pagination, SearchInput. Tokeny w `globals.css` + dark mode.
   Wszystko udokumentuj krótko w `docs/team/WEB-UI.md` (import, propsy, przykład). Następnie powłoka:
   `(app)/layout.tsx` z role guardami (mapa route -> wymagany poziom), Sidebar (grupy, zwijany, badge licznika
   akceptacji), Topbar (breadcrumb/tytuł, wyszukiwarka Ctrl+K, dzwonek powiadomień, menu użytkownika, przełącznik motywu).
   Nawigacja musi już zawierać WSZYSTKIE route z sekcji 2 (także te robione przez web-admin).
2. Feed: układ 3-kolumnowy na desktop (filtry/kategorie | lista kart | panel: mój poziom i punkty, top 5 rankingu,
   trendujące pomysły). Filtry: szukaj, kategoria, status, dział, sortowanie; infinite scroll lub paginacja.
   Karta: autor, dział, status, kategoria, tytuł, skrót treści, miniatura, lajk (optymistyczny), komentarze, zakładka.
3. Szczegóły pomysłu: galeria zdjęć (przed/po), treść, oś czasu akceptacji, ankieta i oszczędności,
   postęp wdrożenia, komentarze z odpowiedziami i @wzmiankami, akcje zależne od roli (akceptuj/odrzuć z powodem,
   aktualizuj postęp, edytuj/ponów zgłoszenie).
4. Nowy pomysł / edycja: formularz z walidacją, kategoria, kierownik, zdjęcia (base64 jak w mobile), ankieta opcjonalna.
5. `/approvals`: skrzynka akceptacji (lista + podgląd w Sheet), szybkie akcje, filtr etapu.
6. `/implementation`: kanban SUBMITTED / IN_PROGRESS / IMPLEMENTED z postępem, terminem, kosztem; zmiana postępu.
7. `/my-ideas`, `/bookmarks`, `/notifications`, `/profile`, `/profile/[id]`.

### web-admin (Codex, pane w19:p3)
Własność w `frontend/web/`:
- Strony: `/dashboard`, `/departments`, `/reports`, `/impact`, `/team`, `/leaderboard`, `/rewards`, `/admin/**`
- `src/components/charts/**`, `src/components/dashboard/**` (poza Sidebar.tsx i Topbar.tsx), `src/components/admin/**`,
  `src/components/gamification/**`, `src/components/reports/**`
- `src/lib/analytics.ts`, `src/lib/admin.ts`, `src/lib/gamification.ts`
Zadania:
1. Warstwa API (`lib/admin.ts`, `lib/gamification.ts`, rozszerzenie `lib/analytics.ts`) wg sekcji 4, typy TS.
   Używaj istniejącego klienta `api` z `@/lib/api` i React Query (`@tanstack/react-query`).
2. Po publikacji `docs/team/WEB-UI.md` używaj WYŁĄCZNIE komponentów z `@/components/ui/*` i tokenów z globals.css
   (żadnych hardcodowanych kolorów hex w klasach). Do tego czasu możesz budować logikę i układ.
3. `/dashboard`: KPI (zgłoszenia, wdrożenia, oszczędności, uczestnictwo, średni czas akceptacji), trendy,
   lejek statusów, top pomysły, top działy, zaległe akceptacje; filtr okresu i działu.
4. `/departments`, `/team` (dział lidera: członkowie, ich aktywność, pomysły w toku), `/reports`
   (konfigurowalny raport: okres, dział, kategoria, status; tabela + wykresy; eksport CSV/XLSX przez `/analytics/export/`; wydruk).
5. `/leaderboard`: ranking osób i działów, okres (tydzień/miesiąc/kwartał/wszystko), podium top 3, moja pozycja.
6. `/rewards`: sklep nagród (saldo punktów, katalog, wymiana z potwierdzeniem, historia wymian i transakcji, odznaki, poziom).
7. `/impact`: rozbuduj (heatmapa, moje oszczędności, odznaki, historia punktów).
8. `/admin/users` (tabela z filtrami, tworzenie, edycja roli/działu/aktywności/admina, reset hasła, ręczne punkty),
   `/admin/structure` (działy i kategorie CRUD), `/admin/rewards` (katalog CRUD + kolejka wymian: akceptuj/wydaj/odrzuć),
   `/admin/gamification` (reguły punktowe, odznaki, poziomy).

### webflow (OpenCode, pane w19:p7) - proste strony listowe
Własność w `frontend/web/`: strony `/my-ideas`, `/bookmarks`, `/notifications` oraz `src/components/notifications/**`
(poza dzwonkiem w Topbarze, który należy do webcore) i `src/lib/notifications.ts`.
Zadania:
1. Czekasz na `docs/team/WEB-UI.md` (design system od webcore); do tego czasu przygotuj warstwę API
   (`lib/notifications.ts`) i szkielety stron na istniejących komponentach.
2. Karta pomysłu pochodzi z `src/components/ideas/**` (webcore) - używaj jej, nie duplikuj.
   Dopóki jej nie ma, użyj prostego placeholdera i podmień później.
3. `/my-ideas`: zakładki statusów (wszystkie, do weryfikacji, w realizacji, wdrożone, odrzucone z powodem),
   przycisk ponownego zgłoszenia dla odrzuconych (`POST /posts/{id}/resubmit/`).
4. `/bookmarks`: lista zapisanych (`GET /posts/bookmarked/`), usuwanie z zapisanych.
5. `/notifications`: grupowanie po dniach (Dziś, Wczoraj, Wcześniej), filtr nieprzeczytane, oznacz jako
   przeczytane / wszystkie, klik prowadzi do `/ideas/[id]`.

### qa (OpenCode, pane w19:p8)
Własność: `docs/team/TESTING.md`, `scripts/**` (skrypty smoke/e2e), `docker-compose.yml`.
Zadania:
1. Uruchom środowisko: backend (docker-compose lub `backend/venv`), web (`npm run dev` w `frontend/web`),
   opisz dokładne kroki w `TESTING.md`. Nie edytuj kodu aplikacji; błędy zgłaszaj w `docs/team/status-qa.md`
   z plikiem, krokami odtworzenia i wskazaniem właściciela wg sekcji 3.
2. Scenariusze testowe per rola (EMPLOYEE, TEAM_LEAD, MANAGER, DIRECTOR, ADMIN) dla web i mobile:
   zgłoszenie -> akceptacja wieloetapowa -> realizacja -> punkty/odznaki -> wymiana nagrody.
3. Skrypt smoke API (`scripts/smoke_api.py`): logowanie każdą rolą i sprawdzenie kodów odpowiedzi
   (200/403) wszystkich endpointów z sekcji 4 zgodnie z macierzą uprawnień.
4. Gdy strony powstaną: test w przeglądarce (dostępne narzędzia browser_*), zrzuty, lista usterek.

### mobile-a (Codex, pane w19:p4)
Własność w `frontend/mobile/src/`:
- `theme/**`, `components/ui/**` (nowe prymitywy), `components/Button/**`, `components/Input/**`, `components/Text/**`,
  `components/Navigation/**`, `components/Auth/**`, `components/PostList/**`, `components/Search/**`,
  `components/OptionPills/**`, `components/CreatePost/**`, `components/ImagePicker/**`, `components/ManagerPicker/**`,
  `components/KeyboardAwareScrollView/**`, `components/Badges/**`
- `app/_layout.jsx`, `app/(auth)/**`, `app/(tabs)/_layout.jsx`, `app/(tabs)/index.jsx`, `app/(tabs)/create.jsx`
Zadania:
1. **Najpierw (blokuje mobile-b):** tokeny w `theme/` (kolory rozszerzone o semantyczne: surface, border, textMuted,
   success/warning/danger + tła statusów; spacing, radius, typography, shadows/elevation) z zachowaniem
   kompatybilności `theme/colors.js` (istniejące importy muszą działać). Prymitywy w `components/ui/`:
   Card, Avatar, Chip, StatusPill, IconButton, EmptyState, ErrorState, Skeleton, Divider, SectionHeader,
   ScreenContainer, PressableScale (animacja wciśnięcia przez `Animated`). Opis w `docs/team/MOBILE-UI.md`.
2. Tab bar: nowoczesny (wyraźny aktywny stan, przycisk "+" wyróżniony), obsługa ról TEAM_LEAD/MANAGER/DIRECTOR
   (tab akceptacji widoczny dla wszystkich approverów, nie tylko MANAGER).
3. Ekrany logowania, feed (karty, skeletony, pull-to-refresh, optymistyczny lajk, puste stany, filtry),
   tworzenie pomysłu (kroki/sekcje, walidacja, lepszy picker zdjęć i kierownika).
4. Animacje: wbudowane `Animated`/`LayoutAnimation`. Dozwolone nowe paczki tylko przez `npx expo install`:
   `expo-haptics`, `expo-linear-gradient` (wymagają przebudowy dev clienta - zapisz to w statusie).

### mobile-b (Codex, pane w19:p6)
Własność w `frontend/mobile/src/`:
- `app/post/**`, `components/PostDetail/**`, `components/Comments/**`, `components/RejectionReasonModal/**`,
  `app/notifications/**`, `components/Notifications/**`, `app/(tabs)/profile.jsx`, `app/profile-edit.jsx`,
  `app/(tabs)/ranking.jsx`, `components/Gamification/**`, `app/bookmarks.jsx`, `app/(tabs)/my-cases.jsx`,
  `app/(tabs)/menu.jsx`, `server/services/**`, `utils/**`, `store/**`
- nowe ekrany: `app/rewards.jsx` (sklep nagród), `app/badges.jsx` jeśli potrzebne
Zadania:
1. Refaktor `app/post/[id].jsx` (1394 linii) na mniejsze komponenty w `components/PostDetail/` bez zmiany
   zachowania. Na start używasz `theme/colors.js`; gdy mobile-a opublikuje `docs/team/MOBILE-UI.md`,
   przechodzisz na nowe tokeny i prymitywy z `components/ui/`.
2. Nowoczesny wygląd: szczegóły pomysłu, komentarze, ankiety, powiadomienia (grupowanie po dniach, swipe/mark read),
   profil (statystyki, poziom, odznaki), ranking (podium, okresy), zakładki, "Moje sprawy" dla wszystkich approverów
   (użyj `GET /posts/approvals_queue/` gdy backend go wystawi), menu.
3. Sklep nagród w mobile (`/gamification/rewards/`, redeem, historia) - serwis w `server/services/gamificationService.js`.
4. Serwisy API rozszerzaj wg sekcji 4 (mobile-a potrzebuje filtrów feedu: dopisz funkcje w postsService
   na prośbę z jego statusu).

## 4. Kontrakt API (prefiks `/api`, JWT Bearer)

Istniejące (bez zmian w kształcie, tylko rozszerzenia): auth `/access/*`, `/posts/`, `/categories/`, `/users/`,
`/comments/`, `/notifications/`, `/gamification/*`, `/analytics/*`. Szczegóły i przykłady: `docs/team/API.md` (backend).

Paginacja list: `{count, next, previous, results}` (`page`, `page_size`).
Wspólne filtry analityki: `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&department=<id>&category=<id>`.

### Użytkownicy
- `GET /users/me/` - dodatkowo: `is_superuser`, `department`, `department_name`, `permissions: {is_admin, is_approver, is_management}`.
- `GET /users/{id}/` - profil publiczny: dane + `department_name`, `stats {ideas, implemented, likes_received, savings}`,
  `gamification {total_points, level, badges[]}`.
- `GET /users/?search=&department=&role=` - lista publiczna (paginowana).
- `GET /users/approvers/` - osoby z rolą approvera (do wyboru przy zgłoszeniu; `managers/` zostaje).

### Pomysły
- `GET /posts/` filtry: `search, category, status, department (autora), author, mine, date_from, date_to,
  ordering=newest|oldest|likes|comments|savings`. Pole `author` zawiera `department_name`.
  Management może filtrować także `status=TO_VERIFY|CANCELLED` (pracownik nie).
- `GET /posts/approvals_queue/` - posty, gdzie zalogowany user jest approverem bieżącego etapu PENDING
  (+ `?stage=TEAM_LEAD|MANAGER|DIRECTOR`), paginowane. `GET /posts/approvals_queue/count/` -> `{count}`.
- `GET /posts/pipeline/?department=` (management) -> `{SUBMITTED: [...], IN_PROGRESS: [...], IMPLEMENTED: [...]}`
  (lekka reprezentacja: id, title, author, category, progress_percent, deadline, estimated_cost, savings).
- `GET /posts/trending/?limit=5` - najwięcej interakcji w 14 dniach.
- Istniejące akcje bez zmian: approve, reject, resubmit, like, bookmark, bookmarked, progress, comments, survey, my_cases.

### Gamifikacja
- `GET /gamification/leaderboard/?period=week|month|quarter|all&scope=users|departments|categories&department=&limit=`
  - wiersze z `rank`, a dla scope=users także `me: {rank, points}`.
- `GET /gamification/badges/` - wszystkie aktywne odznaki z `earned` i `awarded_at` dla zalogowanego.
- `GET /gamification/users/{id}/` - publiczny profil gamifikacji.
- Istniejące: `me/`, `transactions/`, `rewards/`, `rewards/{id}/redeem/`, `rewards/my-redemptions/`.

### Analityka (management; `/team/` także TEAM_LEAD dla własnego działu)
- Istniejące: `overview/, departments/, categories/, trends/, heatmap/, me/impact/, export/` + wspólne filtry.
- `GET /analytics/approvals/` - lejek i SLA: liczba PENDING per etap, średni i mediana czasu decyzji (h),
  przeterminowane (PENDING > 7 dni), odsetek akceptacji.
- `GET /analytics/top-ideas/?by=savings|likes|comments&limit=10`.
- `GET /analytics/team/` - dla działu zalogowanego (lub `?department=` dla management): członkowie z liczbą
  pomysłów, wdrożeń, punktów, ostatnią aktywnością + podsumowanie działu.
- `GET /analytics/participation/` - odsetek aktywnych użytkowników per miesiąc i per dział.

### Administracja (tylko admin, prefiks `/api/admin/`)
- `users/` CRUD (filtry `search, role, department, is_active, is_staff`), `POST users/{id}/set_password/ {password}`,
  `POST users/{id}/adjust_points/ {points, reason}` (transakcja punktowa ręczna).
- `departments/` CRUD (+ `member_count`, `lead` opcjonalnie), `categories/` CRUD (+ `post_count`).
- `rewards/` CRUD, `redemptions/?status=` lista + `POST redemptions/{id}/approve|deliver|reject/ {note}`
  (reject zwraca punkty).
- `point-rules/` list + PATCH, `badges/` CRUD, `levels/` CRUD.
- `GET admin/stats/` - liczniki dla nagłówka panelu (użytkownicy aktywni, oczekujące wymiany, kategorie, działy).

## 5. Etapy i synchronizacja

- **Etap 1 (równolegle):** backend kontrakt + `API.md`; web-core design system + `WEB-UI.md` + powłoka;
  web-admin warstwa API + logika stron; mobile-a tokeny + prymitywy + `MOBILE-UI.md`; mobile-b refaktor post detail.
- **Etap 2:** strony i ekrany na docelowym design systemie; backend seed demo + testy.
- **Etap 3:** koordynator zleca review krzyżowe (Codex przegląda Claude i odwrotnie), poprawki, test end-to-end
  na danych demo, instrukcja testowa dla użytkownika w `docs/team/TESTING.md`.

Konta testowe (hasło = login): `admin` (admin), `user1234` (EMPLOYEE), `lead1` (TEAM_LEAD), `manager1` (MANAGER),
`director1` (DIRECTOR) + konta z `init_demo`.

## 6. Aktualizacje własności (etap 3)

- Strony i komponenty web-admin (`/dashboard`, `/departments`, `/team`, `/reports`, `/impact`, `/leaderboard`,
  `/rewards`, `/admin/**`, `src/components/{admin,charts,dashboard,gamification,reports}/**`,
  `src/lib/{admin,analytics,gamification}.ts`) przechodzą pod webcore na czas dopracowania wizualnego
  (agent webadmin zakończył pracę, limit Codex wyczerpany).
- Webflow zachowuje `/my-ideas`, `/bookmarks`, `/notifications`.
