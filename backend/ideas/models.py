from django.db import models
from django.conf import settings

class KaizenPost(models.Model):
    class Meta:
        verbose_name = "Post"  # Liczba pojedyncza
        verbose_name_plural = "Posty"  # Liczba mnoga (to pokaże się w Adminie)

    CATEGORY_CHOICES = [
        ('BHP', 'BHP'),
        ('PROCES', 'Usprawnienie Procesu'),
        ('JAKOSC', 'Jakość'),
        ('INNE', 'Inne'),
    ]

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='INNE')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category}: {self.content[:20]}..."

    @property
    def likes_count(self):
        return self.likes.count()

    @property
    def comments_count(self):
        return self.comments.count()

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