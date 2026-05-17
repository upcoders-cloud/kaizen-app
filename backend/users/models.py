from django.db import models
from django.contrib.auth.models import AbstractUser
import random


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Nazwa działu")
    is_active = models.BooleanField(default=True, verbose_name="Czy aktywny?")

    class Meta:
        verbose_name = "Dział"
        verbose_name_plural = "Działy"
        ordering = ['name']

    def __str__(self):
        return self.name


class CustomUser(AbstractUser):
    class Meta:
        verbose_name = "Użytkownik"
        verbose_name_plural = "Użytkownicy"

    class Role(models.TextChoices):
        EMPLOYEE = 'EMPLOYEE', 'Pracownik'
        TEAM_LEAD = 'TEAM_LEAD', 'Lider zespołu'
        MANAGER = 'MANAGER', 'Kierownik'
        DIRECTOR = 'DIRECTOR', 'Dyrektor'

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
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.EMPLOYEE,
        verbose_name="Rola",
    )
    avatar = models.ImageField(
        upload_to='avatars/%Y/%m/',
        null=True,
        blank=True,
        verbose_name='Awatar',
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='members',
        verbose_name='Dział',
    )

    def save(self, *args, **kwargs):
        if not self.nickname:
            # Prosty generator losowego nicku jeśli pusty
            self.nickname = f"User{random.randint(1000, 9999)}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nickname
