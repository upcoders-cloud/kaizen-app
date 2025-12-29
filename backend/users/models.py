from django.db import models
from django.contrib.auth.models import AbstractUser
import random


class CustomUser(AbstractUser):
    class Meta:
        verbose_name = "Użytkownik"
        verbose_name_plural = "Użytkownicy"

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('unspecified', 'Unspecified'),
    ]

    # Pola standardowe (username, password, first_name) dziedziczymy z AbstractUser
    microsoft_oid = models.CharField(max_length=255, unique=True, null=True, blank=True)
    nickname = models.CharField(max_length=50, unique=True)
    is_verified = models.BooleanField(default=True) # Domyślnie aktywny
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, default='unspecified')

    def save(self, *args, **kwargs):
        if not self.nickname:
            # Prosty generator losowego nicku jeśli pusty
            self.nickname = f"User{random.randint(1000, 9999)}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nickname
