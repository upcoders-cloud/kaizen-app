from django.contrib.auth import get_user_model

from app.testing import OrgTestCase
from gamification.models import Action, Badge, Level, PointRule, PointTransaction, Reward, RewardRedemption
from gamification.services import engine
from gamification.services.rewards import redeem
from ideas.models import Category, KaizenPost

ADMIN_LIST_URLS = [
    '/api/admin/stats/',
    '/api/admin/users/',
    '/api/admin/departments/',
    '/api/admin/categories/',
    '/api/admin/rewards/',
    '/api/admin/redemptions/',
    '/api/admin/point-rules/',
    '/api/admin/badges/',
    '/api/admin/levels/',
]


class AdminPermissionTests(OrgTestCase):
    def test_only_admin(self):
        for url in ADMIN_LIST_URLS:
            self.assertEqual(self.anon().get(url).status_code, 401, url)
            for user in (self.employee, self.lead, self.manager, self.director):
                self.assertEqual(self.as_user(user).get(url).status_code, 403, (url, user.username))
            self.assertEqual(self.as_user(self.admin).get(url).status_code, 200, url)

    def test_staff_without_superuser_is_admin(self):
        staff = self.make_user('staff', 'EMPLOYEE', None, is_staff=True)
        self.assertEqual(self.as_user(staff).get('/api/admin/stats/').status_code, 200)

    def test_non_admin_cannot_write(self):
        client = self.as_user(self.director)
        self.assertEqual(client.post('/api/admin/categories/', {'name': 'X'}).status_code, 403)
        self.assertEqual(
            client.post(f'/api/admin/users/{self.employee.id}/adjust_points/', {'points': 5, 'reason': 'x'}).status_code,
            403,
        )


class AdminUsersTests(OrgTestCase):
    def test_list_filters_and_pagination(self):
        client = self.as_user(self.admin)
        data = client.get('/api/admin/users/?page_size=2').data
        self.assertEqual(data['count'], 8)
        self.assertEqual(len(data['results']), 2)
        managers = client.get('/api/admin/users/?role=MANAGER').data['results']
        self.assertCountEqual([u['username'] for u in managers], ['manager', 'manager2'])
        no_dept = client.get('/api/admin/users/?department=none').data['results']
        self.assertEqual([u['username'] for u in no_dept], ['admin'])
        staff = client.get('/api/admin/users/?is_staff=true').data['results']
        self.assertEqual([u['username'] for u in staff], ['admin'])

    def test_create_update_and_deactivate(self):
        client = self.as_user(self.admin)
        response = client.post('/api/admin/users/', {
            'username': 'nowy', 'password': 'tajne123', 'role': 'TEAM_LEAD', 'department': self.logi.id,
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotIn('password', response.data)
        self.assertEqual(response.data['nickname'], 'nowy')
        user_id = response.data['id']
        self.assertTrue(self.client.login(username='nowy', password='tajne123'))

        response = client.patch(f'/api/admin/users/{user_id}/', {'role': 'MANAGER', 'is_staff': True}, format='json')
        self.assertEqual(response.data['role'], 'MANAGER')
        self.assertTrue(response.data['is_staff'])

        self.assertEqual(client.delete(f'/api/admin/users/{user_id}/').status_code, 204)
        self.assertFalse(get_user_model().objects.get(id=user_id).is_active)

    def test_validation_messages_are_polish(self):
        response = self.as_user(self.admin).post('/api/admin/badges/', {'name': 'Bez kodu'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(str(response.data['code'][0]), 'To pole jest wymagane.')

    def test_create_requires_password(self):
        response = self.as_user(self.admin).post('/api/admin/users/', {'username': 'bez'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.data)

    def test_cannot_lock_yourself_out(self):
        client = self.as_user(self.admin)
        self.assertEqual(client.delete(f'/api/admin/users/{self.admin.id}/').status_code, 400)
        self.assertEqual(
            client.patch(f'/api/admin/users/{self.admin.id}/', {'is_active': False}, format='json').status_code, 400,
        )

    def test_only_superuser_grants_superuser(self):
        staff = self.make_user('staff', 'EMPLOYEE', None, is_staff=True)
        response = self.as_user(staff).patch(
            f'/api/admin/users/{self.employee.id}/', {'is_superuser': True}, format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_set_password(self):
        client = self.as_user(self.admin)
        self.assertEqual(
            client.post(f'/api/admin/users/{self.employee.id}/set_password/', {'password': 'abc'}).status_code, 400,
        )
        self.assertEqual(
            client.post(f'/api/admin/users/{self.employee.id}/set_password/', {'password': 'noweHaslo1'}).status_code,
            200,
        )
        self.employee.refresh_from_db()
        self.assertTrue(self.employee.check_password('noweHaslo1'))

    def test_adjust_points(self):
        client = self.as_user(self.admin)
        response = client.post(
            f'/api/admin/users/{self.employee.id}/adjust_points/', {'points': 30, 'reason': 'Nagroda zespołu'},
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['total_points'], 30)
        self.assertEqual(response.data['transaction']['action'], Action.MANUAL_ADJUSTMENT)
        self.assertEqual(response.data['transaction']['metadata']['reason'], 'Nagroda zespołu')
        response = client.post(
            f'/api/admin/users/{self.employee.id}/adjust_points/', {'points': -10, 'reason': 'Korekta'},
        )
        self.assertEqual(response.data['total_points'], 20)
        self.assertEqual(
            client.post(f'/api/admin/users/{self.employee.id}/adjust_points/', {'points': 0, 'reason': 'x'}).status_code,
            400,
        )


class AdminStructureTests(OrgTestCase):
    def test_departments_crud_with_lead(self):
        client = self.as_user(self.admin)
        rows = client.get('/api/admin/departments/').data
        prod = next(r for r in rows if r['name'] == 'Produkcja')
        self.assertEqual(prod['lead'], self.lead.id)
        self.assertEqual(prod['member_count'], 4)
        response = client.patch(f'/api/admin/departments/{self.logi.id}/', {'lead': self.lead2.id}, format='json')
        self.assertEqual(response.data['lead_name'], 'Lead2')
        created = client.post('/api/admin/departments/', {'name': 'IT'}, format='json')
        self.assertEqual(created.status_code, 201)
        self.assertEqual(client.delete(f"/api/admin/departments/{created.data['id']}/").status_code, 204)

    def test_categories_crud(self):
        client = self.as_user(self.admin)
        created = client.post('/api/admin/categories/', {'name': 'Ekologia'}, format='json')
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data['post_count'], 0)
        client.patch(f"/api/admin/categories/{created.data['id']}/", {'is_active': False}, format='json')
        self.assertFalse(Category.objects.get(id=created.data['id']).is_active)
        self.assertEqual(client.delete(f"/api/admin/categories/{created.data['id']}/").status_code, 204)

    def test_category_with_posts_cannot_be_deleted(self):
        KaizenPost.objects.create(author=self.employee, title='t', content='c', category=self.category)
        client = self.as_user(self.admin)
        row = next(r for r in client.get('/api/admin/categories/').data if r['id'] == self.category.id)
        self.assertEqual(row['post_count'], 1)
        self.assertEqual(client.delete(f'/api/admin/categories/{self.category.id}/').status_code, 400)

    def test_gamification_config(self):
        client = self.as_user(self.admin)
        rule = PointRule.objects.get(action=Action.IDEA_CREATED)
        response = client.patch(f'/api/admin/point-rules/{rule.id}/', {'points': 8, 'action': 'X'}, format='json')
        self.assertEqual(response.status_code, 200)
        rule.refresh_from_db()
        self.assertEqual((rule.points, rule.action), (8, Action.IDEA_CREATED))
        self.assertEqual(client.post('/api/admin/point-rules/', {}).status_code, 405)

        badge = client.post('/api/admin/badges/', {
            'code': 'test-badge', 'name': 'Test', 'criteria_type': 'POINTS', 'threshold': 10, 'tier': 'GOLD',
        }, format='json')
        self.assertEqual(badge.status_code, 201, badge.data)
        self.assertEqual(badge.data['awarded_count'], 0)
        self.assertEqual(client.delete(f"/api/admin/badges/{badge.data['id']}/").status_code, 204)
        self.assertFalse(Badge.objects.filter(code='test-badge').exists())

        level = client.post('/api/admin/levels/', {'name': 'Mistrz', 'min_points': 900, 'order': 9}, format='json')
        self.assertEqual(level.status_code, 201)
        self.assertTrue(Level.objects.filter(name='Mistrz').exists())


class AdminRewardsTests(OrgTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.reward = Reward.objects.create(name='Kubek', cost_points=50, stock=3)

    def setUp(self):
        engine.award(self.employee, Action.MANUAL_ADJUSTMENT, points_override=200)
        self.redemption = redeem(self.employee, self.reward.id)

    def balance(self):
        return sum(PointTransaction.objects.filter(user=self.employee).values_list('points', flat=True))

    def test_reward_crud_and_protected_delete(self):
        client = self.as_user(self.admin)
        rows = client.get('/api/admin/rewards/').data
        self.assertEqual(rows[0]['redemption_count'], 1)
        self.assertEqual(client.delete(f'/api/admin/rewards/{self.reward.id}/').status_code, 400)
        created = client.post('/api/admin/rewards/', {'name': 'Bon', 'cost_points': 10, 'is_active': False}, format='json')
        self.assertEqual(created.status_code, 201)
        self.assertEqual(client.delete(f"/api/admin/rewards/{created.data['id']}/").status_code, 204)

    def test_redemption_flow(self):
        client = self.as_user(self.admin)
        queue = client.get('/api/admin/redemptions/?status=PENDING').data
        self.assertEqual(queue['count'], 1)
        self.assertEqual(queue['results'][0]['user']['username'], 'emp')

        url = f'/api/admin/redemptions/{self.redemption.id}/'
        response = client.post(url + 'approve/', {'note': 'OK'}, format='json')
        self.assertEqual(response.data['status'], 'APPROVED')
        self.assertEqual(response.data['handled_by']['username'], 'admin')
        self.assertEqual(client.post(url + 'approve/', {}, format='json').status_code, 409)
        response = client.post(url + 'deliver/', {}, format='json')
        self.assertEqual(response.data['status'], 'DELIVERED')
        # wydanej wymiany nie da się już odrzucić (brak podwójnego zwrotu punktów)
        self.assertEqual(client.post(url + 'reject/', {}, format='json').status_code, 409)
        self.assertEqual(self.balance(), 150)

    def test_reject_refunds_points_and_stock(self):
        self.assertEqual(self.balance(), 150)
        response = self.as_user(self.admin).post(
            f'/api/admin/redemptions/{self.redemption.id}/reject/', {'note': 'Brak'}, format='json',
        )
        self.assertEqual(response.data['status'], 'REJECTED')
        self.assertEqual(response.data['note'], 'Brak')
        self.assertEqual(self.balance(), 200)
        self.reward.refresh_from_db()
        self.assertEqual(self.reward.stock, 3)
        self.assertEqual(RewardRedemption.objects.get(id=self.redemption.id).status, 'REJECTED')

    def test_stats(self):
        data = self.as_user(self.admin).get('/api/admin/stats/').data
        self.assertEqual(data['pending_redemptions'], 1)
        self.assertEqual(data['active_users'], 8)
        self.assertEqual(data['departments'], 2)
        self.assertEqual(data['categories'], Category.objects.filter(is_active=True).count())


class RewardConcurrencyGuardsTests(OrgTestCase):
    """Zabezpieczenia z review backendu (#2, #3, #6, #8)."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.reward = Reward.objects.create(name='Bon', cost_points=80, stock=1)
        cls.reward2 = Reward.objects.create(name='Kubek', cost_points=80, stock=None)

    def balance(self, user):
        return sum(PointTransaction.objects.filter(user=user).values_list('points', flat=True))

    def test_redeem_checks_ledger_balance_not_stale_profile(self):
        from gamification.models import UserGamificationProfile
        from gamification.services.rewards import RewardError
        engine.award(self.employee, Action.MANUAL_ADJUSTMENT, points_override=100)
        redeem(self.employee, self.reward2.id)
        # symulacja nieaktualnego zdenormalizowanego profilu (np. równoległe żądanie)
        UserGamificationProfile.objects.filter(user=self.employee).update(total_points=100)
        with self.assertRaises(RewardError):
            redeem(self.employee, self.reward2.id)
        self.assertEqual(self.balance(self.employee), 20)

    def test_conflicting_decision_after_reject_is_409_and_keeps_refund(self):
        engine.award(self.employee, Action.MANUAL_ADJUSTMENT, points_override=100)
        redemption = redeem(self.employee, self.reward2.id)
        client = self.as_user(self.admin)
        url = f'/api/admin/redemptions/{redemption.id}/'
        self.assertEqual(client.post(url + 'reject/', {}, format='json').status_code, 200)
        for operation in ('deliver', 'approve', 'reject'):
            response = client.post(url + f'{operation}/', {}, format='json')
            self.assertEqual(response.status_code, 409, operation)
            self.assertIn('detail', response.data)
        self.assertEqual(RewardRedemption.objects.get(id=redemption.id).status, 'REJECTED')
        self.assertEqual(self.balance(self.employee), 100)  # dokładnie jeden zwrot

    def test_refund_increments_stock_in_database(self):
        engine.award(self.employee, Action.MANUAL_ADJUSTMENT, points_override=100)
        redemption = redeem(self.employee, self.reward.id)
        self.reward.refresh_from_db()
        self.assertEqual(self.reward.stock, 0)
        # stan w bazie zmieniony "równolegle" (np. korekta magazynu) nie może zostać nadpisany
        Reward.objects.filter(pk=self.reward.pk).update(stock=5)
        from gamification.services.rewards import set_status
        set_status(redemption.id, RewardRedemption.Status.REJECTED, self.admin)
        self.reward.refresh_from_db()
        self.assertEqual(self.reward.stock, 6)

    def test_redemption_queue_has_no_n_plus_one(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        def count_queries():
            with CaptureQueriesContext(connection) as ctx:
                response = self.as_user(self.admin).get('/api/admin/redemptions/?page_size=100')
            self.assertEqual(response.status_code, 200)
            return len(ctx.captured_queries), response.data['count']

        engine.award(self.employee, Action.MANUAL_ADJUSTMENT, points_override=10000)
        redeem(self.employee, self.reward2.id)
        few, n_few = count_queries()
        for _ in range(8):
            redeem(self.employee, self.reward2.id)
        many, n_many = count_queries()
        self.assertEqual((n_few, n_many), (1, 9))
        self.assertEqual(few, many)
