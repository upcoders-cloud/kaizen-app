from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from gamification.models import PointTransaction, RewardRedemption
from ideas.models import Comment, KaizenPost, Like, PostApproval
from users.models import Department


class InitDemoTests(TestCase):
    def test_idempotent_and_consistent(self):
        call_command('init_demo', stdout=StringIO())
        counts = (
            get_user_model().objects.count(), KaizenPost.objects.count(), Like.objects.count(),
            Comment.objects.count(), PointTransaction.objects.count(), RewardRedemption.objects.count(),
        )
        call_command('init_demo', stdout=StringIO())
        self.assertEqual(counts, (
            get_user_model().objects.count(), KaizenPost.objects.count(), Like.objects.count(),
            Comment.objects.count(), PointTransaction.objects.count(), RewardRedemption.objects.count(),
        ))

        self.assertGreaterEqual(counts[0], 30)
        self.assertGreaterEqual(counts[1], 120)
        statuses = set(KaizenPost.objects.values_list('status', flat=True))
        self.assertEqual(statuses, set(KaizenPost.Status.values))
        self.assertFalse(Department.objects.filter(lead__isnull=True).exists())

        # TO_VERIFY ma zawsze bieżący etap, pozostałe statusy nie mają etapów PENDING
        for post in KaizenPost.objects.filter(status='TO_VERIFY'):
            self.assertTrue(post.approvals.filter(decision='PENDING').exists(), post.id)
        self.assertFalse(
            PostApproval.objects.exclude(post__status='TO_VERIFY').filter(decision='PENDING').exists()
        )
        # hasło = login
        self.assertTrue(get_user_model().objects.get(username='lead3').check_password('lead3'))
