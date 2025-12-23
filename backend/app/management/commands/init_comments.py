import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from ideas.models import KaizenPost, Comment  # Adjust your_app name


class Command(BaseCommand):
    help = 'Seeds the database with initial comments for Kaizen posts'

    def handle(self, *args, **options):
        User = get_user_model()
        users = list(User.objects.all())
        posts = KaizenPost.objects.all()

        if not posts.exists():
            self.stdout.write(self.style.ERROR('No posts found. Run init_posts first!'))
            return

        if Comment.objects.exists():
            self.stdout.write(self.style.WARNING('Comments already exist. Skipping seeding.'))
            return

        sample_comments = [
            "Świetny pomysł, to znacznie ułatwi pracę!",
            "Czy braliście pod uwagę koszty wdrożenia?",
            "Popieram, widziałem podobne rozwiązanie w innym dziale.",
            "Dobra robota!",
            "Możemy to przedyskutować na najbliższym spotkaniu?",
            "Zdecydowanie poprawi to bezpieczeństwo.",
        ]

        comment_count = 0
        for post in posts:
            # Add 1 to 3 random comments per post
            num_comments = random.randint(1, 3)
            for _ in range(num_comments):
                Comment.objects.create(
                    post=post,
                    author=random.choice(users),
                    text=random.choice(sample_comments)
                )
                comment_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully added {comment_count} comments.'))
