# Testowanie Kaizen

## Uruchomienie lokalne

Wymagania: Docker Desktop z działającym silnikiem, Node.js i npm, wolne porty 8000 i 3000. Wszystkie polecenia wykonuj z katalogu głównego repo, chyba że wskazano inaczej. Nie uruchamiaj drugiego serwera na zajętym porcie: `docker compose ps` i `lsof -nP -iTCP:8000 -iTCP:3000 -sTCP:LISTEN` pokazują istniejące procesy.

### Backend: Docker (zalecane)

1. Utwórz `backend/.env` zgodnie z konfiguracją Django (minimum `DJANGO_SECRET=...`); nie publikuj wartości sekretu.
2. W osobnym terminalu uruchom `SEED_DB=true docker compose up --build backend`. `docker-compose.yml` przekazuje zmienną `SEED_DB` do kontenera. Entrypoint wykonuje `python manage.py migrate`, potem `init_users`, `init_posts`, `init_comments`, `init_gamification` i startuje serwer `0.0.0.0:8000`. Gdy backend udostępni `init_demo`, kieruj się zaktualizowanym `backend/entrypoint.sh`.
3. Przy kolejnych startach bez resetowania haseł i seedów: `docker compose up backend` (domyślnie `SEED_DB=false`). Pierwsze uruchomienie z seedami może modyfikować istniejące dane, więc używaj bazy testowej.
4. Sprawdź `curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:8000/api/users/me/` (401 bez JWT) oraz `docker compose ps`. Logi: `docker compose logs -f backend`. Zatrzymanie: Ctrl+C w terminalu compose; nie zatrzymuj wspólnego serwera bez uzgodnienia z zespołem.

Alternatywa bez Docker: środowisko `backend/venv` musi mieć działający interpreter. Z katalogu `backend/` wykonaj `venv/bin/python manage.py migrate`, kolejno `venv/bin/python manage.py init_users`, `init_posts`, `init_comments`, `init_gamification`, a następnie `venv/bin/python manage.py runserver 0.0.0.0:8000`. Jeśli symlink `venv/bin/python` jest uszkodzony, użyj Docker zamiast modyfikować środowisko innych agentów. Nie uruchamiaj seedów ponownie na ważnej bazie: `init_users` resetuje hasła demo.

### Web

W drugim, osobnym terminalu: `cd frontend/web`, `npm install` tylko jeśli brak `node_modules`, potem `npm run dev` (port 3000). Otwórz `http://localhost:3000/login`, zaloguj się kontem demo. Jeśli web potrzebuje adresu API, sprawdź bieżącą konfigurację `frontend/web/src/lib/api.ts` i lokalne zmienne środowiska. Strony są tworzone równolegle; 404 na jeszcze nieopublikowanym route zgłoś jako oczekujące na retest.

### Smoke API

Z katalogu głównego: `python3 scripts/smoke_api.py` lub `python3 scripts/smoke_api.py --base-url http://localhost:8000`. Skrypt używa tylko biblioteki standardowej i loguje się przez `POST /api/access/token/` kontami `admin`, `user1234`, `lead1`, `manager1`, `director1` z hasłem równym loginowi. Porównuje 200/403 z macierzą ról, raportuje 404 jako `brak` (endpoint w trakcie wdrażania), a brak danych dla ścieżek z ID jako `pominięto`. Kod wyjścia 1 oznacza błąd logowania, transportu lub niezgodny kod odpowiedzi. Domyślnie wykonuje jedynie GET; opcja `--validation-posts` wysyła POST z pustym JSON i powinna być używana wyłącznie na odrębnej bazie testowej. Operacje, które trwale zmieniają dane (akceptacje, punkty, wymiany, DELETE/PATCH), sprawdzaj ręcznie poniżej. 404 zwrócone przez szczegółowy endpoint z istniejącym ID wymagają ręcznej diagnostyki: skrypt raportuje je jako `brak`, nie jako błąd.

Szybka kontrola projektu: `docker compose exec backend python manage.py check`, `docker compose exec backend python manage.py makemigrations --check`, `docker compose exec backend python manage.py test`, a w `frontend/web`: `npx tsc --noEmit` i `npm run lint`. Przy równoległych edycjach zapisuj błędy właścicielowi w `docs/team/status-qa.md`, nie poprawiaj cudzych plików.

## Scenariusze per rola (web i mobile)

Przed każdym cyklem użyj świeżej bazy demo i zapisz ID pomysłu, konta, status i saldo punktów. Na web korzystaj z odpowiednich route, na mobile z feedu, formularza tworzenia, zakładki spraw, szczegółów pomysłu, profilu/rankingu i sklepu nagród. Loguj każde konto osobno. Przypadki dla kosztu wymagającego dyrektora wykonuj z `assigned_director` oraz kwotą powyżej progu z backendu. Nie używaj tej samej wymiany nagrody drugi raz podczas porównywania salda.

### EMPLOYEE (`user1234`)

1. Web `/ideas/new` i mobile przycisk `+`: zgłoś pomysł z kategorią, kierownikiem, opcjonalną ankietą i zdjęciem. Oczekuj wpisu w `/my-ideas`, feedzie i szczegółach z osią etapów.
2. Sprawdź wyszukiwanie/filtry, polubienie, komentarz, zakładkę, powiadomienie i publiczny profil autora. Nie powinno być dostępu do `/approvals`, `/team`, `/implementation`, `/dashboard`, `/reports` i `/admin/**`; API zarządcze ma zwrócić 403.
3. Po odrzuceniu przez właściwego approvera zobacz powód i ponów zgłoszenie jako autor. Po wdrożeniu sprawdź punkty, poziom/odznaki, ranking i `/impact`; w sklepie `/rewards` wykonaj jedną wymianę przy wystarczającym saldzie, sprawdź historię i odjęcie punktów. Powtórz na mobile w odpowiednich ekranach.

### TEAM_LEAD (`lead1`)

1. Zweryfikuj dostęp do `/approvals` i `/team` na web oraz zakładki spraw/akceptacji na mobile, bez dostępu do `/implementation`, `/dashboard`, `/reports` i `/admin/**`. API `/analytics/team/` ma obejmować tylko własny dział; `/analytics/overview/` i `/posts/pipeline/` mają zwrócić 403.
2. Otwórz pomysł pracownika z własnego działu oczekujący na etap TEAM_LEAD; zatwierdź i sprawdź przesunięcie do MANAGER oraz powiadomienia. Przy drugim zgłoszeniu odrzuć z obowiązkowym powodem; bez powodu oczekuj walidacji.
3. Sam zgłoś pomysł i sprawdź analogiczną ścieżkę akceptacji, wdrożenie, naliczone punkty/odznaki i wymianę nagrody na web i mobile. Przetestuj brak wglądu w kolejkę obcego działu.

### MANAGER (`manager1`)

1. Sprawdź `/approvals`, `/team`, `/implementation`, `/dashboard`, `/departments`, `/reports` oraz odpowiadającą kolejkę na mobile; `/admin/**` ma być niedostępne (API 403).
2. Po akceptacji przez lidera zatwierdź etap MANAGER, podając `estimated_cost` i opcjonalny `deadline`. Bez kosztu oczekuj 400. Dla kosztu przekraczającego próg wskaż dyrektora i oczekuj kolejnego etapu; dla mniejszego zweryfikuj przejście do realizacji.
3. W kanbanie zmień postęp przypisanego pomysłu z 0 na wartość pośrednią i 100; sprawdź status IN_PROGRESS/IMPLEMENTED oraz spójność analityki, punktów, odznak i wymiany nagrody. Spróbuj zmienić nieprzypisany pomysł (403). Na mobile sprawdź status i powiadomienia.

### DIRECTOR (`director1`)

1. Zweryfikuj dostęp zarządczy jak MANAGER oraz własną kolejkę DIRECTOR na web/mobile, bez panelu `/admin/**`.
2. Otwórz zgłoszenie po decyzji MANAGER z kosztem wymagającym dyrektora, zaakceptuj (następnie status realizacji) i osobno odrzuć inne z powodem. Konto nieprzypisane do etapu nie może podjąć decyzji.
3. Sprawdź raporty, lejek akceptacji i oszczędności, potem własne zgłoszenie od utworzenia po wdrożenie, punkty/odznaki i wymianę nagrody na obu klientach.

### ADMIN (`admin`)

1. Zweryfikuj wszystkie sekcje web, szczególnie `/admin/users`, `/admin/structure`, `/admin/rewards`, `/admin/gamification`; na mobile potwierdź wspólne ekrany, rolę approvera i sklep.
2. Na bazie testowej utwórz dział, kategorię, użytkownika i nagrodę; sprawdź filtry, edycję, reset hasła, ręczną korektę punktów, reguły/odznaki/poziomy. Sprawdź, że każda z tych tras zwraca 403 dla czterech innych kont.
3. Przeprowadź pomysł przez akceptacje i realizację, przyznanie punktów i odznak, wymień nagrodę jako uprawniony użytkownik, następnie w panelu admin zatwierdź/wydaj inną wymianę i odrzuć kolejną. Po odrzuceniu sprawdź zwrot punktów i historię transakcji. Testy modyfikujące wykonuj tylko na bazie demo.

## Stan bieżący QA

Przy pierwszej kontroli działały już procesy na `:8000` i `:3000`, dlatego QA ich nie restartowało. Login `lead1` zwrócił 200. Szczegóły aktywnych blokad i kroki odtworzenia: `docs/team/status-qa.md`. Po scaleniu zmian backendu uruchom migracje i ponów smoke oraz testy przeglądarkowe na ukończonych stronach.
