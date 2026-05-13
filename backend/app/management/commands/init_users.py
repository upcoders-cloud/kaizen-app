from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


# (username, email, is_admin, first_name, last_name, gender, role)
# Hasło zawsze == username (dane testowe, łatwiej się logować w QA).
USERS_TO_CREATE = [
    ('admin',     'admin@example.com',     True,  'Admin',    'User',         'unspecified', 'EMPLOYEE'),

    # Pracownicy
    ('user1234',  'user1234@example.com',  False, 'Jan',      'Kowalski',     'male',        'EMPLOYEE'),
    ('user2345',  'user2345@example.com',  False, 'Anna',     'Nowak',        'female',      'EMPLOYEE'),
    ('user3456',  'user3456@example.com',  False, 'Piotr',    'Zielinski',    'male',        'EMPLOYEE'),
    ('user4567',  'user4567@example.com',  False, 'Marta',    'Wisniewska',   'female',      'EMPLOYEE'),
    ('user5678',  'user5678@example.com',  False, 'Alex',     'Nowak',        'other',       'EMPLOYEE'),

    # Liderzy zespołu
    ('lead1',     'lead1@example.com',     False, 'Tomasz',   'Wójcik',       'male',        'TEAM_LEAD'),
    ('lead2',     'lead2@example.com',     False, 'Magdalena','Lewandowska',  'female',      'TEAM_LEAD'),

    # Kierownicy
    ('manager1',  'manager1@example.com',  False, 'Krzysztof','Mazur',        'male',        'MANAGER'),
    ('manager2',  'manager2@example.com',  False, 'Aleksandra','Dąbrowska',   'female',      'MANAGER'),

    # Dyrektor
    ('director1', 'director1@example.com', False, 'Wojciech', 'Kamiński',     'male',        'DIRECTOR'),
]


class Command(BaseCommand):
    help = 'Initializes the admin and test users (including roles: EMPLOYEE / TEAM_LEAD / MANAGER / DIRECTOR)'

    def handle(self, *args, **options):
        User = get_user_model()

        for username, email, is_admin, first_name, last_name, gender, role in USERS_TO_CREATE:
            password = username  # konwencja: hasło == login dla danych testowych
            user, created = User.objects.get_or_create(username=username, defaults={'email': email})
            if created:
                user.set_password(password)
                user.is_superuser = is_admin
                user.is_staff = is_admin
                user.first_name = first_name
                user.last_name = last_name
                user.gender = gender
                user.nickname = username
                user.role = role
                user.email = email
                user.save()
                self.stdout.write(self.style.SUCCESS(f'User "{username}" created ({role}).'))
                continue

            # Idempotentny update — uzupełniamy brakujące pola + zawsze resetujemy hasło
            # do konwencji "password == username" (łatwiejsze QA / testy ręczne).
            user.set_password(password)
            updated = True
            if not user.email:
                user.email = email
            if not user.nickname or user.nickname.startswith('User'):
                user.nickname = username
            if not user.first_name:
                user.first_name = first_name
            if not user.last_name:
                user.last_name = last_name
            if not user.gender or user.gender == 'unspecified':
                user.gender = gender
            if user.role != role:
                user.role = role
            if user.is_superuser != is_admin:
                user.is_superuser = is_admin
                user.is_staff = is_admin
            if updated:
                user.save()
                self.stdout.write(self.style.SUCCESS(f'User "{username}" updated ({role}, password reset).'))
