from django.conf import settings
from django.db import models


class AccessLoginCode(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='access_login_code',
    )
    code_digest = models.CharField(max_length=64, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Access login code'
        verbose_name_plural = 'Access login codes'

    def __str__(self):
        return f"Access code for {self.user}"  # pragma: no cover
