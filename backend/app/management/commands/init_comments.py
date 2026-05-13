import random

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from ideas.models import KaizenPost, Comment, Like, Bookmark


SAMPLE_COMMENTS = [
    'Świetny pomysł, to znacznie ułatwi pracę!',
    'Czy braliście pod uwagę koszty wdrożenia?',
    'Popieram, widziałem podobne rozwiązanie w innym dziale.',
    'Dobra robota!',
    'Możemy to przedyskutować na najbliższym spotkaniu?',
    'Zdecydowanie poprawi to bezpieczeństwo.',
    'Mam dokładnie ten sam problem od kilku tygodni.',
    'Ciekawe rozwiązanie, ale obawiam się o utrzymanie w czasie.',
]

# Treści replyów — niektóre z @mention'ami
SAMPLE_REPLIES = [
    'Zgadzam się, @{nick} podsuwa świetny pomysł.',
    'Dokładnie, popieram.',
    'Może @{nick} doprecyzuje koszty?',
    'A jak to wpłynie na zmianę nocną?',
    'Też miałem podobny pomysł — fajnie że ktoś to wreszcie napisał, @{nick}.',
]


def _random_subset(items, count):
    if count <= 0 or not items:
        return []
    count = min(count, len(items))
    return random.sample(items, count)


class Command(BaseCommand):
    help = 'Seeds the database with comments (incl. replies + @mentions), likes and bookmarks.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Usuwa istniejące komentarze, lajki i zakładki przed seedem.',
        )

    def handle(self, *args, **options):
        User = get_user_model()
        users = list(User.objects.exclude(is_superuser=True).order_by('username'))
        if not users:
            users = list(User.objects.order_by('username'))
        posts = list(KaizenPost.objects.order_by('id'))

        if not posts:
            self.stdout.write(self.style.ERROR('No posts found. Run init_posts first!'))
            return
        if not users:
            self.stdout.write(self.style.ERROR('No users found. Run init_users first!'))
            return

        if options.get('reset'):
            removed_comments, _ = Comment.objects.all().delete()
            removed_likes, _ = Like.objects.all().delete()
            removed_bookmarks, _ = Bookmark.objects.all().delete()
            self.stdout.write(self.style.WARNING(
                f'Removed {removed_comments} comments, {removed_likes} likes, {removed_bookmarks} bookmarks.'
            ))

        comments_created = self._seed_comments(posts, users)
        likes_created = self._seed_likes(posts, users)
        bookmarks_created = self._seed_bookmarks(posts, users)

        self.stdout.write(self.style.SUCCESS(
            f'Seeding done: {comments_created} comments, {likes_created} likes, {bookmarks_created} bookmarks.'
        ))

    # ----- Comments + replies + mentions -----

    def _seed_comments(self, posts, users):
        if Comment.objects.exists():
            self.stdout.write(self.style.WARNING('Comments already exist — skipping.'))
            return 0

        created = 0
        random.seed(42)  # powtarzalne losowanie żeby dane testowe były spójne

        # Dla pierwszych ~5 postów: 1-3 top-level komentarzy, każdy z 0-2 replyami
        for post_idx, post in enumerate(posts[:5]):
            top_level_count = random.randint(1, 3)
            top_level_authors = _random_subset(users, top_level_count)

            for top_author in top_level_authors:
                top_comment = Comment.objects.create(
                    post=post,
                    author=top_author,
                    text=random.choice(SAMPLE_COMMENTS),
                )
                created += 1

                replies_count = random.randint(0, 2)
                reply_authors = _random_subset(
                    [u for u in users if u.id != top_author.id],
                    replies_count,
                )
                for reply_author in reply_authors:
                    template = random.choice(SAMPLE_REPLIES)
                    mention_target = top_author.nickname or top_author.username
                    text = template.format(nick=mention_target)
                    Comment.objects.create(
                        post=post,
                        author=reply_author,
                        parent=top_comment,
                        text=text,
                    )
                    created += 1

        self.stdout.write(self.style.SUCCESS(f'Created {created} comments (with replies).'))
        return created

    # ----- Likes -----

    def _seed_likes(self, posts, users):
        if Like.objects.exists():
            self.stdout.write(self.style.WARNING('Likes already exist — skipping.'))
            return 0

        created = 0
        for post in posts[:6]:
            n = random.randint(1, min(5, len(users)))
            for user in random.sample(users, n):
                Like.objects.get_or_create(post=post, user=user)
                created += 1
        self.stdout.write(self.style.SUCCESS(f'Created {created} likes.'))
        return created

    # ----- Bookmarks -----

    def _seed_bookmarks(self, posts, users):
        if Bookmark.objects.exists():
            self.stdout.write(self.style.WARNING('Bookmarks already exist — skipping.'))
            return 0

        created = 0
        # Każdy user dostaje 2-3 zakładki losowane z dostępnych postów
        for user in users:
            n = min(random.randint(2, 3), len(posts))
            for post in random.sample(posts, n):
                _, was_created = Bookmark.objects.get_or_create(post=post, user=user)
                if was_created:
                    created += 1
        self.stdout.write(self.style.SUCCESS(f'Created {created} bookmarks.'))
        return created
