from django.db import models
from django.conf import settings


class Category(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nazwa kategorii")
    is_active = models.BooleanField(default=True, verbose_name="Czy aktywna?")

    class Meta:
        verbose_name = "Kategoria"
        verbose_name_plural = "Kategorie"

    def __str__(self):
        return self.name


class KaizenPost(models.Model):
    class Meta:
        verbose_name = "Post"
        verbose_name_plural = "Posty"

    class Status(models.TextChoices):
        TO_VERIFY = "TO_VERIFY", "Do weryfikacji"
        SUBMITTED = "SUBMITTED", "Zgłoszony"
        IN_PROGRESS = "IN_PROGRESS", "W trakcie wdrożenia"
        IMPLEMENTED = "IMPLEMENTED", "Wdrożone"
        CANCELLED = "CANCELLED", "Odrzucony"

    title = models.CharField(max_length=200, verbose_name="Tytuł")

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField(verbose_name="Treść")
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        verbose_name="Kategoria",
        limit_choices_to={'is_active': True}
    )
    assigned_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_posts',
        verbose_name="Przypisany kierownik",
    )
    assigned_team_lead = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='team_lead_posts',
        verbose_name="Przypisany lider zespołu",
    )
    assigned_director = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='director_posts',
        verbose_name="Przypisany dyrektor",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TO_VERIFY,
        verbose_name="Status",
    )
    rejection_reason = models.TextField(
        null=True,
        blank=True,
        verbose_name="Powód odrzucenia",
    )
    estimated_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Szacowany koszt wdrożenia (zł)",
    )
    deadline = models.DateField(
        null=True,
        blank=True,
        verbose_name="Termin wdrożenia",
    )
    progress_percent = models.PositiveSmallIntegerField(
        default=0,
        verbose_name="Postęp wdrożenia (%)",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # Updated to show title and category in admin lists
        return f"[{self.category.name}] {self.title}"

    @property
    def likes_count(self):
        return self.likes.count()

    @property
    def comments_count(self):
        return self.comments.count()


class PostImage(models.Model):
    """
    Model specifically for handling multiple image attachments
    linked to a single KaizenPost.
    """

    class Type(models.TextChoices):
        GENERAL = 'GENERAL', 'Załącznik'
        BEFORE = 'BEFORE', 'Przed wdrożeniem'
        AFTER = 'AFTER', 'Po wdrożeniu'

    type = models.CharField(
        max_length=10,
        choices=Type.choices,
        default=Type.GENERAL,
        verbose_name="Typ zdjęcia",
    )
    post = models.ForeignKey(
        KaizenPost,
        related_name='images',
        on_delete=models.CASCADE
    )
    image = models.ImageField(
        upload_to='kaizen_attachments/%Y/%m/%d/',
        verbose_name="Zdjęcie"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Załącznik (Zdjęcie)"
        verbose_name_plural = "Załączniki (Zdjęcia)"

    def __str__(self):
        return f"Zdjęcie do postu: {self.post.title}"


class PostSurvey(models.Model):
    class FrequencyUnit(models.TextChoices):
        DAY = "DAY", "Dzień"
        WEEK = "WEEK", "Tydzień"
        MONTH = "MONTH", "Miesiąc"

    post = models.OneToOneField(
        KaizenPost,
        related_name='survey',
        on_delete=models.CASCADE
    )
    frequency_value = models.PositiveIntegerField(verbose_name="Częstotliwość")
    frequency_unit = models.CharField(
        max_length=10,
        choices=FrequencyUnit.choices,
        verbose_name="Jednostka częstotliwości",
    )
    affected_people = models.PositiveIntegerField(verbose_name="Liczba osób")
    time_lost_minutes = models.PositiveIntegerField(verbose_name="Strata czasu (min)")
    estimated_time_savings_hours = models.FloatField(verbose_name="Szacowane oszczędności czasu (h)")
    estimated_financial_savings = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Szacowane oszczędności finansowe",
    )

    class Meta:
        verbose_name = "Ankieta do postu"
        verbose_name_plural = "Ankiety do postów"

    def __str__(self):
        return f"Ankieta dla postu: {self.post.title}"


class Comment(models.Model):
    class Meta:
        verbose_name = "Komentarz"  # Liczba pojedyncza
        verbose_name_plural = "Komentarze"  # Liczba mnoga (to pokaże się w Adminie)
        ordering = ['created_at']

    post = models.ForeignKey(KaizenPost, related_name='comments', on_delete=models.CASCADE)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    parent = models.ForeignKey(
        'self',
        related_name='replies',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        verbose_name='Odpowiedź na',
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class Like(models.Model):
    post = models.ForeignKey(KaizenPost, related_name='likes', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    class Meta:
        verbose_name = "Polubienie"  # Liczba pojedyncza
        verbose_name_plural = "Polubienia"  # Liczba mnoga (to pokaże się w Adminie)
        unique_together = ('post', 'user') # Jeden like na usera per post


class Bookmark(models.Model):
    post = models.ForeignKey(KaizenPost, related_name='bookmarks', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='bookmarks', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Zakładka"
        verbose_name_plural = "Zakładki"
        unique_together = ('post', 'user')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]


class Notification(models.Model):
    class Type(models.TextChoices):
        LIKE = "LIKE", "Like"
        COMMENT = "COMMENT", "Comment"
        REPLY = "REPLY", "Reply to comment"
        MENTION = "MENTION", "Mention"
        APPROVED = "APPROVED", "Post approved"
        REJECTED = "REJECTED", "Post rejected"
        ASSIGNED = "ASSIGNED", "Assigned for review"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='notifications',
        on_delete=models.CASCADE
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='sent_notifications',
        on_delete=models.CASCADE
    )
    post = models.ForeignKey(
        KaizenPost,
        related_name='notifications',
        on_delete=models.CASCADE
    )
    comment = models.ForeignKey(
        Comment,
        related_name='notifications',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    type = models.CharField(max_length=20, choices=Type.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Powiadomienie"
        verbose_name_plural = "Powiadomienia"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'read_at']),
            models.Index(fields=['recipient', 'created_at']),
        ]

    @property
    def is_read(self):
        return self.read_at is not None


class PostApproval(models.Model):
    """Pojedynczy etap w wieloetapowej ścieżce akceptacji posta."""

    class Stage(models.TextChoices):
        TEAM_LEAD = 'TEAM_LEAD', 'Lider zespołu'
        MANAGER = 'MANAGER', 'Kierownik'
        DIRECTOR = 'DIRECTOR', 'Dyrektor'

    class Decision(models.TextChoices):
        PENDING = 'PENDING', 'Oczekuje'
        APPROVED = 'APPROVED', 'Zaakceptowane'
        REJECTED = 'REJECTED', 'Odrzucone'
        SKIPPED = 'SKIPPED', 'Pominięte'

    post = models.ForeignKey(
        KaizenPost,
        related_name='approvals',
        on_delete=models.CASCADE,
    )
    stage = models.CharField(max_length=20, choices=Stage.choices)
    order = models.PositiveSmallIntegerField(default=0)
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='post_approvals',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    decision = models.CharField(
        max_length=10,
        choices=Decision.choices,
        default=Decision.PENDING,
    )
    comment = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Etap akceptacji"
        verbose_name_plural = "Etapy akceptacji"
        unique_together = ('post', 'stage')
        ordering = ['order']
