from django.core.cache import cache
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from access_control.models import AccessLoginCode
from access_control.services import build_access_code_digest

User = get_user_model()


class AccessCodeLoginTests(APITestCase):
    endpoint = '/api/access/token/code/'

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username='access-user',
            password='StrongPassword123!',
            nickname='AccessNick',
            first_name='Ada',
            last_name='Nowak',
            email='ada@example.com',
        )
        self.code = 'ABCD-1234'
        AccessLoginCode.objects.create(
            user=self.user,
            code_digest=build_access_code_digest(self.code),
            is_active=True,
        )

    def test_access_code_login_success(self):
        response = self.client.post(self.endpoint, {'code': ' abcd-1234 '}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['username'], self.user.username)
        self.assertEqual(response.data['first_name'], self.user.first_name)
        self.assertEqual(response.data['last_name'], self.user.last_name)
        self.assertEqual(response.data['email'], self.user.email)
        self.assertIn('refresh_token', response.cookies)

        code_entry = AccessLoginCode.objects.get(user=self.user)
        self.assertIsNotNone(code_entry.last_used_at)

    def test_password_login_still_returns_expected_contract(self):
        response = self.client.post(
            '/api/access/token/',
            {'username': self.user.username, 'password': 'StrongPassword123!'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertNotIn('refresh', response.data)
        self.assertEqual(response.data['username'], self.user.username)
        self.assertEqual(response.data['email'], self.user.email)
        self.assertIn('refresh_token', response.cookies)

    def test_access_code_login_invalid_format_returns_400(self):
        response = self.client.post(self.endpoint, {'code': 'ABC-1234'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data)

    def test_access_code_login_wrong_code_returns_401(self):
        response = self.client.post(self.endpoint, {'code': 'WXYZ-9999'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('detail'), 'Invalid credentials.')

    def test_access_code_login_inactive_user_returns_401(self):
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])

        response = self.client.post(self.endpoint, {'code': self.code}, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('detail'), 'Invalid credentials.')

    def test_access_code_login_throttled(self):
        responses = [
            self.client.post(self.endpoint, {'code': 'WXYZ-9999'}, format='json')
            for _ in range(6)
        ]

        for response in responses[:5]:
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.assertEqual(responses[-1].status_code, status.HTTP_429_TOO_MANY_REQUESTS)
