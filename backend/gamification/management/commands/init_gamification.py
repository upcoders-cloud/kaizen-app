"""
Seeduje konfigurację gamifikacji (reguły/poziomy/odznaki/nagrody/działy)
i wykonuje backfill punktów z istniejących danych (posty, lajki, komentarze,
weryfikacje) przez ledger + recompute profili.

Idempotentne. `--reset` czyści transakcje/profile/odznaki/wymiany przed backfillem.
"""
import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from gamification.models import (
    Action,
    Badge,
    Level,
    PointRule,
    PointTransaction,
    Reward,
    RewardRedemption,
    UserBadge,
)
from gamification.services import engine
from users.models import Department


POINT_RULES = [
    (Action.IDEA_CREATED, 5, None, 'Zgłoszenie nowego pomysłu'),
    (Action.IDEA_APPROVED, 15, None, 'Pomysł zaakceptowany przez kierownika'),
    (Action.IDEA_IMPLEMENTED, 50, None, 'Pomysł wdrożony'),
    (Action.LIKE_RECEIVED, 2, None, 'Ktoś polubił Twój pomysł'),
    (Action.COMMENT_MADE, 1, 10, 'Dodanie komentarza (maks. 10/dzień)'),
    (Action.REVIEW_COMPLETED, 5, None, 'Wykonanie weryfikacji zgłoszenia'),
    (Action.REWARD_REDEEMED, 0, None, 'Wymiana nagrody (transakcja ujemna)'),
]

LEVELS = [
    ('Junior Innowator', 0, 1, '#94a3b8', 'feather'),
    ('Innowator', 100, 2, '#38bdf8', 'zap'),
    ('Senior Innowator', 300, 3, '#6366f1', 'star'),
    ('Ekspert Kaizen', 700, 4, '#a855f7', 'target'),
    ('Master Kaizen', 1500, 5, '#f59e0b', 'award'),
]

BADGES = [
    ('first-idea', 'Pierwszy pomysł', 'Zgłoś swój pierwszy pomysł', 'edit-3', Badge.Criteria.POST_COUNT, 1, Badge.Tier.BRONZE, 1),
    ('ideas-10', 'Pomysłodawca', '10 zgłoszonych pomysłów', 'edit', Badge.Criteria.POST_COUNT, 10, Badge.Tier.SILVER, 2),
    ('ideas-25', 'Maszyna pomysłów', '25 zgłoszonych pomysłów', 'cpu', Badge.Criteria.POST_COUNT, 25, Badge.Tier.GOLD, 3),
    ('popular-author', 'Popularny autor', '50 otrzymanych lajków', 'heart', Badge.Criteria.LIKES_RECEIVED, 50, Badge.Tier.SILVER, 4),
    ('implemented-1', 'Sprawczy', 'Pierwszy wdrożony pomysł', 'check-circle', Badge.Criteria.IMPLEMENTED_COUNT, 1, Badge.Tier.SILVER, 5),
    ('implemented-5', 'Realizator', '5 wdrożonych pomysłów', 'trending-up', Badge.Criteria.IMPLEMENTED_COUNT, 5, Badge.Tier.GOLD, 6),
    ('top-reviewer', 'Top recenzent', '25 wykonanych weryfikacji', 'shield', Badge.Criteria.REVIEW_COUNT, 25, Badge.Tier.GOLD, 7),
    ('streak-7', 'Tydzień w akcji', '7-dniowa passa', 'calendar', Badge.Criteria.STREAK, 7, Badge.Tier.BRONZE, 8),
    ('streak-30', 'Niezłomny', '30-dniowa passa', 'zap', Badge.Criteria.STREAK, 30, Badge.Tier.GOLD, 9),
    ('points-500', 'Zbieracz', '500 punktów łącznie', 'star', Badge.Criteria.POINTS, 500, Badge.Tier.SILVER, 10),
]

REWARDS = [
    ('Kubek Kaizen', 'Firmowy kubek z logo', 100, None, 'coffee', 1),
    ('Bon kawowy', 'Bon na kawę w bufecie', 200, 50, 'coffee', 2),
    ('Voucher 50 zł', 'Voucher do wykorzystania w sklepie', 500, 20, 'gift', 3),
    ('Dodatkowy dzień wolny', 'Jeden dzień urlopu extra', 2000, 5, 'sun', 4),
]

DEPARTMENTS = ['Produkcja', 'Logistyka', 'Jakość', 'IT', 'BHP', 'Administracja']


class Command(BaseCommand):
    help = 'Seeds gamification config and backfills points from existing data.'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true',
                            help='Czyści ledger/profile/odznaki/wymiany przed backfillem.')

    def handle(self, *args, **options):
        self._seed_config()
        self._seed_departments()

        if options.get('reset'):
            RewardRedemption.objects.all().delete()
            UserBadge.objects.all().delete()
            PointTransaction.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared ledger / badges / redemptions.'))

        self._backfill()
        self.stdout.write(self.style.SUCCESS('Gamification seeding + backfill done.'))

    def _seed_config(self):
        for action, points, cap, desc in POINT_RULES:
            PointRule.objects.update_or_create(
                action=action,
                defaults={'points': points, 'daily_cap': cap, 'description': desc, 'is_active': True},
            )
        for name, mp, order, color, icon in LEVELS:
            Level.objects.update_or_create(
                order=order,
                defaults={'name': name, 'min_points': mp, 'color': color, 'icon': icon},
            )
        for code, name, desc, icon, crit, thr, tier, order in BADGES:
            Badge.objects.update_or_create(
                code=code,
                defaults={
                    'name': name, 'description': desc, 'icon': icon,
                    'criteria_type': crit, 'threshold': thr, 'tier': tier,
                    'order': order, 'is_active': True,
                },
            )
        for name, desc, cost, stock, icon, order in REWARDS:
            Reward.objects.update_or_create(
                name=name,
                defaults={
                    'description': desc, 'cost_points': cost, 'stock': stock,
                    'icon': icon, 'order': order, 'is_active': True,
                },
            )
        self.stdout.write(self.style.SUCCESS(
            f'Config: {PointRule.objects.count()} rules, {Level.objects.count()} levels, '
            f'{Badge.objects.count()} badges, {Reward.objects.count()} rewards.'
        ))

    def _seed_departments(self):
        User = get_user_model()
        depts = []
        for name in DEPARTMENTS:
            d, _ = Department.objects.get_or_create(name=name)
            depts.append(d)
        # Przypisz dział userom bez działu (deterministycznie)
        random.seed(7)
        unassigned = User.objects.filter(department__isnull=True)
        for u in unassigned:
            u.department = random.choice(depts)
            u.save(update_fields=['department'])
        self.stdout.write(self.style.SUCCESS(f'Departments: {len(depts)} (assigned to users).'))

    @transaction.atomic
    def _backfill(self):
        """Odtwarza transakcje z istniejących danych w porządku chronologicznym."""
        from ideas.models import Comment, KaizenPost, Like, PostApproval

        # Pomijamy jeśli ledger niepusty (idempotencja bez --reset)
        if PointTransaction.objects.exists():
            self.stdout.write(self.style.WARNING('Ledger not empty — skipping backfill (use --reset).'))
            return

        User = get_user_model()
        users = set()

        for post in KaizenPost.objects.all():
            engine.award(post.author, Action.IDEA_CREATED, source=post,
                         dedupe_key=f'idea_created:{post.pk}')
            users.add(post.author_id)
            if post.status == KaizenPost.Status.SUBMITTED:
                engine.award(post.author, Action.IDEA_APPROVED, source=post,
                             dedupe_key=f'idea_approved:{post.pk}')
            elif post.status == KaizenPost.Status.IMPLEMENTED:
                engine.award(post.author, Action.IDEA_APPROVED, source=post,
                             dedupe_key=f'idea_approved:{post.pk}')
                engine.award(post.author, Action.IDEA_IMPLEMENTED, source=post,
                             dedupe_key=f'idea_implemented:{post.pk}')

        for like in Like.objects.select_related('post'):
            author = like.post.author
            if author and author.id != like.user_id:
                engine.award(author, Action.LIKE_RECEIVED, source=like.post,
                             dedupe_key=f'like:{like.post_id}:{like.user_id}')
                users.add(author.id)

        for c in Comment.objects.all():
            engine.award(c.author, Action.COMMENT_MADE, source=c,
                         dedupe_key=f'comment:{c.pk}')
            users.add(c.author_id)

        for a in PostApproval.objects.exclude(
            decision=PostApproval.Decision.PENDING
        ).exclude(decision=PostApproval.Decision.SKIPPED):
            if a.approver_id:
                engine.award(a.approver, Action.REVIEW_COMPLETED, source=a,
                             dedupe_key=f'review:{a.pk}')
                users.add(a.approver_id)

        # Pełne przeliczenie profili (punkty, poziom, passa, odznaki)
        for uid in users:
            engine.recompute_profile(User.objects.get(id=uid))

        self.stdout.write(self.style.SUCCESS(
            f'Backfill: {PointTransaction.objects.count()} transactions, '
            f'{len(users)} profiles recomputed.'
        ))
