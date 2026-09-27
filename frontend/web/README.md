# Panel web Kaizen

Panel desktopowy do zgłaszania, akceptowania i wdrażania pomysłów usprawniających oraz do analityki i administracji. Aplikacja komunikuje się z API Django pod prefiksem `/api` przy użyciu JWT Bearer.

## Technologie

- Next.js 16 (App Router), React 19 i TypeScript
- Tailwind CSS 4, komponenty projektu w `src/components/ui/`, Geist, Lucide i Framer Motion
- Axios do komunikacji z API, TanStack React Query do pobierania danych i zarządzania stanem żądań
- Recharts do wykresów, date-fns do dat

## Uruchomienie lokalne

Uruchom backend zgodnie z [`backend/README.md`](../../backend/README.md). Następnie, z katalogu `frontend/web`:

```bash
npm install
```

Utwórz plik `.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Podaj adres serwera backendu **bez** końcowego `/api`. Domyślna wartość przy braku zmiennej to `http://localhost:8000`.

```bash
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000). Pozostałe polecenia: `npm run build`, `npm run start`, `npm run lint`, `npx tsc --noEmit`.

## Struktura katalogów

```text
src/
  app/
    (app)/               strony zalogowane i współdzielona powłoka
    login/               ekran logowania
    globals.css          tokeny i globalne style
    layout.tsx           główny layout i providery
  components/
    ui/                  design system
    layout/              nawigacja i powłoka aplikacji
    ideas/               karty i elementy pomysłów
    notifications/       elementy list powiadomień i pomysłów
    admin/, charts/      administracja i wykresy
  lib/                   klient API, autoryzacja, role, typy i funkcje domenowe
```

Nazwy w nawiasach, np. `(app)`, to grupy routingu Next.js i nie pojawiają się w adresie URL. `/` przekierowuje na `/feed`. Docelowy zakres tras opisuje [plan zespołu](../../docs/team/PLAN.md); część sekcji może być jeszcze w trakcie implementacji.

## Role i sekcje

Role konta: `EMPLOYEE` (pracownik), `TEAM_LEAD` (lider zespołu), `MANAGER` (kierownik), `DIRECTOR` (dyrektor). Administrator to konto z `is_staff` lub `is_superuser`, niezależnie od roli. Dostęp zgodnie z planem:

| Sekcja | Pracownik | Lider zespołu | Kierownik | Dyrektor | Administrator |
|---|:---:|:---:|:---:|:---:|:---:|
| `/feed` - Feed pomysłów | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/ideas/new` - Nowy pomysł | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/ideas/[id]` - Szczegóły | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/my-ideas` - Moje pomysły | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/bookmarks` - Zapisane | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/notifications` - Powiadomienia | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/profile`, `/profile/[id]` - Profil | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/leaderboard` - Ranking | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/rewards` - Nagrody | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/impact` - Mój wkład | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/approvals` - Do akceptacji |  | ✓ | ✓ | ✓ | ✓ |
| `/team` - Mój zespół |  | ✓ | ✓ | ✓ | ✓ |
| `/implementation` - Realizacja |  |  | ✓ | ✓ | ✓ |
| `/dashboard` - Przegląd organizacji |  |  | ✓ | ✓ | ✓ |
| `/departments` - Działy |  |  | ✓ | ✓ | ✓ |
| `/reports` - Raporty |  |  | ✓ | ✓ | ✓ |
| `/admin/users` - Użytkownicy |  |  |  |  | ✓ |
| `/admin/structure` - Działy i kategorie |  |  |  |  | ✓ |
| `/admin/rewards` - Nagrody i wymiany |  |  |  |  | ✓ |
| `/admin/gamification` - Punkty, odznaki, poziomy |  |  |  |  | ✓ |

## Design system

Komponenty importuj z `@/components/ui` lub bezpośrednio z modułów w `src/components/ui/`. Używaj tokenów z `src/app/globals.css` zamiast kolorów wpisywanych na sztywno. Szczegóły API komponentów, motywu jasnego i ciemnego oraz formatowania danych są w [docs/team/WEB-UI.md](../../docs/team/WEB-UI.md).
