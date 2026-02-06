from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError

from .models import AccessLoginCode
from .services import build_access_code_digest, is_valid_access_code_format, normalize_access_code


class AccessLoginCodeAdminForm(forms.ModelForm):
    plain_code = forms.CharField(
        required=False,
        max_length=9,
        help_text='Podaj kod w formacie XXXX-XXXX. Pole puste = bez zmiany kodu.',
        label='Access code (plain)',
    )

    class Meta:
        model = AccessLoginCode
        fields = ('user', 'is_active', 'expires_at', 'plain_code')

    def clean_plain_code(self):
        raw_value = self.cleaned_data.get('plain_code', '')
        if not raw_value:
            return ''

        normalized = normalize_access_code(raw_value)
        if not is_valid_access_code_format(normalized):
            raise ValidationError('Kod musi mieć format XXXX-XXXX (A-Z, 0-9).')
        return normalized

    def clean(self):
        cleaned_data = super().clean()
        plain_code = cleaned_data.get('plain_code')

        if not self.instance.pk and not plain_code:
            raise ValidationError({'plain_code': 'To pole jest wymagane przy tworzeniu rekordu.'})

        if plain_code:
            digest = build_access_code_digest(plain_code)
            qs = AccessLoginCode.objects.filter(code_digest=digest)
            if self.instance.pk:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise ValidationError({'plain_code': 'Ten kod jest już używany przez innego użytkownika.'})

        return cleaned_data

    def save(self, commit=True):
        instance = super().save(commit=False)
        plain_code = self.cleaned_data.get('plain_code')
        if plain_code:
            instance.code_digest = build_access_code_digest(plain_code)
        if commit:
            instance.save()
            self.save_m2m()
        return instance


@admin.register(AccessLoginCode)
class AccessLoginCodeAdmin(admin.ModelAdmin):
    form = AccessLoginCodeAdminForm
    list_display = ('user', 'is_active', 'last_used_at', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('user__username', 'user__email', 'user__nickname')
    readonly_fields = ('code_digest', 'created_at', 'updated_at', 'last_used_at')
    fields = ('user', 'is_active', 'expires_at', 'plain_code', 'code_digest', 'last_used_at', 'created_at', 'updated_at')
