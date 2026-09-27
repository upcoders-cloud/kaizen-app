# Kaizen API - kontrakt (backend)

Właściciel: backend. Stan na: 2026-09-26. Wszystkie endpointy opisane poniżej **działają** (zweryfikowane
na lokalnej bazie; statusy HTTP per rola sprawdzone testami). Zmiany kontraktu zapisuję w sekcji "Changelog" na końcu.

## 0. Konwencje

- Prefiks: `/api`, autoryzacja: `Authorization: Bearer <access>`. Wszystko poniżej wymaga zalogowania (401 bez tokena).
- Paginacja (tam gdzie zaznaczono "paginowane"): `?page=1&page_size=20` (maks. 100), odpowiedź:
  `{"count": 42, "next": "http://.../?page=2", "previous": null, "results": [...]}`.
- Błędy: `{"detail": "Komunikat po polsku"}` (400/403/404/409) albo błędy walidacji pól `{"pole": ["komunikat"]}`.
- **409** przy konflikcie z równoległą zmianą (blokada bazy, np. dwie decyzje o tym samym pomyśle naraz):
  `{"detail": "Operacja koliduje z inną, równoległą zmianą. Spróbuj ponownie."}`. Stan nie został zmieniony,
  klient może odświeżyć dane i ponowić akcję.
- Brak uprawnień roli = **403**. Kwoty pieniężne w modelach (`estimated_cost`, `estimated_financial_savings`) są
  stringami dziesiętnymi (`"2200.00"`); wszystkie wartości wyliczane w analityce (`savings`, `savings_money` itd.) są liczbami.
- Daty: `YYYY-MM-DD`, znaczniki czasu ISO 8601 UTC.

### Logowanie (`POST /access/token/`, `POST /access/token/code/`)
Dotychczasowe pola (`access, id, username, nickname, email, first_name, last_name, gender, role, avatar_url`)
plus, addytywnie, to samo co w `/users/me/`:
```json
{ "is_staff": false, "is_superuser": false, "department": 1, "department_name": "Produkcja",
  "permissions": { "is_admin": false, "is_approver": true, "is_management": false } }
```

### Język komunikatów
Backend działa z `LANGUAGE_CODE = 'pl'`: komunikaty walidacji DRF/Django są po polsku (np. `"To pole jest wymagane."`,
`"Nie podano danych uwierzytelniających."`), a 404 ma `{"detail": "Nie znaleziono."}`.
Klient nie powinien porównywać tekstów, tylko kody HTTP i pola (`code` w DRF jest stały, np. `token_not_valid`).

### Role i uprawnienia

| Helper | Warunek |
|---|---|
| admin | `is_staff` lub `is_superuser` |
| approver | rola `TEAM_LEAD` / `MANAGER` / `DIRECTOR` lub admin |
| management | rola `MANAGER` / `DIRECTOR` lub admin |

Backend liczy te flagi i zwraca je w `GET /users/me/` jako `permissions` - frontend nie musi ich wyliczać sam.

### Obiekt `UserPublic` (wszędzie: autor, approver, aktor powiadomienia, ranking)

```json
{
  "id": 5, "nickname": "user3456", "first_name": "Piotr", "last_name": "Zielinski",
  "username": "user3456", "is_staff": false, "role": "EMPLOYEE", "avatar_url": null,
  "department": 1, "department_name": "Produkcja"
}
```
`department` i `department_name` są nowe (mogą być `null`).

### Obiekt `PostLight` (kanban, trendy, top pomysły, zespół)

```json
{
  "id": 5, "title": "Automatyczne raporty produkcyjne", "status": "SUBMITTED",
  "author": { "...UserPublic" : "..." },
  "category": 2, "category_name": "Usprawnienie Procesu",
  "created_at": "2026-09-26T20:49:32.602298Z",
  "likes_count": 3, "comments_count": 5,
  "progress_percent": 0, "deadline": "2026-11-25", "estimated_cost": "15500.00",
  "savings": 720.0, "assigned_manager": 10, "thumbnail_url": null,
  "can_update_progress": true
}
```
`savings` = `survey.estimated_financial_savings` jako liczba albo `null` (brak ankiety).
`can_update_progress` = czy zalogowany może wywołać `PATCH /posts/{id}/progress/`.

---

## 1. Użytkownicy

### `GET /users/me/` (każdy)
Rozszerzone o `is_superuser`, `permissions`. `PATCH` bez zmian (nickname, imię, nazwisko, gender, avatar base64).
```json
{
  "id": 10, "nickname": "manager1", "username": "manager1", "email": "manager1@example.com",
  "first_name": "Krzysztof", "last_name": "Mazur", "gender": "male",
  "is_staff": false, "is_superuser": false, "role": "MANAGER",
  "department": 5, "department_name": "BHP", "avatar_url": null,
  "permissions": { "is_admin": false, "is_approver": true, "is_management": true }
}
```

### `GET /users/?search=&department=&role=` (każdy, paginowane)
Tylko aktywni użytkownicy, `results` = `UserPublic[]`, sortowanie: nazwisko, imię.
`search` przeszukuje imię, nazwisko, nick i login.

### `GET /users/{id}/` (każdy) - profil publiczny
```json
{
  "id": 5, "nickname": "user3456", "first_name": "Piotr", "last_name": "Zielinski", "username": "user3456",
  "is_staff": false, "role": "EMPLOYEE", "avatar_url": null, "department": 1, "department_name": "Produkcja",
  "date_joined": "2026-01-10T08:00:00Z",
  "stats": { "ideas": 7, "implemented": 2, "likes_received": 31, "savings": 22000.2 },
  "gamification": {
    "total_points": 177,
    "level": { "id": 2, "name": "Innowator", "min_points": 100, "order": 2, "color": "#38bdf8", "icon": "zap" },
    "badges": [
      { "id": 1, "code": "first-idea", "name": "Pierwszy pomysł", "icon": "edit-3", "tier": "BRONZE",
        "awarded_at": "2026-03-01T10:00:00Z" }
    ]
  }
}
```
`stats.savings` = suma oszczędności z ankiet wdrożonych (IMPLEMENTED) pomysłów użytkownika.

### `GET /departments/` (każdy zalogowany, bez paginacji)
Słownik aktywnych działów do filtrów (feed, raporty). Parametry paginacji (`page_size`) są ignorowane.
```json
[ { "id": 6, "name": "Administracja" }, { "id": 5, "name": "BHP" } ]
```
Pełne dane działów (lider, liczba członków, nieaktywne) są w `/admin/departments/` (tylko admin).

### `GET /users/approvers/?role=&department=&search=` (każdy, bez paginacji)
Aktywni użytkownicy z rolą TEAM_LEAD/MANAGER/DIRECTOR (`role` zawęża do jednej). Zwraca `UserPublic[]`,
sortowanie: rola, nazwisko. `GET /users/managers/?role=&search=` działa jak dotychczas.

---

## 2. Pomysły (`/posts/`)

Pełny obiekt posta (`PostSerializer`) bez zmian w kształcie; nowe pola: `assigned_team_lead` (id lub null),
`author.department`, `author.department_name`.

**Widoczność po ID** (`GET /posts/{id}/` i wszystkie akcje na konkretnym poście: `comments`, `like`, `bookmark`,
`survey`, `approve`, `reject`, `resubmit`, `progress`, `PATCH`, `DELETE`):
- `SUBMITTED` / `IN_PROGRESS` / `IMPLEMENTED` - każdy (odczyt także bez logowania, jak dotychczas);
- `TO_VERIFY` / `CANCELLED` - tylko autor, osoba z łańcucha akceptacji tego posta (dowolny etap, także
  zakończony), management i admin;
- pozostali dostają **404** `{"detail": "Nie znaleziono."}` (tak samo jak nieistniejące ID).

Tak samo filtrowane są `GET /comments/` i `GET /likes/` (tylko rekordy pod widocznymi postami), a
`POST /likes/` dla niewidocznego posta zwraca 400 `{"post": ["Nie znaleziono pomysłu."]}`.
Klienci muszą wysyłać token także przy `GET /posts/{id}/comments/` (inaczej autor i akceptujący dostaną 404
dla pomysłów w weryfikacji).

Pola dodane na prośbę web-core:
- `image_items[]` ma `type`: `GENERAL` / `BEFORE` / `AFTER`, np.
  `{"id": 12, "url": "http://.../kaizen_attachments/2026/09/26/ab12.png", "type": "BEFORE"}`;
- `can_update_progress` (bool) - jak w `PostLight`: czy zalogowany może wołać `PATCH progress/`.

Zapis zdjęć (`images` w POST/PATCH, tylko do zapisu): każdy element to **string base64** (jak dotychczas w mobile,
typ `GENERAL`, dozwolony prefiks `data:image/...;base64,`) **albo obiekt** `{"image": "<base64>", "type": "BEFORE"}`.
Można mieszać oba formaty w jednej liście. Nieznany typ -> 400 w polu `images`. `remove_images: [id, ...]` bez zmian.

Wzmianki w komentarzach: `@nick` z literami, cyframi, `_`, `-` i kropką w środku (np. `@dawid.baran`),
2-50 znaków. Kropka na końcu (koniec zdania) nie wchodzi do nicku, a adres e-mail (`jan@firma.pl`) nie jest wzmianką.

`assigned_team_lead` (POST/PATCH) musi być liderem (rola TEAM_LEAD) z działu autora, inaczej 400
`{"assigned_team_lead": ["Lider zespołu musi należeć do działu autora."]}`.

### `GET /posts/` (paginowane) - filtry
| Parametr | Opis |
|---|---|
| `search` | tytuł lub treść (icontains) |
| `category` | id kategorii |
| `department` | id działu **autora** |
| `author` | id autora |
| `mine=true` | tylko moje pomysły |
| `date_from`, `date_to` | data zgłoszenia (włącznie) |
| `status` | jeden status lub lista po przecinku (`SUBMITTED,IN_PROGRESS`) albo `all` |
| `ordering` | `newest` (domyślnie) / `oldest` / `likes` / `comments` / `savings` |

Widoczność statusów:
- bez `status`: tylko `SUBMITTED`, `IN_PROGRESS`, `IMPLEMENTED` (jak dotychczas, feed);
- `TO_VERIFY` i `CANCELLED` może filtrować **management** (wszystkie posty) oraz każdy z `mine=true` (tylko swoje);
- niedozwolony status jest ignorowany (wraca domyślny zestaw publiczny);
- `status=all` = wszystkie statusy dozwolone dla pytającego (np. "Moje pomysły": `?mine=true&status=all`).

### `GET /posts/approvals_queue/?stage=TEAM_LEAD|MANAGER|DIRECTOR` (każdy, paginowane)
Posty `TO_VERIFY`, w których zalogowany jest approverem **bieżącego** etapu (pierwszy PENDING wg `order`).
Kolejność: najstarsze najpierw. `results` = pełne posty (z `approvals` i `current_stage`).
Dla nie-approvera zawsze pusta lista.

### `GET /posts/approvals_queue/count/?stage=` (każdy)
```json
{ "count": 2 }
```
Do badge'a w Sidebarze / tab barze.

### `GET /posts/pipeline/?department=&category=&mine_only=true&limit=100` (management)
```json
{
  "SUBMITTED":   [ { "...PostLight": "..." } ],
  "IN_PROGRESS": [ { "...PostLight": "..." } ],
  "IMPLEMENTED": [ { "...PostLight": "..." } ]
}
```
Kolumny: SUBMITTED od najnowszych, IN_PROGRESS wg terminu (najbliższy najpierw), IMPLEMENTED od najnowszych.
`limit` = maks. elementów w kolumnie (1-500). `mine_only` = tylko posty przypisane do mnie (kierownik lub dyrektor).

### `GET /posts/trending/?limit=5&days=14` (każdy)
`PostLight[]` + `score` (lajki + komentarze w oknie `days`). Gdy aktywnych postów jest za mało, lista jest
uzupełniana najnowszymi (z `score: 0`).
```json
[ { "id": 5, "title": "Automatyczne raporty produkcyjne", "...": "...PostLight", "score": 8 } ]
```

### Akcje istniejące (kształty bez zmian)
`approve`, `reject`, `resubmit`, `like`, `bookmark`, `bookmarked`, `comments`, `survey`, `my_cases`, `progress`.

Zmiany zachowania (rozszerzenia):
- **Etap lidera zespołu.** Gdy autor ma rolę `EMPLOYEE`, a jego dział ma lidera (`Department.lead`, ustawiany
  w `/admin/departments/`) albo w POST podano `assigned_team_lead` (id użytkownika z rolą TEAM_LEAD), ścieżka to
  `TEAM_LEAD (order 1) -> MANAGER (order 2) [-> DIRECTOR]`. Lider akceptuje przez `POST /posts/{id}/approve/`
  bez dodatkowych pól (koszt/termin podaje dopiero kierownik) i odrzuca przez `reject` z `rejection_reason`.
  Bez lidera ścieżka jest jak dotychczas (MANAGER -> ewentualnie DIRECTOR).
- `my_cases` dla approvera zwraca teraz tylko posty, w których jest approverem **bieżącego** etapu
  (wcześniej kierownik widział też posty czekające jeszcze na lidera). Domyślnie nadal **tablica**, ale
  maksymalnie 200 najnowszych; z `?page=N` (opcjonalnie `page_size`) odpowiedź jest paginowana
  `{count, next, previous, results}`.
- `PATCH /posts/{id}/progress/` może wykonać przypisany kierownik, przypisany dyrektor lub admin
  (wcześniej tylko kierownik). Użyj `can_update_progress` z `PostLight`.

---

### `GET /notifications/`
Kształt elementów bez zmian, ale `post_title` i `comment_text` są `null`, gdy odbiorca nie może już oglądać
pomysłu (np. utracił dostęp do ukrytego `TO_VERIFY`/`CANCELLED`); `post_id` zostaje, szczegóły dają 404.
Wzmianka (`MENTION`) powstaje tylko dla osoby, która może czytać pomysł. Domyślnie **tablica** maksymalnie 200 najnowszych powiadomień; z `?page=N`
(opcjonalnie `page_size`, maks. 100) odpowiedź paginowana `{count, next, previous, results}`.
`unread_count/`, `mark_read`, `mark_all_read` liczą wszystkie powiadomienia (bez limitu 200).

---

## 3. Gamifikacja (`/gamification/`)

### `GET /gamification/leaderboard/?period=week|month|quarter|all&scope=users|departments|categories&department=&limit=20`
Okresy: week = 7 dni, month = 30 dni, quarter = 90 dni, all = saldo punktów. `department` działa dla `scope=users`.
`limit` maks. 100. Ranking sportowy (remis = ta sama pozycja). **Odpowiedź jest teraz obiektem** (mobile już
obsługuje `data.results`):
```json
{
  "results": [
    {
      "rank": 1,
      "user": { "...UserPublic": "..." },
      "points": 77,
      "level": { "id": 1, "name": "Junior Innowator", "min_points": 0, "order": 1, "color": "#94a3b8", "icon": "feather" },
      "streak": 1
    }
  ],
  "me": { "rank": 7, "points": 11 }
}
```
`me.rank` = `null` gdy brak punktów w okresie. Dla `scope=departments`:
`{"results": [{"rank": 1, "department_id": 1, "department": "Produkcja", "points": 135}], "me": null}`,
dla `scope=categories`: `{"results": [{"rank": 1, "category_id": 2, "category": "Usprawnienie Procesu", "points": 75}], "me": null}`.

### `GET /gamification/badges/` - wszystkie aktywne odznaki ze stanem zalogowanego
```json
[
  {
    "id": 1, "code": "first-idea", "name": "Pierwszy pomysł", "description": "Zgłoś swój pierwszy pomysł",
    "icon": "edit-3", "criteria_type": "POST_COUNT", "tier": "BRONZE", "order": 1,
    "threshold": 1, "value": 0, "progress": 0.0, "earned": false, "awarded_at": null
  }
]
```

### `GET /gamification/users/{id}/` - publiczny profil gamifikacji
Jak `/gamification/me/`, plus `user`; `badges` zawiera **tylko zdobyte** odznaki (format jak w `/badges/`).
```json
{
  "user": { "...UserPublic": "..." },
  "points": 177, "rank": 3, "current_streak": 2, "longest_streak": 9,
  "level": { "id": 2, "name": "Innowator", "min_points": 100, "order": 2, "color": "#38bdf8", "icon": "zap" },
  "next_level": { "id": 3, "name": "Senior Innowator", "min_points": 300, "order": 3, "color": "#6366f1", "icon": "star" },
  "level_progress": 0.385, "points_to_next": 123,
  "badges": [ { "id": 1, "code": "first-idea", "...": "...", "earned": true, "awarded_at": "2026-03-01T10:00:00Z" } ]
}
```

### Istniejące (bez zmian)
`me/` (w `badges[]` doszło pole `awarded_at`), `transactions/` (ostatnie 100, tablica), `rewards/` (tablica),
`POST rewards/{id}/redeem/` (201 z wymianą; 400 `{"detail": "Za mało punktów na tę nagrodę."}` /
`"Nagroda wyczerpana."` / `"Nagroda jest niedostępna."`), `rewards/my-redemptions/` (tablica).
Saldo przy wymianie liczone jest z ledgera pod blokadą użytkownika, więc równoległe wymiany nie zejdą poniżej zera. Transakcje mogą mieć nową akcję
`MANUAL_ADJUSTMENT` ("Korekta ręczna", `metadata.reason`).

---

## 4. Analityka (`/analytics/`)

**Wspólne filtry** (wszystkie endpointy poniżej oprócz `heatmap` i `me/impact`):
`?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&department=<id>&category=<id>&status=<STATUS>`.
Filtrują posty po dacie zgłoszenia, dziale autora, kategorii i statusie.

Dostęp: management (403 dla pozostałych). Wyjątki:
- `team/` - każdy approver (TEAM_LEAD też, zawsze własny dział);
- `me/impact/` - każdy zalogowany (własne dane);
- `heatmap/?year=` - **każdy zalogowany, tylko własna aktywność**. Parametr `?user=<id>` (cudza heatmapa) jest
  dostępny tylko dla management; dla pozostałych 403 `{"detail": "Brak uprawnień do cudzej heatmapy."}`.
  Odpowiedź: `{"year": 2026, "days": {"2026-03-02": 3}, "total": 41}`.

### Istniejące - kształty bez zmian, doszły filtry
`overview/`, `departments/`, `categories/`, `trends/?granularity=month|quarter` (bez `date_from`: ostatnie 12 mies.),
`heatmap/?year=&user=`, `me/impact/`.

### `GET /analytics/export/?report=&fmt=csv|xlsx` + wspólne filtry
`report`: `overview`, `departments`, `categories`, `trends`, **`ideas`** (nowy: lista pomysłów z kolumnami ID, Tytuł,
Status, Autor, Dział, Kategoria, Data zgłoszenia, Koszt, Oszczędności, Postęp, Lajki, Komentarze).
Zwraca plik (`Content-Disposition: attachment`). CSV rozdzielany `;`, UTF-8 z BOM.

### `GET /analytics/approvals/` - lejek i SLA
```json
{
  "pending_by_stage": { "TEAM_LEAD": 0, "MANAGER": 3, "DIRECTOR": 0 },
  "pending_total": 3,
  "decided_total": 7,
  "avg_decision_hours": 31.4,
  "median_decision_hours": 22.0,
  "overdue_count": 1,
  "sla_days": 7,
  "approval_rate": 85.7,
  "by_stage": [
    { "stage": "TEAM_LEAD", "pending": 0, "approved": 0, "rejected": 0, "avg_decision_hours": 0.0 },
    { "stage": "MANAGER", "pending": 3, "approved": 5, "rejected": 1, "avg_decision_hours": 35.2 },
    { "stage": "DIRECTOR", "pending": 0, "approved": 1, "rejected": 0, "avg_decision_hours": 12.0 }
  ],
  "overdue": [
    { "post_id": 12, "title": "Nowe maty", "stage": "MANAGER", "approver_id": 10,
      "approver_name": "Krzysztof Mazur", "waiting_hours": 190.5 }
  ]
}
```
Czas decyzji = od rozpoczęcia etapu (utworzenie etapu lub decyzja poprzedniego) do `decided_at`.
Przeterminowane = bieżący etap PENDING dłużej niż `sla_days` (7); `overdue` to max 10 najstarszych.
`approval_rate` = % akceptacji wśród wszystkich decyzji (0-100).

### `GET /analytics/top-ideas/?by=savings|likes|comments&limit=10`
`PostLight[]` + `department` (nazwa działu autora). Bez filtra `status` tylko SUBMITTED/IN_PROGRESS/IMPLEMENTED.
`by=savings` pomija posty bez ankiety. `limit` maks. 50.
```json
[ { "id": 8, "title": "Lepsza kontrola jakości etykiet", "...": "...PostLight", "savings": 22000.2, "department": "Produkcja" } ]
```

### `GET /analytics/team/?department=` (approver)
TEAM_LEAD (i każdy bez uprawnień management) dostaje **zawsze swój dział** (parametr `department` ignorowany).
Management może podać `?department=`; bez niego - własny dział. Brak działu -> 400.
Filtry dat/kategorii/statusu zawężają liczniki pomysłów.
```json
{
  "department": { "id": 5, "name": "BHP", "lead_id": 8, "lead_name": "Tomasz Wójcik" },
  "summary": {
    "members": 3, "active_members": 3, "ideas": 1, "implemented": 0, "in_progress": 0,
    "pending_approval": 1, "points": 33, "savings": 0.0
  },
  "members": [
    {
      "id": 7, "username": "user5678", "nickname": "user5678", "first_name": "Alex", "last_name": "Nowak",
      "role": "EMPLOYEE", "ideas": 1, "implemented": 0, "in_progress": 0, "pending": 1,
      "points": 13, "last_activity": "2026-09-26T20:49:33.016212Z"
    }
  ],
  "ideas_in_progress": [ { "...PostLight": "..." } ]
}
```
`active_members` = aktywność (pomysł/komentarz/lajk) w ostatnich 30 dniach. `last_activity` może być `null`.
`ideas_in_progress` = SUBMITTED + IN_PROGRESS działu (max 20, wg terminu).

### `GET /analytics/participation/`
Aktywny użytkownik = zgłosił pomysł, skomentował lub polubił w danym okresie. Domyślnie 12 ostatnich miesięcy
(z bieżącym). `department` zawęża użytkowników; `category`/`status` są tu ignorowane.
```json
{
  "date_from": "2025-10-01",
  "date_to": "2026-09-26",
  "summary": { "active_users": 11, "total_users": 12, "rate": 91.7 },
  "monthly": [
    { "period": "2025-10-01", "active_users": 5, "total_users": 12, "rate": 41.7 }
  ],
  "departments": [
    { "department_id": 5, "department": "BHP", "active_users": 3, "total_users": 3, "rate": 100.0 }
  ]
}
```
`rate` w procentach (0-100). `total_users` w miesiącu = aktywne konta założone przed końcem miesiąca.

---

## 5. Administracja (`/admin/`, tylko admin; inni 403)

Paginowane: `users/`, `redemptions/`. Pozostałe listy zwracają zwykłe tablice.

### `users/` - CRUD
Filtry: `search` (login, nick, imię, nazwisko, email), `role`, `department` (id lub `none`), `is_active`, `is_staff`
(`true`/`false`).
```json
{
  "id": 3, "username": "user1234", "nickname": "user1234", "first_name": "Jan", "last_name": "Kowalski",
  "email": "user1234@example.com", "role": "EMPLOYEE", "department": 4, "department_name": "IT",
  "is_active": true, "is_staff": false, "is_superuser": false, "points": 44,
  "date_joined": "2026-01-10T08:00:00Z", "last_login": null
}
```
- `POST` wymaga `username`, `password` (min. 6 znaków); `nickname` domyślnie = `username`.
- `PATCH` dowolne pola powyżej (+ opcjonalnie `password`). Tylko superuser może zmieniać `is_superuser`.
  Nie można dezaktywować siebie ani odebrać sobie `is_staff`.
- `DELETE` = **dezaktywacja** (`is_active=false`), 204. Dane zostają.
- `POST users/{id}/set_password/` `{"password": "nowehaslo"}` -> `{"detail": "Hasło zostało zmienione."}`
- `POST users/{id}/adjust_points/` `{"points": -50, "reason": "Korekta"}` -> 201
  ```json
  { "transaction": { "id": 120, "action": "MANUAL_ADJUSTMENT", "action_display": "Korekta ręczna",
      "points": -50, "metadata": { "reason": "Korekta", "by_user": 1, "by_username": "admin" },
      "created_at": "2026-09-26T21:00:00Z" },
    "total_points": 94 }
  ```

### `departments/` - CRUD
```json
{ "id": 1, "name": "Produkcja", "is_active": true, "lead": 8, "lead_name": "Tomasz Wójcik", "member_count": 7 }
```
`lead` = id aktywnego użytkownika z rolą TEAM_LEAD **należącego do tego działu** - to on akceptuje pierwszy etap
pomysłów pracowników działu. Inny użytkownik = 400 `{"lead": ["..."]}` (np. "Lider działu musi należeć do tego
działu."), więc przy tworzeniu działu `lead` zostaw puste i ustaw po przypisaniu lidera do działu.
`member_count` liczy aktywnych członków. Usunięcie działu zdejmuje go z użytkowników (SET NULL).

### `categories/` - CRUD
```json
{ "id": 1, "name": "BHP", "is_active": true, "post_count": 23 }
```
`DELETE` kategorii z pomysłami -> 400 ("Dezaktywuj ją zamiast usuwać").

### `rewards/` - CRUD (także nieaktywne)
```json
{ "id": 1, "name": "Kubek Kaizen", "description": "Firmowy kubek z logo", "cost_points": 100, "stock": null,
  "icon": "coffee", "is_active": true, "order": 1, "redemption_count": 4 }
```
`stock: null` = bez limitu. `DELETE` nagrody z historią wymian -> 400.

### `redemptions/?status=PENDING[,APPROVED]&user=` (paginowane, od najnowszych)
```json
{
  "id": 7,
  "user": { "...UserPublic": "..." },
  "reward": { "...AdminReward": "..." },
  "points_spent": 200, "status": "PENDING", "status_display": "Oczekuje", "note": "",
  "created_at": "2026-09-20T10:00:00Z", "handled_at": null, "handled_by": null
}
```
Akcje `POST redemptions/{id}/approve|deliver|reject/` `{"note": "opcjonalnie"}` -> zaktualizowana wymiana.
Przejścia: approve z PENDING; deliver z PENDING/APPROVED; reject z PENDING/APPROVED (**zwraca punkty** i stan
magazynowy). Każde inne przejście (także ponowienie tej samej akcji albo decyzja innego admina, który zdążył
pierwszy) -> **409** `{"detail": "Nie można zmienić statusu z \"Odrzucona\" na \"Wydana\"."}`.
Klient powinien wtedy odświeżyć kolejkę.

### `point-rules/` - lista + `PATCH point-rules/{id}/`
```json
{ "id": 1, "action": "IDEA_CREATED", "action_display": "Zgłoszenie pomysłu", "points": 5,
  "daily_cap": null, "is_active": true, "description": "Zgłoszenie nowego pomysłu" }
```
Edytowalne: `points`, `daily_cap`, `is_active`, `description`.

### `badges/` - CRUD
```json
{ "id": 1, "code": "first-idea", "name": "Pierwszy pomysł", "description": "Zgłoś swój pierwszy pomysł",
  "icon": "edit-3", "criteria_type": "POST_COUNT", "threshold": 1, "tier": "BRONZE", "is_active": true,
  "order": 1, "awarded_count": 9 }
```
`criteria_type`: `POST_COUNT`, `LIKES_RECEIVED`, `IMPLEMENTED_COUNT`, `REVIEW_COUNT`, `STREAK`, `POINTS`,
`COMMENT_COUNT`. `tier`: `BRONZE`, `SILVER`, `GOLD`. `code` = slug, unikalny.

### `levels/` - CRUD
```json
{ "id": 2, "name": "Innowator", "min_points": 100, "order": 2, "color": "#38bdf8", "icon": "zap" }
```

### `GET /admin/stats/`
```json
{
  "active_users": 31, "total_users": 32, "admins": 1, "pending_redemptions": 3,
  "categories": 6, "departments": 6, "active_rewards": 6, "active_badges": 10,
  "posts": 120, "pending_approvals": 14
}
```

---

## Changelog

- 2026-09-27 (poprawki z `review-backend-2.md`):
  - `GET /posts/bookmarked/` pomija pomysły, których user nie może już oglądać (te same zasady co po ID);
  - `/notifications/`: `post_title` i `comment_text` = `null` dla niewidocznych już pomysłów; `MENTION` tylko dla
    osób z dostępem do pomysłu;
  - nowy kod **409** przy konflikcie równoległych zmian (blokada bazy); decyzje `approve`/`reject` i `resubmit`
    wykonują się atomowo, a status i bieżący etap są sprawdzane po zablokowaniu pomysłu (druga z dwóch
    równoległych decyzji dostaje 400/403 albo 409);
  - `/admin/departments/`: `lead` musi mieć rolę TEAM_LEAD i należeć do działu (400); `assigned_team_lead` w POST
    pomysłu musi mieć rolę TEAM_LEAD (400, wcześniej sprawdzany tylko dział).

- 2026-09-26 (decyzje koordynatora do review frontendu): payload logowania rozszerzony o `is_staff`,
  `is_superuser`, `department`, `department_name`, `permissions`; komunikaty po polsku (`LANGUAGE_CODE='pl'`,
  404 = `"Nie znaleziono."`). Poprawka: `approve`/`reject`/`resubmit`/`progress` zwracają post pobrany po zmianie
  (wcześniej `reject` mógł zwrócić nieaktualne `approvals`).

- 2026-09-26 (prośby web-core): `image_items[].type`; zapis zdjęć z typem (`images` przyjmuje string albo
  `{image, type}`, kompatybilnie z mobile); `can_update_progress` w pełnym obiekcie posta; wzmianki `@nick.z.kropka`.

- 2026-09-26 (po review): poprawki z `review-backend.md` i prośba QA:
  - posty `TO_VERIFY`/`CANCELLED` po ID tylko dla autora, łańcucha akceptacji, management i admina (inni 404),
    także w `comments/`, `like/`, `bookmark/`, `/comments/`, `/likes/`;
  - `assigned_team_lead` walidowany względem działu autora (400);
  - `/notifications/` i `my_cases/`: tablica max 200 najnowszych, opcjonalna paginacja przez `?page=`;
  - `/admin/redemptions/{id}/approve|deliver|reject/`: niedozwolone przejście = **409** (wcześniej 400);
  - operacje na punktach (wymiana, zwrot, korekta, naliczenia) serializowane per użytkownik, zwrot na magazyn
    atomowo w bazie;
  - nowy `GET /departments/` (słownik aktywnych działów);
  - udokumentowany wyjątek: `heatmap/` dla każdego zalogowanego (tylko własna).

- 2026-09-26: pierwsza publikacja. Nowe: sekcje 1-5 wg PLAN.md. Zmiany istniejących kształtów:
  `leaderboard` zwraca obiekt `{results, me}` zamiast tablicy (mobile obsługuje oba), `UserPublic` ma
  `department`/`department_name`, `me/` ma `is_superuser` i `permissions`, `me` gamifikacji ma `badges[].awarded_at`.
  `GET /users/` jest teraz paginowane i wymaga zalogowania (wcześniej tablica, nikt z niej nie korzystał).
