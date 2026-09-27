# Backend - Kaizen API

Django 6 + DRF API dla platformy zgłaszania pomysłów Kaizen. Pełny kontrakt z przykładowymi
odpowiedziami: `docs/team/API.md` (źródło prawdy dla web i mobile).

## Stack

- Python 3.13, Django 6.0, DRF 3.16, SimpleJWT, drf-spectacular, openpyxl (eksport XLSX)
- SQLite (dev, plik `db.sqlite3` w katalogu repo), PostgreSQL planowany na prod
- Jazzmin admin, django-cors-headers
- Uruchamiane w Dockerze (kontener `kaizen_backend`)

## Struktura

```
backend/
  app/              # projekt Django (settings, urls), seedy w management/commands, app/testing.py (fixture testów)
  users/            # CustomUser (role), Department (z liderem `lead`)
  ideas/            # KaizenPost, PostApproval, PostImage, PostSurvey, Comment, Like, Bookmark, Notification, Category
    services/       # approval.py (ścieżka akceptacji), queries.py (filtry listy, trendy), post_survey_calculator.py
    permissions.py  # IsPostAuthorOrReadOnly, IsCommentAuthorOrReadOnly
  gamification/     # punkty (ledger PointTransaction), poziomy, odznaki, nagrody, ranking; handlers.py = sygnały
  analytics/        # KPI i raporty; services/metrics.py, insights.py (SLA, zespół, uczestnictwo), filters.py, exporters.py
  admin_api/        # panel administracji pod /api/admin/ (tylko admin)
  access_control/   # logowanie (hasło, kod dostępu), JWT, logout, permissions.py (role)
  config_kaizen/    # BASE_DIR
  static/, media/   # statyki i uploady (kaizen_attachments/)
```

## Uruchamianie

```bash
# z poziomu repo root
docker-compose up --build              # build + migracje (+ seedy gdy SEED_DB=true) + runserver na :8000
docker exec -it kaizen_backend bash
docker exec -it kaizen_backend python manage.py migrate
docker exec -it kaizen_backend python manage.py init_demo   # dane demo, idempotentne
docker exec -it kaizen_backend python manage.py test

# bez Dockera (venv z requirements.txt; requirements.txt jest w UTF-16)
python manage.py migrate && python manage.py init_demo && python manage.py runserver
```

`entrypoint.sh`: zawsze `migrate`; przy `SEED_DB=true` kolejno `init_users`, `init_posts`, `init_comments`,
`init_gamification`, `init_demo`.

`init_demo` tworzy: 6 działów z liderami, ~32 konta we wszystkich rolach, ~120 pomysłów z 12 miesięcy we
wszystkich statusach (pełne ścieżki akceptacji, ankiety, lajki, komentarze, zakładki, powiadomienia),
ledger punktów z historycznymi datami, odznaki i wymiany nagród. Hasło = login (np. `lead3`/`lead3`).
Deterministyczne (stały seed) i idempotentne (pomysły po tytule, transakcje po `dedupe_key`).
Na czas seedu wyłącza sygnały gamifikacji i sam buduje ledger.

Konta: `admin` (superuser), `user1234` (EMPLOYEE), `lead1`..`lead6` (TEAM_LEAD), `manager1`..`manager4`
(MANAGER), `director1`, `director2` (DIRECTOR) + pracownicy `imie.nazwisko`.

## Role i uprawnienia

`access_control/permissions.py` - jedyne źródło prawdy:
- admin = `is_staff` lub `is_superuser`;
- approver = TEAM_LEAD / MANAGER / DIRECTOR lub admin;
- management = MANAGER / DIRECTOR lub admin.

Klasy `IsAdmin`, `IsApprover`, `IsManagement`; `permissions_payload(user)` trafia do `GET /users/me/`.
`analytics/permissions.py` tylko re-eksportuje (kompatybilność importów).

## API (prefiks `/api/`)

- Auth: `access/token/` (login), `access/token/code/` (kod dostępu), `access/token/refresh/`, `access/logout/`.
  Refresh token w `HttpOnly` cookie.
- Router: `posts`, `categories`, `departments` (słownik `{id, name}`), `users`, `comments`, `likes`, `notifications`.
- `users/`: `me/` (+`permissions`), lista paginowana (`search`, `department`, `role`), `{id}/` profil ze
  statystykami, `approvers/`, `managers/`.
- `posts/`: filtry `search, category, status (lista|all), department, author, mine, date_from, date_to,
  ordering=newest|oldest|likes|comments|savings`; akcje `approve, reject, resubmit, like, bookmark, bookmarked,
  progress, comments, survey, my_cases, approvals_queue, approvals_queue/count, pipeline, trending`.
- `gamification/`: `me/`, `leaderboard/` (`{results, me}`), `badges/`, `users/{id}/`, `transactions/`,
  `rewards/` (+`redeem`, `my-redemptions`).
- `analytics/` (management; `team/` dla approverów): `overview, departments, categories, trends, approvals,
  top-ideas, team, participation, heatmap, me/impact, export` + wspólne filtry
  `date_from, date_to, department, category, status` (`analytics/services/filters.py`).
- `admin/` (tylko admin): `users` (+`set_password`, `adjust_points`), `departments`, `categories`, `rewards`,
  `redemptions` (+`approve|deliver|reject`), `point-rules`, `badges`, `levels`, `stats`.
- Docs: `/api/docs/` (Swagger), `/api/schema/` (OpenAPI).

## Modele i przepływy

- `CustomUser.role`: `EMPLOYEE` (default), `TEAM_LEAD`, `MANAGER`, `DIRECTOR`; `department` FK.
  `Department.lead` = lider zespołu akceptujący pierwszy etap.
- `KaizenPost.status`: `TO_VERIFY` -> `SUBMITTED` -> `IN_PROGRESS` -> `IMPLEMENTED`, z możliwym `CANCELLED`.
- Ścieżka akceptacji (`ideas/services/approval.py`, model `PostApproval`, etap bieżący = pierwszy PENDING wg `order`):
  1. `TEAM_LEAD` - tylko gdy autor to EMPLOYEE, a dział ma lidera (lub podano `assigned_team_lead`);
  2. `MANAGER` (`assigned_manager`) - przy akceptacji podaje `estimated_cost` i opcjonalnie `deadline`;
  3. `DIRECTOR` - tworzony dynamicznie, gdy koszt > `COST_THRESHOLD_DIRECTOR` (10 000 zł).
  Odrzucenie na dowolnym etapie -> `CANCELLED` (pozostałe etapy `SKIPPED`), `resubmit` odtwarza ścieżkę.
- `approvals_queue(user)` / `with_current_stage(qs)` - kolejka "do mojej decyzji" (używa też `my_cases`).
- `progress`: przypisany kierownik, przypisany dyrektor lub admin (`can_update_progress`).
- Lista postów bez `status` pokazuje tylko SUBMITTED/IN_PROGRESS/IMPLEMENTED; TO_VERIFY/CANCELLED widzi
  management albo autor z `mine=true`.
- Dostęp po ID (retrieve, akcje detail, `/comments/`, `/likes/`): `ideas/services/queries.py:visible_to()` -
  ukryte statusy tylko autor, łańcuch akceptacji, management, admin; reszta 404.
- `/notifications/` i `my_cases/`: tablica max 200 (`ARRAY_LIMIT`), paginacja tylko z `?page=` (`array_or_page`).
- Punkty: każda operacja na saldzie (award/korekta, redeem, zwrot) najpierw `engine.lock_points(user)`
  (SELECT FOR UPDATE na profilu), kolejność blokad profil -> wymiana -> nagroda; saldo przy wymianie z ledgera.
- Współbieżność: SQLite ignoruje SELECT FOR UPDATE, więc `DATABASES.OPTIONS.transaction_mode='IMMEDIATE'`
  serializuje transakcje zapisu; błąd blokady bazy = 409 (`app/exceptions.py`). Decyzje `approve`/`reject` i
  `resubmit` działają w `transaction.atomic()` z `approval.lock_post()`, stan sprawdzany dopiero po blokadzie.
- `Department.lead` musi mieć rolę TEAM_LEAD i ten sam dział (`users.models.department_lead_error`);
  `resolve_team_lead` pomija nieprawidłowego lidera.
- Widoczność: zakładki filtrowane `visible_to`; `MENTION` tylko dla osób z dostępem; `/notifications/` zwraca
  `post_title`/`comment_text` = null dla pomysłów, których odbiorca już nie widzi.
  Przejścia wymian walidowane w `rewards.set_status` po blokadzie (`RedemptionConflict` -> 409).
- Gamifikacja: `gamification/handlers.py` obserwuje `ideas` (sygnały) i nalicza punkty przez
  `services/engine.award()` z `dedupe_key` (idempotencja). `ideas` nie importuje `gamification`.
  Ręczne korekty: akcja `MANUAL_ADJUSTMENT` (`points_override`).
- `Notification.Type`: `LIKE`, `COMMENT`, `REPLY`, `MENTION`, `APPROVED`, `REJECTED`, `ASSIGNED` -
  `create_notification()` w `ideas/views.py`.
- `PostSurvey` liczone przez `services/post_survey_calculator.calculate_survey_results()` (oszczędności miesięczne).
- Obrazy: `PostImage` (`type` GENERAL/BEFORE/AFTER) w `kaizen_attachments/YYYY/MM/DD/`, upload jako base64
  (string albo `{image, type}` - `PostImageInputField`). Wzmianki: `MENTION_REGEX` w `ideas/views.py`.

## Testy

`python manage.py test` (106 testów; przepływ end-to-end w `app/tests_flow.py`). Fixture `app/testing.py:OrgTestCase` tworzy działy, konta każdej roli
i admina; `as_user(user)` / `anon()` przełączają klienta. Testy uprawnień per rola są w `*/tests.py`
każdej aplikacji; `app/tests.py` sprawdza idempotencję `init_demo`.

## Konwencje

- Permissions per-action w `get_permissions()`, nie globalnie; role tylko przez `access_control/permissions.py`.
- Logika domenowa do `services/`, nie do widoków; widoki analityki tylko wołają funkcje z `analytics/services/`.
- Liczniki na listach przez adnotacje (`n_likes`, `n_comments`, `liked_by_me`) i `select/prefetch_related`
  (`ideas/services/queries.py`), serializery mają fallback na zapytanie dla pojedynczych obiektów.
- Nie zmieniamy kształtów odpowiedzi używanych przez mobile - tylko rozszerzamy; zmiany opisujemy w `docs/team/API.md`.
- Komunikaty błędów po polsku (są zwracane do UI): `LANGUAGE_CODE='pl'`, handler 404 w `app/exceptions.py`;
  `verbose_name` po polsku w modelach.
- Akcje zmieniające post zwracają `self._fresh(post)` (świeży odczyt), nie obiekt z `get_object()` (prefetch).
- Migracje commitować razem ze zmianami modelu.
- `users/serializers.py:UserPublicSerializer` to jedyny serializer publicznych danych użytkownika
  (ma `department`, `department_name`); `ideas/serializers.py` go importuje.
- Bez znaku em dash (U+2014) w kodzie i dokumentacji.
