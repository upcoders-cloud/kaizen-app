from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Initializes the admin and test users'

    def handle(self, *args, **options):
        User = get_user_model()
        users_to_create = [
            ('admin', 'admin@example.com', 'admin123', True, 'Admin', 'User', 'unspecified'),
            ('user1234', 'user1234@example.com', 'user1234', False, 'Jan', 'Kowalski', 'male'),
            ('user2345', 'user2345@example.com', 'user2345', False, 'Anna', 'Nowak', 'female'),
            ('user3456', 'user3456@example.com', 'user3456', False, 'Piotr', 'Zielinski', 'male'),
            ('user4567', 'user4567@example.com', 'user4567', False, 'Marta', 'Wisniewska', 'female'),
            ('user5678', 'user5678@example.com', 'user5678', False, 'Alex', 'Nowak', 'other'),
        ]

        for username, email, password, is_admin, first_name, last_name, gender in users_to_create:
            user, created = User.objects.get_or_create(username=username, email=email)
            if created:
                user.set_password(password)
                user.is_superuser = is_admin
                user.is_staff = is_admin
                user.first_name = first_name
                user.last_name = last_name
                user.gender = gender
                user.nickname = username
                user.save()
                self.stdout.write(self.style.SUCCESS(f'User "{username}" created.'))
            else:
                updated = False
                if not user.nickname or user.nickname.startswith('User'):
                    user.nickname = username
                    updated = True
                if not user.first_name:
                    user.first_name = first_name
                    updated = True
                if not user.last_name:
                    user.last_name = last_name
                    updated = True
                if not user.gender or user.gender == 'unspecified':
                    user.gender = gender
                    updated = True
                if updated:
                    user.save()
                    self.stdout.write(self.style.SUCCESS(f'User "{username}" updated.'))
                else:
                    self.stdout.write(self.style.WARNING(f'User "{username}" already exists.'))
