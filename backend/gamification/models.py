from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class Action(models.TextChoices):
    """Akcje punktowane. Wartości w `PointRule` (config-driven)."""
    IDEA_CREATED = 'IDEA_CREATED', 'Zgłoszenie pomysłu'
    IDEA_APPROVED = 'IDEA_APPROVED', 'Pomysł zatwierdzony'
    IDEA_IMPLEMENTED = 'IDEA_IMPLEMENTED', 'Pomysł wdrożony'
    LIKE_RECEIVED = 'LIKE_RECEIVED', 'Otrzymany lajk'
    COMMENT_MADE = 'COMMENT_MADE', 'Dodany komentarz'
    REVIEW_COMPLETED = 'REVIEW_COMPLETED', 'Wykonana weryfikacja'
    REWARD_REDEEMED = 'REWARD_REDEEMED', 'Wymiana nagrody'


class PointRule(models.Model):
    """Konfiguracja ile punktów daje dana akcja. Edytowalne w adminie."""
    action = models.CharField(max_length=32, choices=Action.choices, unique=True)
    points = models.IntegerField(default=0)
    daily_cap = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Maks. liczba naliczeń tej akcji dziennie (puste = bez limitu).',
    )
    is_active = models.BooleanField(default=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = 'Reguła punktowa'
        verbose_name_plural = 'Reguły punktowe'

    def __str__(self):
        return f'{self.get_action_display()} → {self.points} pkt'


class PointTransaction(models.Model):
    """Niezmienny ledger zdarzeń punktowych — źródło prawdy."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='point_transactions',
    )
    action = models.CharField(max_length=32, choices=Action.choices)
    points = models.IntegerField()
    dedupe_key = models.CharField(
        max_length=255, blank=True, default='',
        help_text='Zapobiega podwójnemu naliczeniu tej samej akcji.',
    )
    content_type = models.ForeignKey(
        ContentType, on_delete=models.SET_NULL, null=True, blank=True,
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    source = GenericForeignKey('content_type', 'object_id')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Transakcja punktowa'
        verbose_name_plural = 'Transakcje punktowe'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'action', 'dedupe_key'],
                condition=~models.Q(dedupe_key=''),
                name='uniq_user_action_dedupe',
            ),
        ]

    def __str__(self):
        return f'{self.user_id}: {self.action} {self.points:+d}'


class Level(models.Model):
    """Progi poziomów. Config-driven."""
    name = models.CharField(max_length=80)
    min_points = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=0)
    color = models.CharField(max_length=9, default='#1d2b64')
    icon = models.CharField(max_length=40, default='star')

    class Meta:
        verbose_name = 'Poziom'
        verbose_name_plural = 'Poziomy'
        ordering = ['order']

    def __str__(self):
        return f'{self.name} (≥{self.min_points})'


class Badge(models.Model):
    class Criteria(models.TextChoices):
        POST_COUNT = 'POST_COUNT', 'Liczba pomysłów'
        LIKES_RECEIVED = 'LIKES_RECEIVED', 'Otrzymane lajki'
        IMPLEMENTED_COUNT = 'IMPLEMENTED_COUNT', 'Wdrożone pomysły'
        REVIEW_COUNT = 'REVIEW_COUNT', 'Wykonane weryfikacje'
        STREAK = 'STREAK', 'Passa dni'
        POINTS = 'POINTS', 'Łączne punkty'
        COMMENT_COUNT = 'COMMENT_COUNT', 'Liczba komentarzy'

    class Tier(models.TextChoices):
        BRONZE = 'BRONZE', 'Brąz'
        SILVER = 'SILVER', 'Srebro'
        GOLD = 'GOLD', 'Złoto'

    code = models.SlugField(max_length=60, unique=True)
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True)
    icon = models.CharField(max_length=40, default='award')
    criteria_type = models.CharField(max_length=32, choices=Criteria.choices)
    threshold = models.PositiveIntegerField(default=1)
    tier = models.CharField(max_length=10, choices=Tier.choices, default=Tier.BRONZE)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Odznaka'
        verbose_name_plural = 'Odznaki'
        ordering = ['order', 'threshold']

    def __str__(self):
        return f'{self.name} ({self.get_criteria_type_display()} ≥ {self.threshold})'


class UserBadge(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='badges',
    )
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='awarded_to')
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Przyznana odznaka'
        verbose_name_plural = 'Przyznane odznaki'
        unique_together = ('user', 'badge')
        ordering = ['-awarded_at']

    def __str__(self):
        return f'{self.user_id} → {self.badge.code}'


class UserGamificationProfile(models.Model):
    """Zdenormalizowany agregat dla szybkich odczytów (ranking, profil)."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='gamification',
    )
    total_points = models.IntegerField(default=0)
    level = models.ForeignKey(
        Level, on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Profil gamifikacji'
        verbose_name_plural = 'Profile gamifikacji'
        ordering = ['-total_points']
        indexes = [models.Index(fields=['-total_points'])]

    def __str__(self):
        return f'{self.user_id}: {self.total_points} pkt'


class Reward(models.Model):
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    cost_points = models.PositiveIntegerField()
    stock = models.PositiveIntegerField(
        null=True, blank=True, help_text='Puste = nielimitowane.',
    )
    icon = models.CharField(max_length=40, default='gift')
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Nagroda'
        verbose_name_plural = 'Nagrody'
        ordering = ['order', 'cost_points']

    def __str__(self):
        return f'{self.name} ({self.cost_points} pkt)'


class RewardRedemption(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Oczekuje'
        APPROVED = 'APPROVED', 'Zaakceptowana'
        DELIVERED = 'DELIVERED', 'Wydana'
        REJECTED = 'REJECTED', 'Odrzucona'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='redemptions',
    )
    reward = models.ForeignKey(Reward, on_delete=models.PROTECT, related_name='redemptions')
    points_spent = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='handled_redemptions',
    )
    handled_at = models.DateTimeField(null=True, blank=True)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Wymiana nagrody'
        verbose_name_plural = 'Wymiany nagród'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user_id} → {self.reward.name} ({self.status})'
