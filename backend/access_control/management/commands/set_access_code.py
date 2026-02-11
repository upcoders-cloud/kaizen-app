import secrets
import string

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from access_control.models import AccessLoginCode
from access_control.services import (
    build_access_code_digest,
    is_valid_access_code_format,
    normalize_access_code,
)


class Command(BaseCommand):
    help = 'Sets or rotates per-user access login code (format XXXX-XXXX).'

    def add_arguments(self, parser):
        parser.add_argument('--username', required=True, help='Username for target user.')
        parser.add_argument('--code', help='Access code in XXXX-XXXX format.')
        parser.add_argument(
            '--generate',
            action='store_true',
            help='Generate random code in XXXX-XXXX format.',
        )

    def handle(self, *args, **options):
        username = options['username']
        provided_code = options.get('code')
        generate = options.get('generate', False)

        if bool(provided_code) == bool(generate):
            raise CommandError('Provide exactly one option: --code or --generate.')

        user_model = get_user_model()
        user = user_model.objects.filter(username=username).first()
        if not user:
            raise CommandError(f'User with username "{username}" does not exist.')

        code = self._generate_code() if generate else normalize_access_code(provided_code)

        if not is_valid_access_code_format(code):
            raise CommandError('Access code must match format XXXX-XXXX (A-Z, 0-9).')

        digest = build_access_code_digest(code)

        existing = AccessLoginCode.objects.filter(code_digest=digest).exclude(user=user).first()
        if existing:
            raise CommandError('Provided code is already used by another user. Use a different code.')

        _, created = AccessLoginCode.objects.update_or_create(
            user=user,
            defaults={
                'code_digest': digest,
                'is_active': True,
                'expires_at': None,
            },
        )

        action = 'Created' if created else 'Rotated'
        self.stdout.write(self.style.SUCCESS(f'{action} access code for user: {username}'))
        self.stdout.write(self.style.WARNING(f'Access code: {code}'))
        self.stdout.write('Share the code through a secure channel.')

    @staticmethod
    def _generate_code():
        alphabet = string.ascii_uppercase + string.digits
        raw = ''.join(secrets.choice(alphabet) for _ in range(8))
        return f'{raw[:4]}-{raw[4:]}'
