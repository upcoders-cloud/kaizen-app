import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from ideas.models import KaizenPost


class Command(BaseCommand):
    help = 'Seeds the database with initial Kaizen posts'

    def handle(self, *args, **options):
        User = get_user_model()
        users = User.objects.all()

        if not users.exists():
            self.stdout.write(self.style.ERROR('No users found. Run init_users first!'))
            return

        if KaizenPost.objects.exists():
            self.stdout.write(self.style.WARNING('Posts already exist. Skipping seeding.'))
            return

        sample_data = [
            ("Lepsze oświetlenie na kontroli jakości.", "BHP"),
            ("Optymalizacja ułożenia palet w sektorze C.", "PROCES"),
            ("Nowy system weryfikacji kodów kreskowych.", "JAKOSC"),
            ("Naprawa klimatyzacji w kantynie.", "INNE"),
            ("Wymiana zużytych mat antyzmęczeniowych.", "BHP"),
        ]

        for content, category in sample_data:
            author = random.choice(users)
            KaizenPost.objects.create(
                author=author,
                content=content,
                category=category
            )

        self.stdout.write(self.style.SUCCESS(f'Successfully added {len(sample_data)} posts.'))
