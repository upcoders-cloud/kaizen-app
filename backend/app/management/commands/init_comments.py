import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from ideas.models import KaizenPost, Comment, Like


class Command(BaseCommand):
    help = 'Seeds the database with initial comments for Kaizen posts'

    def handle(self, *args, **options):
        User = get_user_model()
        users = list(User.objects.order_by('username'))
        posts = list(KaizenPost.objects.order_by('id'))

        if not posts:
            self.stdout.write(self.style.ERROR('No posts found. Run init_posts first!'))
            return

        if not users:
            self.stdout.write(self.style.ERROR('No users found. Run init_users first!'))
            return

        sample_comments = [
            "Świetny pomysł, to znacznie ułatwi pracę!",
            "Czy braliście pod uwagę koszty wdrożenia?",
            "Popieram, widziałem podobne rozwiązanie w innym dziale.",
            "Dobra robota!",
            "Możemy to przedyskutować na najbliższym spotkaniu?",
            "Zdecydowanie poprawi to bezpieczeństwo.",
        ]

        if Comment.objects.exists():
            self.stdout.write(self.style.WARNING('Comments already exist. Skipping seeding.'))
        else:
            comment_counts = [0, 2, 4]
            comment_count = 0
            for index, post in enumerate(posts[:3]):
                num_comments = comment_counts[index]
                for _ in range(num_comments):
                    Comment.objects.create(
                        post=post,
                        author=random.choice(users),
                        text=random.choice(sample_comments)
                    )
                    comment_count += 1
            self.stdout.write(self.style.SUCCESS(f'Successfully added {comment_count} comments.'))

        if Like.objects.exists():
            self.stdout.write(self.style.WARNING('Likes already exist. Skipping seeding.'))
            return

        like_counts = [2, 3, 4]
        like_count = 0
        for index, post in enumerate(posts[:3]):
            num_likes = min(like_counts[index], len(users))
            for user in random.sample(users, num_likes):
                Like.objects.create(post=post, user=user)
                like_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully added {like_count} likes.'))
