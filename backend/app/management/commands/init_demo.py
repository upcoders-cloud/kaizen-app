"""
Bogate dane demo: działy z liderami, ~32 użytkowników we wszystkich rolach, ~120 pomysłów
rozłożonych na 12 miesięcy we wszystkich statusach (z pełnymi ścieżkami akceptacji),
ankiety z oszczędnościami, lajki, komentarze (z odpowiedziami i @wzmiankami), zakładki,
powiadomienia, transakcje punktowe z historycznymi datami, odznaki i wymiany nagród.

Idempotentne: użytkownicy po loginie, pomysły po tytule, transakcje po `dedupe_key`.
Ponowne uruchomienie niczego nie duplikuje. Dane są deterministyczne (stały seed).
Hasło każdego konta demo = login.

    python manage.py init_demo
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.utils import timezone

from gamification import handlers
from gamification.management.commands.init_gamification import BADGES, LEVELS, POINT_RULES
from gamification.models import (
    Action,
    Badge,
    Level,
    PointRule,
    PointTransaction,
    Reward,
    RewardRedemption,
)
from gamification.services import engine
from ideas.models import (
    Bookmark,
    Category,
    Comment,
    KaizenPost,
    Like,
    Notification,
    PostApproval,
    PostSurvey,
)
from ideas.services.approval import director_required
from ideas.services.post_survey_calculator import calculate_survey_results
from users.models import Department

SEED = 20260926
Status = KaizenPost.Status
Stage = PostApproval.Stage
Decision = PostApproval.Decision

DEPARTMENTS = ['Produkcja', 'Logistyka', 'Jakość', 'IT', 'BHP', 'Administracja']

CATEGORIES = [
    'BHP',
    'Usprawnienie Procesu',
    'Jakość',
    'Oszczędność kosztów',
    'Ekologia',
    'Ergonomia',
    'IT i automatyzacja',
]

# (username, first_name, last_name, gender, role, department, is_admin)
# Konta bazowe (admin, user1234, lead1, ...) tworzy init_users - tu dostają dział.
USERS = [
    ('admin', 'Admin', 'User', 'unspecified', 'EMPLOYEE', 'Administracja', True),
    ('user1234', 'Jan', 'Kowalski', 'male', 'EMPLOYEE', 'Produkcja', False),
    ('user2345', 'Anna', 'Nowak', 'female', 'EMPLOYEE', 'Logistyka', False),
    ('user3456', 'Piotr', 'Zielinski', 'male', 'EMPLOYEE', 'Jakość', False),
    ('user4567', 'Marta', 'Wisniewska', 'female', 'EMPLOYEE', 'IT', False),
    ('user5678', 'Alex', 'Nowak', 'other', 'EMPLOYEE', 'BHP', False),
    ('lead1', 'Tomasz', 'Wójcik', 'male', 'TEAM_LEAD', 'Produkcja', False),
    ('lead2', 'Magdalena', 'Lewandowska', 'female', 'TEAM_LEAD', 'Logistyka', False),
    ('lead3', 'Paweł', 'Kaczmarek', 'male', 'TEAM_LEAD', 'Jakość', False),
    ('lead4', 'Karolina', 'Piotrowska', 'female', 'TEAM_LEAD', 'IT', False),
    ('lead5', 'Michał', 'Grabowski', 'male', 'TEAM_LEAD', 'BHP', False),
    ('lead6', 'Ewa', 'Pawłowska', 'female', 'TEAM_LEAD', 'Administracja', False),
    ('manager1', 'Krzysztof', 'Mazur', 'male', 'MANAGER', 'Produkcja', False),
    ('manager2', 'Aleksandra', 'Dąbrowska', 'female', 'MANAGER', 'Logistyka', False),
    ('manager3', 'Marcin', 'Jankowski', 'male', 'MANAGER', 'Jakość', False),
    ('manager4', 'Agnieszka', 'Zając', 'female', 'MANAGER', 'IT', False),
    ('director1', 'Wojciech', 'Kamiński', 'male', 'DIRECTOR', 'Administracja', False),
    ('director2', 'Beata', 'Król', 'female', 'DIRECTOR', 'Produkcja', False),
    ('adam.wrobel', 'Adam', 'Wróbel', 'male', 'EMPLOYEE', 'Produkcja', False),
    ('julia.majewska', 'Julia', 'Majewska', 'female', 'EMPLOYEE', 'Produkcja', False),
    ('lukasz.olszewski', 'Łukasz', 'Olszewski', 'male', 'EMPLOYEE', 'Produkcja', False),
    ('natalia.stepien', 'Natalia', 'Stępień', 'female', 'EMPLOYEE', 'Produkcja', False),
    ('rafal.malinowski', 'Rafał', 'Malinowski', 'male', 'EMPLOYEE', 'Logistyka', False),
    ('ola.jaworska', 'Aleksandra', 'Jaworska', 'female', 'EMPLOYEE', 'Logistyka', False),
    ('kamil.adamczyk', 'Kamil', 'Adamczyk', 'male', 'EMPLOYEE', 'Logistyka', False),
    ('zofia.dudek', 'Zofia', 'Dudek', 'female', 'EMPLOYEE', 'Jakość', False),
    ('bartosz.nowicki', 'Bartosz', 'Nowicki', 'male', 'EMPLOYEE', 'Jakość', False),
    ('patrycja.sikora', 'Patrycja', 'Sikora', 'female', 'EMPLOYEE', 'IT', False),
    ('dawid.baran', 'Dawid', 'Baran', 'male', 'EMPLOYEE', 'IT', False),
    ('monika.szulc', 'Monika', 'Szulc', 'female', 'EMPLOYEE', 'BHP', False),
    ('grzegorz.wieczorek', 'Grzegorz', 'Wieczorek', 'male', 'EMPLOYEE', 'BHP', False),
    ('iwona.krawczyk', 'Iwona', 'Krawczyk', 'female', 'EMPLOYEE', 'Administracja', False),
]

LEADS = {
    'Produkcja': 'lead1', 'Logistyka': 'lead2', 'Jakość': 'lead3',
    'IT': 'lead4', 'BHP': 'lead5', 'Administracja': 'lead6',
}
MANAGERS = {
    'Produkcja': 'manager1', 'Logistyka': 'manager2', 'Jakość': 'manager3',
    'IT': 'manager4', 'BHP': 'manager1', 'Administracja': 'manager2',
}
DIRECTORS = ['director1', 'director2']

REWARDS = [
    ('Kubek Kaizen', 'Firmowy kubek z logo', 100, None, 'coffee', 1),
    ('Bon kawowy', 'Bon na kawę w bufecie', 200, 50, 'coffee', 2),
    ('Voucher 50 zł', 'Voucher do wykorzystania w sklepie', 500, 20, 'gift', 3),
    ('Bluza z logo', 'Ciepła bluza z logo Kaizen', 750, 15, 'shirt', 4),
    ('Karta podarunkowa 150 zł', 'Karta do sieci sklepów', 1200, 10, 'credit-card', 5),
    ('Dodatkowy dzień wolny', 'Jeden dzień urlopu extra', 2000, 5, 'sun', 6),
]

# (tytuł bazowy, opis, kategoria)
IDEAS = [
    ('Oznaczenie stref ruchu wózków widłowych', 'Wyraźne pasy i znaki poziome ograniczą ryzyko kolizji z pieszymi.', 'BHP'),
    ('Lustra na skrzyżowaniach alejek', 'Lustra wypukłe na ślepych skrzyżowaniach poprawią widoczność.', 'BHP'),
    ('Stacja płukania oczu przy myjce', 'Brakuje punktu płukania oczu w pobliżu chemii myjącej.', 'BHP'),
    ('Osłony na przenośnik taśmowy', 'Dodatkowe osłony wyeliminują ryzyko wciągnięcia rękawicy.', 'BHP'),
    ('Czujniki obecności przy prasie', 'Kurtyna świetlna zatrzyma prasę, gdy ktoś wejdzie w strefę.', 'BHP'),
    ('Szkolenie BHP w formie krótkich filmów', 'Pięciominutowe filmy zamiast długiej prezentacji raz w roku.', 'BHP'),
    ('Standaryzacja przezbrojeń maszyny', 'Checklista SMED skróci czas przezbrojenia o połowę.', 'Usprawnienie Procesu'),
    ('Kanban dla materiałów pomocniczych', 'Karty kanban zamiast zamówień ad hoc, koniec z brakami taśmy i folii.', 'Usprawnienie Procesu'),
    ('Tablica wizualnego zarządzania zmianą', 'Jedna tablica z planem, problemami i wynikami zmiany.', 'Usprawnienie Procesu'),
    ('Wspólny kalendarz dostaw', 'Awizacje dostaw w jednym kalendarzu zmniejszą kolejki na rampie.', 'Usprawnienie Procesu'),
    ('Przeniesienie buforu bliżej linii', 'Bufor komponentów przy linii skróci drogę operatorów.', 'Usprawnienie Procesu'),
    ('Odprawa zmiany w 10 minut', 'Stały, krótki format odprawy z tablicą KPI.', 'Usprawnienie Procesu'),
    ('Mapowanie strumienia wartości kompletacji', 'VSM pokaże marnotrawstwo w procesie kompletacji zamówień.', 'Usprawnienie Procesu'),
    ('Wzorce referencyjne etykiet', 'Wzorzec przy stanowisku pozwoli szybko sprawdzić poprawność etykiety.', 'Jakość'),
    ('Poka-yoke przy montażu złączy', 'Kodowane gniazda uniemożliwią odwrotne podłączenie.', 'Jakość'),
    ('Karta kontroli pierwszej sztuki', 'Formularz FAI po każdym przezbrojeniu ograniczy braki.', 'Jakość'),
    ('Analiza reklamacji raz w tygodniu', 'Krótki przegląd reklamacji z działem produkcji co piątek.', 'Jakość'),
    ('Kalibracja suwmiarek w stałym cyklu', 'Harmonogram kalibracji i naklejki z datą ważności.', 'Jakość'),
    ('Kamera kontroli wizualnej na końcu linii', 'Automatyczna kontrola obecności wszystkich elementów.', 'Jakość'),
    ('Odzysk palet drewnianych', 'Naprawa i ponowne użycie palet zamiast zakupu nowych.', 'Oszczędność kosztów'),
    ('Negocjacja umowy na media techniczne', 'Wspólny przetarg na sprężone powietrze i gazy.', 'Oszczędność kosztów'),
    ('Wymiana oświetlenia na LED', 'Oświetlenie LED z czujnikami ruchu obniży rachunki za prąd.', 'Oszczędność kosztów'),
    ('Wykrywanie wycieków sprężonego powietrza', 'Kwartalny obchód z detektorem ultradźwiękowym.', 'Oszczędność kosztów'),
    ('Druk dwustronny jako domyślny', 'Domyślne ustawienia drukarek ograniczą zużycie papieru.', 'Oszczędność kosztów'),
    ('Zakup narzędzi w ramach umowy ramowej', 'Jedna umowa ramowa zamiast zakupów kartą firmową.', 'Oszczędność kosztów'),
    ('Segregacja odpadów przy liniach', 'Pojemniki na folię, karton i metal przy każdej linii.', 'Ekologia'),
    ('Zbiórka deszczówki do myjki', 'Deszczówka wystarczy do mycia pojemników transportowych.', 'Ekologia'),
    ('Wielorazowe pojemniki od dostawców', 'Uzgodnienie z dostawcami pojemników zwrotnych zamiast kartonów.', 'Ekologia'),
    ('Wyłączanie maszyn na przerwach', 'Tryb czuwania maszyn w czasie przerw i przestojów.', 'Ekologia'),
    ('Rowerowy parking dla pracowników', 'Zadaszony parking rowerowy zachęci do dojazdów rowerem.', 'Ekologia'),
    ('Regulowane stoły montażowe', 'Stoły z regulacją wysokości dla różnych operatorów.', 'Ergonomia'),
    ('Maty antyzmęczeniowe na stanowiskach', 'Maty zmniejszą zmęczenie przy pracy stojącej.', 'Ergonomia'),
    ('Podnośnik do worków z surowcem', 'Worki 25 kg podnoszone ręcznie - podnośnik odciąży plecy.', 'Ergonomia'),
    ('Rotacja stanowisk co dwie godziny', 'Rotacja zmniejszy obciążenie powtarzalnymi ruchami.', 'Ergonomia'),
    ('Lepsze oświetlenie stanowisk kontroli', 'Lampy o wysokim CRI ułatwią wykrywanie wad.', 'Ergonomia'),
    ('Uchwyty na skanery przy stanowiskach', 'Uchwyty ograniczą upuszczanie i uszkodzenia skanerów.', 'Ergonomia'),
    ('Automatyczne raporty produkcyjne', 'Raport z danych MES wysyłany automatycznie po każdej zmianie.', 'IT i automatyzacja'),
    ('Skanowanie etykiet zamiast przepisywania', 'Skaner kodów zamiast ręcznego wpisywania numerów partii.', 'IT i automatyzacja'),
    ('Elektroniczny obieg wniosków urlopowych', 'Formularz online zamiast papierowych wniosków.', 'IT i automatyzacja'),
    ('Dashboard OEE na monitorach hali', 'Wyniki OEE w czasie rzeczywistym widoczne dla operatorów.', 'IT i automatyzacja'),
    ('Bot do zgłoszeń awarii', 'Zgłoszenie awarii z telefonu trafia od razu do utrzymania ruchu.', 'IT i automatyzacja'),
    ('Cyfrowe instrukcje stanowiskowe', 'Instrukcje na tabletach, zawsze w aktualnej wersji.', 'IT i automatyzacja'),
    ('Planowanie tras wózków w WMS', 'Optymalizacja tras kompletacji w systemie magazynowym.', 'IT i automatyzacja'),
    ('Przegląd uprawnień w systemach', 'Kwartalny przegląd kont i uprawnień zmniejszy ryzyko.', 'IT i automatyzacja'),
    ('Etykiety półek z kodami QR', 'Kod QR na półce otwiera kartę materiału w WMS.', 'Usprawnienie Procesu'),
    ('Wspólne szablony dokumentów', 'Jeden zestaw szablonów ofert i protokołów dla wszystkich działów.', 'Usprawnienie Procesu'),
    ('Magazynek narzędzi z wydawaniem na kartę', 'Automat wydający narzędzia ograniczy ich znikanie.', 'Oszczędność kosztów'),
    ('Przegląd zużycia rękawic', 'Dobór rękawic do zadań zmniejszy zużycie o jedną trzecią.', 'Oszczędność kosztów'),
    ('Oznaczenie miejsc odkładczych 5S', 'Obrysy narzędzi na tablicach cieni przy każdym stanowisku.', 'Usprawnienie Procesu'),
    ('Audyty 5S prowadzone przez pracowników', 'Rotacyjne audyty 5S wzmocnią poczucie odpowiedzialności.', 'Jakość'),
    ('Apteczki z listą kontrolną', 'Lista zawartości i daty ważności na drzwiczkach apteczki.', 'BHP'),
    ('Barierki przy rampie załadunkowej', 'Barierki zabezpieczą krawędź rampy przy otwartej bramie.', 'BHP'),
    ('Ogrzewanie promiennikowe przy bramach', 'Promienniki poprawią komfort pracy zimą przy rampach.', 'Ergonomia'),
    ('Kompostownik przy stołówce', 'Odpady organiczne ze stołówki trafią do kompostownika.', 'Ekologia'),
    ('Wymiana starych sprężarek', 'Nowe sprężarki z falownikiem zużyją mniej energii.', 'Oszczędność kosztów'),
    ('System sugestii w aplikacji Kaizen', 'Przypomnienia o pomysłach dla zespołów z niską aktywnością.', 'IT i automatyzacja'),
    ('Standard pracy dla nowego produktu', 'Standard pracy przygotowany przed uruchomieniem produkcji.', 'Jakość'),
    ('Szybsza ścieżka odbioru jakościowego', 'Odbiór dostaw zaufanych dostawców bez pełnej kontroli.', 'Jakość'),
    ('Kontenery na wióry przy obrabiarkach', 'Mniejsze kontenery opróżniane częściej zamiast rozsypanych wiórów.', 'BHP'),
    ('Tablica umiejętności zespołu', 'Macierz kompetencji ułatwi planowanie zastępstw.', 'Usprawnienie Procesu'),
]

AREAS = ['Hala A', 'Hala B', 'Magazyn centralny', 'Linia 2', 'Linia 5', 'Biuro', 'Rampa', 'Narzędziownia']

COMMENTS = [
    'Świetny pomysł, u nas na zmianie też to przeszkadza.',
    'Czy ktoś sprawdzał koszt takiego rozwiązania?',
    'Popieram, to zaoszczędzi sporo czasu.',
    'Możemy to przetestować najpierw na jednej linii.',
    'Podobne rozwiązanie widziałem w innym zakładzie, działało dobrze.',
    'Warto skonsultować z działem utrzymania ruchu.',
    'Dobra robota, czekam na wdrożenie!',
    'Proponuję dodać to do planu na następny kwartał.',
    'A co z bezpieczeństwem przy tej zmianie?',
    'Mogę pomóc przy pilotażu.',
    'To rozwiązuje problem, o którym mówiliśmy na odprawie.',
    'Dzięki za zgłoszenie, temat wraca od dawna.',
]
REPLIES = [
    'Dzięki, dopytam o szczegóły.',
    'Zgadzam się, zróbmy pilotaż.',
    'Koszt jest niewielki, sprawdzałem ofertę.',
    'Dobre pytanie, dopiszę to w opisie.',
]
REJECTION_REASONS = [
    'Rozwiązanie jest już w planie inwestycyjnym na przyszły rok.',
    'Koszt nieproporcjonalny do korzyści - proszę o tańszy wariant.',
    'Duplikat wcześniejszego zgłoszenia.',
    'Brak zgody działu BHP na proponowaną zmianę.',
    'Proszę doprecyzować opis i oszacować oszczędności.',
]

# Rozkład statusów wg wieku pomysłu (dni wstecz): starsze częściej wdrożone.
STATUS_WEIGHTS = [
    (21, {Status.TO_VERIFY: 55, Status.SUBMITTED: 25, Status.IN_PROGRESS: 10, Status.CANCELLED: 10}),
    (90, {Status.TO_VERIFY: 8, Status.SUBMITTED: 22, Status.IN_PROGRESS: 40, Status.IMPLEMENTED: 15, Status.CANCELLED: 15}),
    (400, {Status.SUBMITTED: 6, Status.IN_PROGRESS: 18, Status.IMPLEMENTED: 62, Status.CANCELLED: 14}),
]


def _pick_weighted(rng, weights):
    keys = list(weights)
    return rng.choices(keys, weights=[weights[k] for k in keys], k=1)[0]


def _status_for_age(rng, age_days):
    for max_age, weights in STATUS_WEIGHTS:
        if age_days <= max_age:
            return _pick_weighted(rng, weights)
    return Status.IMPLEMENTED


def _set_created(model, pk, when, field='created_at'):
    model.objects.filter(pk=pk).update(**{field: when})


class Command(BaseCommand):
    help = 'Tworzy bogate dane demo (idempotentnie). Hasło każdego konta = login.'

    def handle(self, *args, **options):
        self.now = timezone.now()
        call_command('init_users', stdout=self.stdout)
        self._mute_signals()
        try:
            with transaction.atomic():
                self._seed_gamification_config()
                self.departments = self._seed_departments()
                self.categories = self._seed_categories()
                self.users = self._seed_users()
                self._assign_leads()
                created_posts = self._seed_posts()
                self._seed_ledger()
                self._seed_redemptions()
                self._recompute_profiles()
        finally:
            self._unmute_signals()
        self.stdout.write(self.style.SUCCESS(
            f'init_demo: {len(self.users)} kont demo, {created_posts} nowych pomysłów '
            f'(łącznie {KaizenPost.objects.count()}), {PointTransaction.objects.count()} transakcji.'
        ))

    # --- sygnały gamifikacji: seed buduje ledger sam, z historycznymi datami ---

    SIGNALS = [
        (pre_save, handlers._stash_old_status, KaizenPost),
        (post_save, handlers._on_post_saved, KaizenPost),
        (post_save, handlers._on_like_created, Like),
        (post_save, handlers._on_comment_created, Comment),
        (pre_save, handlers._stash_old_decision, PostApproval),
        (post_save, handlers._on_approval_decided, PostApproval),
    ]

    def _mute_signals(self):
        for signal, receiver, sender in self.SIGNALS:
            signal.disconnect(receiver, sender=sender)

    def _unmute_signals(self):
        for signal, receiver, sender in self.SIGNALS:
            signal.connect(receiver, sender=sender)

    # --- konfiguracja ---

    def _seed_gamification_config(self):
        for action, points, cap, desc in POINT_RULES:
            PointRule.objects.get_or_create(
                action=action,
                defaults={'points': points, 'daily_cap': cap, 'description': desc, 'is_active': True},
            )
        for name, min_points, order, color, icon in LEVELS:
            Level.objects.get_or_create(
                order=order,
                defaults={'name': name, 'min_points': min_points, 'color': color, 'icon': icon},
            )
        for code, name, desc, icon, crit, thr, tier, order in BADGES:
            Badge.objects.get_or_create(
                code=code,
                defaults={
                    'name': name, 'description': desc, 'icon': icon, 'criteria_type': crit,
                    'threshold': thr, 'tier': tier, 'order': order, 'is_active': True,
                },
            )
        for name, desc, cost, stock, icon, order in REWARDS:
            Reward.objects.get_or_create(
                name=name,
                defaults={
                    'description': desc, 'cost_points': cost, 'stock': stock,
                    'icon': icon, 'order': order, 'is_active': True,
                },
            )

    def _seed_departments(self):
        return {name: Department.objects.get_or_create(name=name)[0] for name in DEPARTMENTS}

    def _seed_categories(self):
        return {name: Category.objects.get_or_create(name=name)[0] for name in CATEGORIES}

    def _seed_users(self):
        User = get_user_model()
        users = {}
        for username, first, last, gender, role, dept, is_admin in USERS:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={'email': f'{username}@example.com', 'nickname': username},
            )
            if created:
                user.set_password(username)
                user.first_name, user.last_name, user.gender = first, last, gender
            if user.date_joined > self.now - timedelta(days=400):
                # konta demo "istnieją" od ponad roku (spójność z historycznymi pomysłami)
                user.date_joined = self.now - timedelta(days=400)
            user.role = role
            user.department = self.departments[dept]
            user.is_active = True
            if is_admin:
                user.is_staff = user.is_superuser = True
            user.save()
            users[username] = user
        return users

    def _assign_leads(self):
        for dept, username in LEADS.items():
            department = self.departments[dept]
            if department.lead_id != self.users[username].id:
                department.lead = self.users[username]
                department.save(update_fields=['lead'])

    # --- pomysły ---

    def _idea_specs(self):
        """Deterministyczna lista ~120 specyfikacji pomysłów."""
        rng = random.Random(SEED)
        authors = [u for u, *_ in USERS if u != 'admin']
        weights = {u: (5 if role == 'EMPLOYEE' else 1) for u, _, _, _, role, _, _ in USERS if u != 'admin'}
        specs = []
        for index, (title, content, category) in enumerate(IDEAS):
            areas = rng.sample(AREAS, 2)
            for variant, area in enumerate(areas):
                author = rng.choices(authors, weights=[weights[a] for a in authors], k=1)[0]
                age_days = rng.randint(1, 360) if variant or index % 3 else rng.randint(1, 60)
                specs.append({
                    'title': f'{title} - {area}',
                    'content': f'{content} Dotyczy: {area}.',
                    'category': category,
                    'author': author,
                    'age_days': age_days,
                    'seed': SEED + index * 10 + variant,
                })
        return specs

    def _seed_posts(self):
        existing = set(KaizenPost.objects.values_list('title', flat=True))
        created = 0
        for spec in self._idea_specs():
            if spec['title'] in existing:
                continue
            self._create_post(spec)
            created += 1
        return created

    def _create_post(self, spec):
        rng = random.Random(spec['seed'])
        author = self.users[spec['author']]
        dept_name = author.department.name
        created_at = self.now - timedelta(days=spec['age_days'], hours=rng.randint(0, 10), minutes=rng.randint(0, 59))
        status = _status_for_age(rng, spec['age_days'])
        manager = self.users[MANAGERS[dept_name]]
        if manager.id == author.id:
            manager = self.users['manager2' if manager.username != 'manager2' else 'manager1']
        lead = self.users[LEADS[dept_name]] if author.role == 'EMPLOYEE' else None

        post = KaizenPost.objects.create(
            author=author,
            title=spec['title'],
            content=spec['content'],
            category=self.categories[spec['category']],
            status=Status.TO_VERIFY,
            assigned_manager=manager,
            assigned_team_lead=lead,
        )
        _set_created(KaizenPost, post.pk, created_at)
        post.created_at = created_at

        self._build_approvals(post, rng, status, lead, manager)
        if status in (Status.SUBMITTED, Status.IN_PROGRESS, Status.IMPLEMENTED) and rng.random() < 0.8:
            self._attach_survey(post, rng)
        elif status == Status.TO_VERIFY and rng.random() < 0.4:
            self._attach_survey(post, rng)
        if post.status in (Status.SUBMITTED, Status.IN_PROGRESS, Status.IMPLEMENTED) or rng.random() < 0.3:
            self._add_interactions(post, rng)
        return post

    def _decision_time(self, rng, start, max_hours):
        when = start + timedelta(hours=rng.uniform(2, max_hours))
        return min(when, self.now - timedelta(minutes=5))

    def _build_approvals(self, post, rng, status, lead, manager):
        """Tworzy etapy akceptacji spójne ze statusem docelowym."""
        stages = []
        if lead is not None:
            stages.append((Stage.TEAM_LEAD, lead))
        stages.append((Stage.MANAGER, manager))

        cost = Decimal(rng.choice([0, 300, 800, 1500, 2500, 4000, 6500, 9000, 12000, 18000, 35000]))
        needs_director = director_required(cost)
        director = self.users[rng.choice(DIRECTORS)] if needs_director else None

        # Na którym etapie proces się zatrzymuje (TO_VERIFY) lub kończy odrzuceniem (CANCELLED).
        all_stages = stages + ([(Stage.DIRECTOR, director)] if director else [])
        stop_index = None
        if status in (Status.TO_VERIFY, Status.CANCELLED):
            stop_index = rng.randrange(len(all_stages))

        clock = post.created_at
        order = 1
        manager_decided = False
        for index, (stage, approver) in enumerate(all_stages):
            if stage == Stage.DIRECTOR and not manager_decided:
                break
            approval = PostApproval.objects.create(post=post, stage=stage, order=order, approver=approver)
            stage_created = clock if stage == Stage.DIRECTOR else post.created_at
            order += 1
            if stop_index is not None and index == stop_index:
                if status == Status.TO_VERIFY:
                    _set_created(PostApproval, approval.pk, stage_created)
                    # pozostałe (późniejsze) etapy lidera/kierownika też czekają
                    for later_stage, later_approver in all_stages[index + 1:]:
                        if later_stage == Stage.DIRECTOR:
                            break
                        later = PostApproval.objects.create(
                            post=post, stage=later_stage, order=order, approver=later_approver,
                        )
                        _set_created(PostApproval, later.pk, post.created_at)
                        order += 1
                    break
                decided = self._decision_time(rng, clock, 96)
                reason = rng.choice(REJECTION_REASONS)
                PostApproval.objects.filter(pk=approval.pk).update(
                    decision=Decision.REJECTED, decided_at=decided, comment=reason,
                    created_at=stage_created,
                )
                for later_stage, later_approver in all_stages[index + 1:]:
                    if later_stage == Stage.DIRECTOR:
                        break
                    later = PostApproval.objects.create(
                        post=post, stage=later_stage, order=order, approver=later_approver,
                        decision=Decision.SKIPPED, decided_at=decided,
                    )
                    _set_created(PostApproval, later.pk, post.created_at)
                    order += 1
                post.status = Status.CANCELLED
                post.rejection_reason = reason
                if stage in (Stage.MANAGER, Stage.DIRECTOR):
                    post.estimated_cost = cost if stage == Stage.DIRECTOR else None
                    post.assigned_director = director if stage == Stage.DIRECTOR else None
                post.save(update_fields=['status', 'rejection_reason', 'estimated_cost', 'assigned_director'])
                self._notify(Notification.Type.REJECTED, post.author, approver, post, decided)
                return

            decided = self._decision_time(rng, clock, 72 if stage == Stage.TEAM_LEAD else 120)
            PostApproval.objects.filter(pk=approval.pk).update(
                decision=Decision.APPROVED, decided_at=decided, created_at=stage_created,
                comment=rng.choice([None, None, 'Akceptuję.', 'Dobry kierunek, działamy.']),
            )
            clock = decided
            if stage == Stage.MANAGER:
                manager_decided = True
                post.estimated_cost = cost
                post.deadline = (decided + timedelta(days=rng.randint(20, 120))).date()
                post.assigned_director = director
                post.save(update_fields=['estimated_cost', 'deadline', 'assigned_director'])

        if status == Status.TO_VERIFY:
            current = post.approvals.filter(decision=Decision.PENDING).order_by('order').first()
            if current:
                self._notify(Notification.Type.ASSIGNED, current.approver, post.author, post, clock)
            return

        # Zaakceptowany: SUBMITTED / IN_PROGRESS / IMPLEMENTED
        progress = {Status.SUBMITTED: 0, Status.IN_PROGRESS: rng.choice([10, 25, 40, 55, 70, 85]),
                    Status.IMPLEMENTED: 100}[status]
        post.status = status
        post.progress_percent = progress
        post.save(update_fields=['status', 'progress_percent'])
        self._notify(Notification.Type.APPROVED, post.author, manager, post, clock)

    def _attach_survey(self, post, rng):
        values = {
            'frequency_value': rng.choice([1, 2, 3, 5, 8]),
            'frequency_unit': rng.choice(['DAY', 'DAY', 'WEEK', 'MONTH']),
            'affected_people': rng.randint(2, 25),
            'time_lost_minutes': rng.choice([5, 10, 15, 20, 30, 45]),
        }
        calc = calculate_survey_results(**values)
        PostSurvey.objects.create(post=post, **values, **calc)

    def _add_interactions(self, post, rng):
        others = [u for u in self.users.values() if u.id != post.author_id and not u.is_superuser]
        start = post.created_at
        span = max((self.now - start).total_seconds(), 3600)

        def moment(max_fraction=1.0):
            return start + timedelta(seconds=span * min(rng.random() ** 1.6, max_fraction))

        base_likes = 14 if post.status == Status.IMPLEMENTED else 9
        for liker in rng.sample(others, rng.randint(0, min(base_likes, len(others)))):
            like = Like.objects.create(post=post, user=liker, created_at=moment())
            if (self.now - like.created_at).days < 30 and rng.random() < 0.5:
                self._notify(Notification.Type.LIKE, post.author, liker, post, like.created_at)

        comments = []
        for _ in range(rng.randint(0, 6)):
            commenter = rng.choice(others)
            text = rng.choice(COMMENTS)
            if rng.random() < 0.15:
                text = f'{text} @{post.author.nickname}'
            when = moment()
            comment = Comment.objects.create(post=post, author=commenter, text=text)
            _set_created(Comment, comment.pk, when)
            comment.created_at = when
            comments.append(comment)
            if (self.now - when).days < 30:
                self._notify(Notification.Type.COMMENT, post.author, commenter, post, when, comment)
        for parent in comments:
            if rng.random() < 0.3:
                when = min(parent.created_at + timedelta(hours=rng.randint(1, 48)), self.now)
                reply = Comment.objects.create(
                    post=post, author=post.author, parent=parent, text=rng.choice(REPLIES),
                )
                _set_created(Comment, reply.pk, when)

        for user in rng.sample(others, rng.randint(0, 3)):
            Bookmark.objects.get_or_create(post=post, user=user)

    def _notify(self, notification_type, recipient, actor, post, when, comment=None):
        if not recipient or not actor or recipient.id == actor.id:
            return
        notification = Notification.objects.create(
            type=notification_type, recipient=recipient, actor=actor, post=post, comment=comment,
        )
        read_at = when + timedelta(hours=2) if (self.now - when).days > 3 else None
        Notification.objects.filter(pk=notification.pk).update(created_at=when, read_at=read_at)

    # --- ledger punktowy z historycznymi datami ---

    def _txn(self, user, action, when, dedupe_key, source=None, points=None, metadata=None):
        rule_points = self.rules.get(action)
        points = points if points is not None else rule_points
        if points is None or not user:
            return
        if PointTransaction.objects.filter(user=user, action=action, dedupe_key=dedupe_key).exists():
            return
        ct = ContentType.objects.get_for_model(source.__class__) if source is not None else None
        txn = PointTransaction.objects.create(
            user=user, action=action, points=points, dedupe_key=dedupe_key,
            content_type=ct, object_id=source.pk if source is not None else None,
            metadata=metadata or {},
        )
        _set_created(PointTransaction, txn.pk, when)

    def _seed_ledger(self):
        self.rules = dict(PointRule.objects.filter(is_active=True).values_list('action', 'points'))
        posts = KaizenPost.objects.select_related('author').prefetch_related('approvals')
        for post in posts:
            self._txn(post.author, Action.IDEA_CREATED, post.created_at, f'idea_created:{post.pk}', post)
            approvals = sorted(post.approvals.all(), key=lambda a: a.order)
            final = [a for a in approvals if a.decision == Decision.APPROVED]
            if post.status in (Status.SUBMITTED, Status.IN_PROGRESS, Status.IMPLEMENTED):
                approved_at = final[-1].decided_at if final else post.created_at
                self._txn(post.author, Action.IDEA_APPROVED, approved_at, f'idea_approved:{post.pk}', post)
                if post.status == Status.IMPLEMENTED:
                    implemented_at = min(
                        approved_at + timedelta(days=30), self.now - timedelta(hours=1),
                    )
                    self._txn(post.author, Action.IDEA_IMPLEMENTED, implemented_at,
                              f'idea_implemented:{post.pk}', post)
            for approval in approvals:
                if approval.decision in (Decision.APPROVED, Decision.REJECTED) and approval.approver_id:
                    self._txn(approval.approver, Action.REVIEW_COMPLETED, approval.decided_at,
                              f'review:{approval.pk}', approval)

        for like in Like.objects.select_related('post__author'):
            if like.post.author_id != like.user_id:
                self._txn(like.post.author, Action.LIKE_RECEIVED, like.created_at,
                          f'like:{like.post_id}:{like.user_id}', like.post,
                          metadata={'from_user': like.user_id})

        for comment in Comment.objects.select_related('author'):
            self._txn(comment.author, Action.COMMENT_MADE, comment.created_at, f'comment:{comment.pk}', comment)

    def _seed_redemptions(self):
        """Kilka wymian nagród w różnych statusach dla najaktywniejszych użytkowników."""
        if PointTransaction.objects.filter(dedupe_key__startswith='demo_redemption:').exists():
            return  # wymiany demo już utworzone
        rng = random.Random(SEED + 7)
        rewards = list(Reward.objects.filter(is_active=True).order_by('cost_points'))
        admin = self.users['admin']
        statuses = [
            RewardRedemption.Status.DELIVERED, RewardRedemption.Status.APPROVED,
            RewardRedemption.Status.PENDING, RewardRedemption.Status.PENDING,
            RewardRedemption.Status.REJECTED,
        ]
        for username in sorted(self.users):
            user = self.users[username]
            balance = sum(PointTransaction.objects.filter(user=user).values_list('points', flat=True))
            for index in range(2):
                key = f'demo_redemption:{username}:{index}'
                affordable = [r for r in rewards if r.cost_points <= balance * 0.6]
                if not affordable or rng.random() < 0.35:
                    break
                reward = rng.choice(affordable)
                status = rng.choice(statuses)
                when = self.now - timedelta(days=rng.randint(1, 60))
                self._txn(user, Action.REWARD_REDEEMED, when, key, points=-reward.cost_points,
                          metadata={'reward_id': reward.id, 'reward_name': reward.name})
                redemption = RewardRedemption.objects.create(
                    user=user, reward=reward, points_spent=reward.cost_points, status=status,
                    handled_by=admin if status != RewardRedemption.Status.PENDING else None,
                    handled_at=when + timedelta(days=1) if status != RewardRedemption.Status.PENDING else None,
                    note='Odebrano w recepcji.' if status == RewardRedemption.Status.DELIVERED else (
                        'Brak na stanie, punkty zwrócone.' if status == RewardRedemption.Status.REJECTED else ''),
                )
                _set_created(RewardRedemption, redemption.pk, when)
                if status == RewardRedemption.Status.REJECTED:
                    self._txn(user, Action.REWARD_REDEEMED, when + timedelta(days=1), f'{key}:refund',
                              points=reward.cost_points, metadata={'refund_for': redemption.id})
                balance -= reward.cost_points

    def _recompute_profiles(self):
        User = get_user_model()
        for user in User.objects.all():
            engine.recompute_profile(user)
