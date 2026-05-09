# Backend — Kaizen API

Django 6 + DRF API dla platformy zgłaszania pomysłów Kaizen.

## Stack

- Python 3.13, Django 6.0, DRF 3.16, SimpleJWT, drf-spectacular
- SQLite (dev), PostgreSQL planowany na prod
- Jazzmin admin, django-cors-headers
- Uruchamiane w Dockerze (kontener `kaizen_backend`)

## Struktura

```
backend/
  app/              # główny projekt Django (settings, urls, wsgi)
  users/            # CustomUser (EMPLOYEE / MANAGER)
  ideas/            # KaizenPost, Comment, Like, Notification, Category, PostSurvey
    services/       # logika domenowa (np. post_survey_calculator)
    permissions.py  # IsPostAuthorOrReadOnly, IsCommentAuthorOrReadOnly
  access_control/   # logowanie kodem dostępu, JWT, logout, rate limiting
  config_kaizen/    # BASE_DIR i wspólna konfiguracja
  static/, media/   # statyki i uploady (kaizen_attachments/)
```

## Uruchamianie

```bash
# z poziomu repo root
docker-compose up --build              # build + migracje + seed + runserver na :8000
docker exec -it kaizen_backend bash    # shell w kontenerze
docker exec -it kaizen_backend python manage.py createsuperuser
docker exec -it kaizen_backend python manage.py makemigrations <app>
docker exec -it kaizen_backend python manage.py migrate
```

`entrypoint.sh` automatycznie odpala `migrate` oraz seedy: `init_users`, `init_posts`, `init_comments`.

## API

- Prefix: `/api/`
- Auth: `/api/access/token/` (login), `/api/access/token/code/` (kod dostępu),
  `/api/access/token/refresh/`, `/api/access/logout/`
- Resources (router): `posts`, `categories`, `users`, `comments`, `likes`, `notifications`
- Docs: `/api/docs/` (Swagger), `/api/schema/` (OpenAPI)
- Refresh token przekazywany w `HttpOnly` cookie (`withCredentials`)

## Modele i przepływy

- `CustomUser.role`: `EMPLOYEE` (default) lub `MANAGER`
- `KaizenPost.status`: `TO_VERIFY` → `SUBMITTED` → `IN_PROGRESS` → `IMPLEMENTED`,
  z możliwym `CANCELLED`
- Manager workflow (`PostViewSet`):
  - `approve`: `TO_VERIFY → SUBMITTED` (tylko `assigned_manager`)
  - `reject`: `TO_VERIFY → CANCELLED` (wymaga `rejection_reason`)
  - `resubmit`: `CANCELLED → TO_VERIFY` (tylko autor)
  - `my_cases`: lista zadań po roli (manager: przypisane mu, employee: jego własne)
- Posty `TO_VERIFY` w `list` są ukryte (widoczne tylko bezpośrednio dla autora/managera)
- `Notification.Type`: `LIKE`, `COMMENT`, `APPROVED`, `REJECTED`, `ASSIGNED` —
  tworzone przez `create_notification()` w `ideas/views.py`
- `PostSurvey` liczone przez `services/post_survey_calculator.calculate_survey_results()`
- Obrazy: `PostImage` z `ImageField` w `kaizen_attachments/YYYY/MM/DD/`,
  upload jako base64 z mobilki

## Konwencje

- Permissions per-action w `get_permissions()`, nie globalnie
- Logika domenowa do `services/`, nie do widoków
- Komunikaty błędów po polsku (są zwracane do UI)
- `verbose_name` po polsku w modelach (widoczne w Jazzmin)
- Migracje commitować razem ze zmianami modelu
- `users/serializers.py` i `ideas/serializers.py` mają **dwa różne** `UserPublicSerializer` — uważać przy importach
