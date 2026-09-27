from datetime import timedelta

from django.utils import timezone

from app.testing import OrgTestCase
from gamification.models import Action, Badge, PointTransaction
from gamification.services import engine


class GamificationApiTests(OrgTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        engine.award(cls.employee, Action.MANUAL_ADJUSTMENT, points_override=100)
        engine.award(cls.employee2, Action.MANUAL_ADJUSTMENT, points_override=100)
        engine.award(cls.lead, Action.MANUAL_ADJUSTMENT, points_override=40)
        old = engine.award(cls.manager, Action.MANUAL_ADJUSTMENT, points_override=500)
        PointTransaction.objects.filter(id=old.id).update(created_at=timezone.now() - timedelta(days=60))
        cls.badge = Badge.objects.create(
            code='points-50', name='Pięćdziesiątka', criteria_type=Badge.Criteria.POINTS, threshold=50,
        )
        Badge.objects.create(code='old', name='Stara', criteria_type=Badge.Criteria.POINTS, threshold=1,
                             is_active=False)
        engine.recompute_profile(cls.employee)

    def test_leaderboard_all_with_ties_and_me(self):
        data = self.as_user(self.lead).get('/api/gamification/leaderboard/?period=all').data
        ranks = [(r['user']['username'], r['rank'], r['points']) for r in data['results']]
        self.assertEqual(ranks[0], ('manager', 1, 500))
        self.assertEqual({r[1] for r in ranks if r[2] == 100}, {2})  # remis
        self.assertEqual(data['me'], {'rank': 4, 'points': 40})

    def test_leaderboard_periods(self):
        month = self.as_user(self.lead).get('/api/gamification/leaderboard/?period=month').data
        self.assertNotIn('manager', [r['user']['username'] for r in month['results']])
        quarter = self.as_user(self.lead).get('/api/gamification/leaderboard/?period=quarter').data
        self.assertEqual(quarter['results'][0]['user']['username'], 'manager')
        no_points = self.as_user(self.director).get('/api/gamification/leaderboard/?period=week').data
        self.assertEqual(no_points['me'], {'rank': None, 'points': 0})

    def test_leaderboard_department_filter(self):
        data = self.as_user(self.employee).get(
            f'/api/gamification/leaderboard/?department={self.logi.id}',
        ).data
        self.assertEqual([r['user']['username'] for r in data['results']], ['emp2'])
        self.assertEqual(data['me'], {'rank': None, 'points': 0})

    def test_leaderboard_departments_scope(self):
        data = self.as_user(self.employee).get('/api/gamification/leaderboard/?scope=departments').data
        self.assertIsNone(data['me'])
        self.assertEqual(data['results'][0], {'rank': 1, 'department_id': self.prod.id,
                                              'department': 'Produkcja', 'points': 640})

    def test_badges_list(self):
        data = self.as_user(self.employee).get('/api/gamification/badges/').data
        self.assertEqual([b['code'] for b in data], ['points-50'])
        self.assertTrue(data[0]['earned'])
        self.assertIsNotNone(data[0]['awarded_at'])
        lead_badges = self.as_user(self.director).get('/api/gamification/badges/').data
        self.assertFalse(lead_badges[0]['earned'])
        self.assertIsNone(lead_badges[0]['awarded_at'])

    def test_public_profile(self):
        data = self.as_user(self.lead).get(f'/api/gamification/users/{self.employee.id}/').data
        self.assertEqual(data['user']['username'], 'emp')
        self.assertEqual(data['points'], 100)
        self.assertEqual([b['code'] for b in data['badges']], ['points-50'])
        self.assertEqual(self.as_user(self.lead).get('/api/gamification/users/99999/').status_code, 404)

    def test_requires_auth(self):
        for url in ('/api/gamification/leaderboard/', '/api/gamification/badges/',
                    f'/api/gamification/users/{self.employee.id}/'):
            self.assertEqual(self.anon().get(url).status_code, 401, url)
