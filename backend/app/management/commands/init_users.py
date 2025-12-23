from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Initializes the admin and test users'

    def handle(self, *args, **options):
        User = get_user_model()
        users_to_create = [
            ('admin', 'admin@example.com', 'admin123', True),
            ('user1234', 'user1@example.com', 'user1234', False),
            ('user9876', 'user2@example.com', 'user9876', False),
        ]

        for username, email, password, is_admin in users_to_create:
            user, created = User.objects.get_or_create(username=username, email=email)
            if created:
                user.set_password(password)
                user.is_superuser = is_admin
                user.is_staff = is_admin
                user.save()
                self.stdout.write(self.style.SUCCESS(f'User "{username}" created.'))
            else:
                self.stdout.write(self.style.WARNING(f'User "{username}" already exists.'))
