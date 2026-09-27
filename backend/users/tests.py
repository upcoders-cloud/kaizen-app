from app.testing import OrgTestCase
from access_control.permissions import is_admin, is_approver, is_management
from ideas.models import KaizenPost, Like


class RoleHelperTests(OrgTestCase):
    def test_matrix(self):
        expected = {
            'employee': (False, False, False),
            'lead': (False, True, False),
            'manager': (False, True, True),
            'director': (False, True, True),
            'admin': (True, True, True),
        }
        for name, flags in expected.items():
            user = getattr(self, name)
            self.assertEqual((is_admin(user), is_approver(user), is_management(user)), flags, name)


class UserEndpointsTests(OrgTestCase):
    def test_me_contains_permissions(self):
        data = self.as_user(self.lead).get('/api/users/me/').data
        self.assertEqual(data['permissions'], {'is_admin': False, 'is_approver': True, 'is_management': False})
        self.assertEqual(data['department_name'], 'Produkcja')
        self.assertFalse(data['is_superuser'])
        admin = self.as_user(self.admin).get('/api/users/me/').data
        self.assertTrue(admin['is_superuser'])
        self.assertTrue(admin['permissions']['is_admin'])

    def test_me_cannot_change_role(self):
        self.as_user(self.employee).patch('/api/users/me/', {'role': 'DIRECTOR', 'nickname': 'nowy'}, format='json')
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.role, 'EMPLOYEE')
        self.assertEqual(self.employee.nickname, 'nowy')

    def test_list_requires_auth_and_is_paginated(self):
        self.assertEqual(self.client.get('/api/users/').status_code, 401)
        data = self.as_user(self.employee).get('/api/users/?page_size=3').data
        self.assertEqual(data['count'], 8)
        self.assertEqual(len(data['results']), 3)

    def test_list_filters(self):
        client = self.as_user(self.employee)
        roles = {u['role'] for u in client.get('/api/users/?role=TEAM_LEAD').data['results']}
        self.assertEqual(roles, {'TEAM_LEAD'})
        dept = client.get(f'/api/users/?department={self.logi.id}').data['results']
        self.assertCountEqual([u['username'] for u in dept], ['emp2', 'lead2', 'manager2'])
        self.assertEqual(client.get('/api/users/?search=direct').data['results'][0]['username'], 'director')

    def test_inactive_users_hidden_from_list(self):
        self.employee2.is_active = False
        self.employee2.save()
        usernames = [u['username'] for u in self.as_user(self.employee).get('/api/users/?page_size=50').data['results']]
        self.assertNotIn('emp2', usernames)

    def test_public_profile(self):
        post = KaizenPost.objects.create(
            author=self.employee, title='t', content='c', category=self.category,
            status=KaizenPost.Status.IMPLEMENTED,
        )
        Like.objects.create(post=post, user=self.manager)
        data = self.as_user(self.employee2).get(f'/api/users/{self.employee.id}/').data
        self.assertEqual(data['stats']['ideas'], 1)
        self.assertEqual(data['stats']['implemented'], 1)
        self.assertEqual(data['stats']['likes_received'], 1)
        self.assertIn('total_points', data['gamification'])
        self.assertIsInstance(data['gamification']['badges'], list)
        self.assertNotIn('email', data)

    def test_approvers(self):
        client = self.as_user(self.employee)
        data = client.get('/api/users/approvers/').data
        self.assertCountEqual(
            [u['username'] for u in data], ['lead', 'lead2', 'manager', 'manager2', 'director'],
        )
        leads = client.get(f'/api/users/approvers/?role=TEAM_LEAD&department={self.prod.id}').data
        self.assertEqual([u['username'] for u in leads], ['lead'])

    def test_managers_backcompat(self):
        data = self.as_user(self.employee).get('/api/users/managers/').data
        self.assertCountEqual([u['username'] for u in data], ['manager', 'manager2'])


class DepartmentDictionaryTests(OrgTestCase):
    def test_active_departments_array(self):
        from users.models import Department
        Department.objects.create(name='Archiwum', is_active=False)
        self.assertEqual(self.anon().get('/api/departments/').status_code, 401)
        data = self.as_user(self.employee).get('/api/departments/?page_size=100').data
        self.assertEqual(data, [
            {'id': self.logi.id, 'name': 'Logistyka'},
            {'id': self.prod.id, 'name': 'Produkcja'},
        ])
