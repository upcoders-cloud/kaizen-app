from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from ideas.models import KaizenPost, Category


class Command(BaseCommand):
    help = 'Seeds the database with initial Kaizen posts'

    def handle(self, *args, **options):
        User = get_user_model()
        users = list(User.objects.filter(is_superuser=False).order_by('username'))
        if not users:
            users = list(User.objects.order_by('username'))

        if not users:
            self.stdout.write(self.style.ERROR('No users found.'))
            return

        if KaizenPost.objects.exists():
            self.stdout.write(self.style.WARNING('Posts already exist. Skipping.'))
            return

        # 1. Zmieniamy sample_data tak, aby nazwy kategorii odpowiadały tym z bazy
        sample_data = [
            {
                "title": "Bezpieczniejsze stanowisko pakowania",
                "content": "Dodanie osłon i oznaczeń poprawi bezpieczeństwo pracy.",
                "category_name": "BHP",  # Dokładna nazwa z bazy
                "status": KaizenPost.Status.TO_VERIFY,
            },
            {
                "title": "Skrócenie czasu przezbrojeń",
                "content": "Standaryzacja narzędzi i checklisty skrócą zmianę linii.",
                "category_name": "Usprawnienie Procesu",  # Dokładna nazwa z bazy
                "status": KaizenPost.Status.IN_PROGRESS,
            },
            {
                "title": "Lepsza kontrola jakości etykiet",
                "content": "Wprowadzenie wzorca referencyjnego zmniejszy liczbę błędów.",
                "category_name": "Jakość",  # Dokładna nazwa z bazy
                "status": KaizenPost.Status.IMPLEMENTED,
            },
        ]

        # 2. Pobieramy wszystkie kategorie do słownika { nazwa: obiekt }
        # To pozwala nam uniknąć błędów literówek i oszczędza bazę
        categories_dict = {cat.name: cat for cat in Category.objects.all()}

        created_count = 0
        for index, data in enumerate(sample_data):
            author = users[index % len(users)]

            # 3. Pobieramy obiekt kategorii ze słownika na podstawie nazwy
            category_obj = categories_dict.get(data["category_name"])

            # Jeśli kategorii nie ma w słowniku, stwórz ją "w locie" (zabezpieczenie)
            if not category_obj:
                category_obj, _ = Category.objects.get_or_create(
                    name=data["category_name"],
                    defaults={'is_active': True}
                )

            KaizenPost.objects.create(
                author=author,
                title=data["title"],
                content=data["content"],
                category=category_obj,  # Przypisujemy obiekt, nie tekst!
                status=data.get("status", KaizenPost.Status.TO_VERIFY),
            )
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully added {created_count} posts.'))