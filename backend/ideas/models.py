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


    title = models.CharField(max_length=200, verbose_name="Tytuł")

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField(verbose_name="Treść")
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,  # Zabezpiecza przed usunięciem kategorii, która ma posty
        verbose_name="Kategoria",
        limit_choices_to={'is_active': True}  # To kluczowy element Twojej prośby
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TO_VERIFY,
        verbose_name="Status",
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

    post = models.ForeignKey(KaizenPost, related_name='comments', on_delete=models.CASCADE)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class Like(models.Model):
    post = models.ForeignKey(KaizenPost, related_name='likes', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    class Meta:
        verbose_name = "Polubienie"  # Liczba pojedyncza
        verbose_name_plural = "Polubienia"  # Liczba mnoga (to pokaże się w Adminie)
        unique_together = ('post', 'user') # Jeden like na usera per post


class Notification(models.Model):
    class Type(models.TextChoices):
        LIKE = "LIKE", "Like"
        COMMENT = "COMMENT", "Comment"

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
