from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from ideas.models import KaizenPost


class Command(BaseCommand):
    help = 'Seeds the database with initial Kaizen posts'

    def handle(self, *args, **options):
        User = get_user_model()
        users = list(User.objects.filter(is_superuser=False).order_by('username'))
        if not users:
            users = list(User.objects.order_by('username'))

        if not users:
            self.stdout.write(self.style.ERROR('No users found. Run init_users first!'))
            return

        posts_exist = KaizenPost.objects.exists()
        if posts_exist:
            self.stdout.write(self.style.WARNING('Posts already exist. Skipping seeding.'))

        sample_data = [
            {
                "title": "Bezpieczniejsze stanowisko pakowania",
                "content": "Dodanie osłon i oznaczeń poprawi bezpieczeństwo pracy.",
                "category": "BHP",
                "status": KaizenPost.Status.TO_VERIFY,
            },
            {
                "title": "Skrócenie czasu przezbrojeń",
                "content": "Standaryzacja narzędzi i checklisty skrócą zmianę linii.",
                "category": "PROCES",
                "status": KaizenPost.Status.IN_PROGRESS,
            },
            {
                "title": "Lepsza kontrola jakości etykiet",
                "content": "Wprowadzenie wzorca referencyjnego zmniejszy liczbę błędów.",
                "category": "JAKOSC",
                "status": KaizenPost.Status.IMPLEMENTED,
            },
        ]

        if not posts_exist:
            users_by_username = {user.username: user for user in users}
            for index, data in enumerate(sample_data):
                if index == 0 and 'user1234' in users_by_username:
                    author = users_by_username['user1234']
                else:
                    author = users[index % len(users)]
                KaizenPost.objects.create(
                    author=author,
                    title=data["title"],
                    content=data["content"],
                    category=data["category"],
                    status=data.get("status", KaizenPost.Status.TO_VERIFY),
                )
            self.stdout.write(self.style.SUCCESS(f'Successfully added {len(sample_data)} posts.'))
