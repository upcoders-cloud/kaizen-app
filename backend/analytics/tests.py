from datetime import timedelta

from django.utils import timezone

from app.testing import OrgTestCase
from ideas.models import Comment, KaizenPost, Like, PostApproval, PostSurvey

Status = KaizenPost.Status

MANAGEMENT_ONLY = [
    '/api/analytics/overview/',
    '/api/analytics/departments/',
    '/api/analytics/categories/',
    '/api/analytics/trends/',
    '/api/analytics/approvals/',
    '/api/analytics/top-ideas/',
    '/api/analytics/participation/',
    '/api/analytics/export/?report=ideas&fmt=csv',
]


class AnalyticsPermissionTests(OrgTestCase):
    def test_management_endpoints(self):
        for url in MANAGEMENT_ONLY:
            self.assertEqual(self.anon().get(url).status_code, 401, url)
            for user in (self.employee, self.lead):
                self.assertEqual(self.as_user(user).get(url).status_code, 403, (url, user.username))
            for user in (self.manager, self.director, self.admin):
                self.assertEqual(self.as_user(user).get(url).status_code, 200, (url, user.username))

    def test_team_endpoint(self):
        self.assertEqual(self.as_user(self.employee).get('/api/analytics/team/').status_code, 403)
        for user in (self.lead, self.manager, self.director):
            self.assertEqual(self.as_user(user).get('/api/analytics/team/').status_code, 200, user.username)
        # admin bez działu musi wskazać dział
        self.assertEqual(self.as_user(self.admin).get('/api/analytics/team/').status_code, 400)
        self.assertEqual(
            self.as_user(self.admin).get(f'/api/analytics/team/?department={self.logi.id}').status_code, 200,
        )

    def test_personal_endpoints_open_to_everyone(self):
        client = self.as_user(self.employee)
        self.assertEqual(client.get('/api/analytics/me/impact/').status_code, 200)
        self.assertEqual(client.get('/api/analytics/heatmap/').status_code, 200)
        self.assertEqual(client.get(f'/api/analytics/heatmap/?user={self.lead.id}').status_code, 403)


class AnalyticsDataTests(OrgTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        now = timezone.now()
        cls.p1 = KaizenPost.objects.create(
            author=cls.employee, title='A', content='c', category=cls.category, status=Status.IMPLEMENTED,
        )
        cls.p2 = KaizenPost.objects.create(
            author=cls.employee2, title='B', content='c', category=cls.category2, status=Status.SUBMITTED,
        )
        cls.p3 = KaizenPost.objects.create(
            author=cls.employee, title='C', content='c', category=cls.category, status=Status.TO_VERIFY,
        )
        KaizenPost.objects.filter(id=cls.p2.id).update(created_at=now - timedelta(days=40))
        PostSurvey.objects.create(
            post=cls.p1, frequency_value=1, frequency_unit='DAY', affected_people=1, time_lost_minutes=1,
            estimated_time_savings_hours=10, estimated_financial_savings=1000,
        )
        Like.objects.create(post=cls.p2, user=cls.lead)
        Like.objects.create(post=cls.p2, user=cls.manager)
        Comment.objects.create(post=cls.p1, author=cls.lead, text='x')

        # p1: lider 10 h, kierownik 30 h; p3: czeka na lidera od 10 dni (po SLA)
        start = now - timedelta(days=20)
        lead_stage = PostApproval.objects.create(post=cls.p1, stage='TEAM_LEAD', order=1, approver=cls.lead,
                                                 decision='APPROVED', decided_at=start + timedelta(hours=10))
        mgr_stage = PostApproval.objects.create(post=cls.p1, stage='MANAGER', order=2, approver=cls.manager,
                                                decision='APPROVED', decided_at=start + timedelta(hours=40))
        PostApproval.objects.filter(id__in=[lead_stage.id, mgr_stage.id]).update(created_at=start)
        waiting = PostApproval.objects.create(post=cls.p3, stage='TEAM_LEAD', order=1, approver=cls.lead)
        PostApproval.objects.filter(id=waiting.id).update(created_at=now - timedelta(days=10))
        rejected = PostApproval.objects.create(post=cls.p2, stage='MANAGER', order=1, approver=cls.manager2,
                                               decision='REJECTED', decided_at=now - timedelta(days=39))
        PostApproval.objects.filter(id=rejected.id).update(created_at=now - timedelta(days=40))

    def get(self, url, user=None):
        response = self.as_user(user or self.manager).get(url)
        self.assertEqual(response.status_code, 200, response.content[:300])
        return response.data

    def test_overview_filters(self):
        self.assertEqual(self.get('/api/analytics/overview/')['total_ideas'], 3)
        self.assertEqual(self.get(f'/api/analytics/overview/?department={self.prod.id}')['total_ideas'], 2)
        self.assertEqual(self.get(f'/api/analytics/overview/?category={self.category2.id}')['total_ideas'], 1)
        since = (timezone.now() - timedelta(days=5)).date().isoformat()
        self.assertEqual(self.get(f'/api/analytics/overview/?date_from={since}')['total_ideas'], 2)
        self.assertEqual(self.get('/api/analytics/overview/?status=TO_VERIFY')['total_ideas'], 1)

    def test_departments_and_categories_filters(self):
        rows = self.get(f'/api/analytics/departments/?department={self.logi.id}')
        self.assertEqual([r['department'] for r in rows], ['Logistyka'])
        rows = self.get(f'/api/analytics/categories/?department={self.prod.id}')
        self.assertEqual([r['category'] for r in rows], ['BHP'])

    def test_approvals_sla(self):
        data = self.get('/api/analytics/approvals/')
        self.assertEqual(data['pending_by_stage'], {'TEAM_LEAD': 1, 'MANAGER': 0, 'DIRECTOR': 0})
        self.assertEqual(data['decided_total'], 3)
        # lider 10 h, kierownik 30 h (od decyzji lidera), odrzucenie 24 h
        self.assertEqual(data['median_decision_hours'], 24.0)
        self.assertAlmostEqual(data['avg_decision_hours'], 21.3, places=1)
        self.assertEqual(data['overdue_count'], 1)
        self.assertEqual(data['overdue'][0]['post_id'], self.p3.id)
        self.assertAlmostEqual(data['approval_rate'], 66.7, places=1)

    def test_top_ideas(self):
        rows = self.get('/api/analytics/top-ideas/?by=savings')
        self.assertEqual([r['id'] for r in rows], [self.p1.id])
        self.assertEqual(rows[0]['savings'], 1000.0)
        self.assertEqual(rows[0]['department'], 'Produkcja')
        rows = self.get('/api/analytics/top-ideas/?by=likes')
        self.assertEqual(rows[0]['id'], self.p2.id)
        self.assertEqual(rows[0]['likes_count'], 2)
        self.assertNotIn(self.p3.id, [r['id'] for r in rows])  # TO_VERIFY pominięte domyślnie

    def test_team_scope(self):
        data = self.get(f'/api/analytics/team/?department={self.logi.id}', user=self.lead)
        self.assertEqual(data['department']['name'], 'Produkcja')  # lider zawsze widzi swój dział
        self.assertEqual(data['department']['lead_id'], self.lead.id)
        self.assertEqual(data['summary']['ideas'], 2)
        self.assertEqual(data['summary']['pending_approval'], 1)
        members = {m['username']: m for m in data['members']}
        self.assertEqual(members['emp']['ideas'], 2)
        self.assertEqual(members['emp']['implemented'], 1)
        self.assertIsNotNone(members['lead']['last_activity'])

        data = self.get(f'/api/analytics/team/?department={self.logi.id}', user=self.director)
        self.assertEqual(data['department']['name'], 'Logistyka')
        self.assertEqual([p['id'] for p in data['ideas_in_progress']], [self.p2.id])

    def test_participation(self):
        data = self.get('/api/analytics/participation/')
        self.assertEqual(len(data['monthly']), 12)
        self.assertEqual(data['summary']['total_users'], 8)
        # aktywni: emp, emp2 (pomysły), lead, manager (lajki / komentarz)
        self.assertEqual(data['summary']['active_users'], 4)
        prod = next(r for r in data['departments'] if r['department'] == 'Produkcja')
        self.assertEqual((prod['active_users'], prod['total_users']), (3, 4))
        for row in data['monthly']:
            self.assertLessEqual(row['active_users'], row['total_users'])

    def test_export_ideas_csv_respects_filters(self):
        response = self.as_user(self.manager).get(
            f'/api/analytics/export/?report=ideas&fmt=csv&department={self.logi.id}',
        )
        self.assertEqual(response.status_code, 200)
        lines = response.content.decode('utf-8-sig').strip().splitlines()
        self.assertEqual(len(lines), 2)
        self.assertIn('B', lines[1])
        bad = self.as_user(self.manager).get('/api/analytics/export/?report=nope&fmt=csv')
        self.assertEqual(bad.status_code, 400)
