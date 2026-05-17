from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from ideas.models import KaizenPost, Category, PostApproval, PostSurvey
from ideas.services.approval import (
    COST_THRESHOLD_DIRECTOR,
    director_required,
    init_approvals,
)
from ideas.services.post_survey_calculator import calculate_survey_results

# Parametry ankiety per status — żeby analityka miała realne oszczędności.
SURVEY_PARAMS = {
    KaizenPost.Status.SUBMITTED: (3, 'WEEK', 4, 15),
    KaizenPost.Status.IN_PROGRESS: (2, 'DAY', 6, 20),
    KaizenPost.Status.IMPLEMENTED: (5, 'DAY', 8, 25),
}


def _attach_survey(post):
    params = SURVEY_PARAMS.get(post.status)
    if not params or hasattr(post, 'survey'):
        return
    fv, fu, ap, tl = params
    calc = calculate_survey_results(fv, fu, ap, tl)
    PostSurvey.objects.create(
        post=post,
        frequency_value=fv,
        frequency_unit=fu,
        affected_people=ap,
        time_lost_minutes=tl,
        estimated_time_savings_hours=calc['estimated_time_savings_hours'],
        estimated_financial_savings=calc['estimated_financial_savings'],
    )


# Posty testowe — workflow:
# - TO_VERIFY: tylko `assigned_manager`, brak kosztu/terminu (kierownik dopiero
#   uzupełni je przy akceptacji).
# - SUBMITTED/IN_PROGRESS/IMPLEMENTED: kierownik już zaakceptował, koszt i termin
#   są ustawione. Jeśli koszt > progu, dyrektor też zaakceptował.
# - CANCELLED: kierownik odrzucił przy decyzji (bez kosztu) albo dyrektor odrzucił
#   po akceptacji kierownika.
SAMPLE_POSTS = [
    # ----- TO_VERIFY (oczekujące na decyzję kierownika) -----
    {
        'title': 'Bezpieczniejsze stanowisko pakowania',
        'content': 'Dodanie osłon i oznaczeń poprawi bezpieczeństwo pracy. @user2345 — twoje uwagi?',
        'category_name': 'BHP',
        'status': KaizenPost.Status.TO_VERIFY,
        'manager': 'manager1',
        'author': 'user1234',
    },
    {
        'title': 'Nowe maty antypoślizgowe w hali',
        'content': 'Wymiana zużytych mat przy maszynach pakujących, kilka stanowisk.',
        'category_name': 'BHP',
        'status': KaizenPost.Status.TO_VERIFY,
        'manager': 'manager2',
        'author': 'user5678',
    },
    {
        'title': 'Wymiana całej linii pakującej',
        'content': 'Stara linia jest awaryjna — nowa zmniejszy przestoje i koszty serwisu. Inwestycja będzie duża, ale zwrot szybki.',
        'category_name': 'Usprawnienie Procesu',
        'status': KaizenPost.Status.TO_VERIFY,
        'manager': 'manager1',
        'author': 'user1234',
    },

    # ----- SUBMITTED (kierownik zaakceptował, koszt < progu) -----
    {
        'title': 'Drobne usprawnienie procesu pakowania',
        'content': 'Dodanie checklisty na końcu zmiany.',
        'category_name': 'Usprawnienie Procesu',
        'status': KaizenPost.Status.SUBMITTED,
        'estimated_cost': Decimal('400.00'),
        'deadline': date.today() + timedelta(days=14),
        'manager': 'manager2',
        'author': 'user2345',
    },

    # ----- SUBMITTED (kierownik+dyrektor, koszt > progu) -----
    {
        'title': 'Automatyczne raporty produkcyjne',
        'content': 'Skrypt zbiera dane z maszyn i wysyła raport mailem. Koszt licencji ~15k zł, ale ogromne oszczędności czasu kierowników.',
        'category_name': 'Usprawnienie Procesu',
        'status': KaizenPost.Status.SUBMITTED,
        'estimated_cost': Decimal('15500.00'),
        'deadline': date.today() + timedelta(days=60),
        'manager': 'manager1',
        'director': 'director1',
        'author': 'user4567',
    },

    # ----- IN_PROGRESS (kierownik zatwierdził, prace ruszyły) -----
    {
        'title': 'Skrócenie czasu przezbrojeń',
        'content': 'Standaryzacja narzędzi i checklisty skrócą zmianę linii.',
        'category_name': 'Usprawnienie Procesu',
        'status': KaizenPost.Status.IN_PROGRESS,
        'estimated_cost': Decimal('4800.00'),
        'deadline': date.today() + timedelta(days=21),
        'progress_percent': 40,
        'manager': 'manager1',
        'author': 'user2345',
    },
    {
        'title': 'Cotygodniowe spotkania Kaizen',
        'content': '15 minut na początku każdego tygodnia żeby zebrać pomysły działowe.',
        'category_name': 'Usprawnienie Procesu',
        'status': KaizenPost.Status.IN_PROGRESS,
        'estimated_cost': Decimal('0.00'),
        'deadline': date.today() + timedelta(days=7),
        'progress_percent': 65,
        'manager': 'manager2',
        'author': 'user4567',
    },

    # ----- IMPLEMENTED (zakończone) -----
    {
        'title': 'Lepsza kontrola jakości etykiet',
        'content': 'Wprowadzenie wzorca referencyjnego zmniejszy liczbę błędów.',
        'category_name': 'Jakość',
        'status': KaizenPost.Status.IMPLEMENTED,
        'estimated_cost': Decimal('2200.00'),
        'deadline': date.today() - timedelta(days=5),
        'progress_percent': 100,
        'manager': 'manager2',
        'author': 'user3456',
    },

    # ----- CANCELLED (odrzucone przez kierownika, bez kosztu) -----
    {
        'title': 'Tablice informacyjne BHP w 3 językach',
        'content': 'Mamy pracowników z zagranicy — tablice w PL/EN/UA zwiększą bezpieczeństwo.',
        'category_name': 'BHP',
        'status': KaizenPost.Status.CANCELLED,
        'manager': 'manager2',
        'author': 'user3456',
        'rejection_reason': 'Mamy już zaplanowany podobny projekt w Q3, połączymy z nim.',
    },
]


def _setup_approvals(post):
    """Tworzy rekordy aprobat odpowiednie dla statusu posta po seedzie."""
    now = timezone.now()

    if post.status == KaizenPost.Status.TO_VERIFY:
        # Tylko MANAGER stage pending (jak po normalnym utworzeniu posta).
        init_approvals(post)
        return

    if post.status == KaizenPost.Status.CANCELLED:
        # Kierownik odrzucił (zakładamy że nie zdążył wypełnić kosztu).
        PostApproval.objects.create(
            post=post,
            stage=PostApproval.Stage.MANAGER,
            order=1,
            approver=post.assigned_manager,
            decision=PostApproval.Decision.REJECTED,
            comment=post.rejection_reason,
            decided_at=now,
        )
        return

    # SUBMITTED / IN_PROGRESS / IMPLEMENTED
    PostApproval.objects.create(
        post=post,
        stage=PostApproval.Stage.MANAGER,
        order=1,
        approver=post.assigned_manager,
        decision=PostApproval.Decision.APPROVED,
        decided_at=now,
    )
    if director_required(post.estimated_cost) and post.assigned_director_id:
        PostApproval.objects.create(
            post=post,
            stage=PostApproval.Stage.DIRECTOR,
            order=2,
            approver=post.assigned_director,
            decision=PostApproval.Decision.APPROVED,
            decided_at=now,
        )


class Command(BaseCommand):
    help = 'Seeds the database with sample Kaizen posts (workflow: employee → manager → optional director).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Najpierw usuwa wszystkie istniejące posty i tworzy je od nowa.',
        )

    def handle(self, *args, **options):
        User = get_user_model()
        users_by_username = {u.username: u for u in User.objects.all()}
        if not users_by_username:
            self.stdout.write(self.style.ERROR('No users found. Run init_users first.'))
            return

        if options.get('reset'):
            deleted, _ = KaizenPost.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'Removed {deleted} existing post records.'))

        if KaizenPost.objects.exists():
            self.stdout.write(self.style.WARNING('Posts already exist. Skipping (use --reset to force).'))
            return

        categories_dict = {cat.name: cat for cat in Category.objects.all()}
        created_count = 0

        for data in SAMPLE_POSTS:
            category_obj = categories_dict.get(data['category_name'])
            if not category_obj:
                category_obj, _ = Category.objects.get_or_create(
                    name=data['category_name'],
                    defaults={'is_active': True},
                )
                categories_dict[data['category_name']] = category_obj

            author = users_by_username.get(data['author']) or next(iter(users_by_username.values()))
            manager = users_by_username.get(data.get('manager')) if data.get('manager') else None
            director = users_by_username.get(data.get('director')) if data.get('director') else None

            post = KaizenPost.objects.create(
                author=author,
                title=data['title'],
                content=data['content'],
                category=category_obj,
                status=data.get('status', KaizenPost.Status.TO_VERIFY),
                estimated_cost=data.get('estimated_cost'),
                deadline=data.get('deadline'),
                progress_percent=data.get('progress_percent', 0),
                assigned_manager=manager,
                assigned_director=director,
                rejection_reason=data.get('rejection_reason'),
            )
            _setup_approvals(post)
            _attach_survey(post)
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f'Created {created_count} sample posts (with approvals).'))
