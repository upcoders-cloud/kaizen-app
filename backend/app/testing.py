"""Wspólne dane dla testów API: działy, użytkownicy we wszystkich rolach, kategorie."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from gamification.models import Action, PointRule
from ideas.models import Category, KaizenPost
from ideas.services.approval import init_approvals
from users.models import Department

User = get_user_model()


class OrgTestCase(APITestCase):
    """Dwa działy (Produkcja z liderem, Logistyka bez), konta każdej roli i admin."""

    @classmethod
    def setUpTestData(cls):
        cls.prod = Department.objects.create(name='Produkcja')
        cls.logi = Department.objects.create(name='Logistyka')
        cls.employee = cls.make_user('emp', 'EMPLOYEE', cls.prod)
        cls.employee2 = cls.make_user('emp2', 'EMPLOYEE', cls.logi)
        cls.lead = cls.make_user('lead', 'TEAM_LEAD', cls.prod)
        cls.lead2 = cls.make_user('lead2', 'TEAM_LEAD', cls.logi)
        cls.manager = cls.make_user('manager', 'MANAGER', cls.prod)
        cls.manager2 = cls.make_user('manager2', 'MANAGER', cls.logi)
        cls.director = cls.make_user('director', 'DIRECTOR', cls.prod)
        cls.admin = cls.make_user('admin', 'EMPLOYEE', None, is_staff=True, is_superuser=True)
        cls.prod.lead = cls.lead
        cls.prod.save()
        cls.category = Category.objects.create(name='BHP')
        cls.category2 = Category.objects.create(name='Jakość')
        for action, points in (
            (Action.IDEA_CREATED, 5), (Action.IDEA_APPROVED, 15), (Action.IDEA_IMPLEMENTED, 50),
            (Action.LIKE_RECEIVED, 2), (Action.COMMENT_MADE, 1), (Action.REVIEW_COMPLETED, 5),
        ):
            PointRule.objects.create(action=action, points=points)

    @staticmethod
    def make_user(username, role, department, **extra):
        return User.objects.create_user(
            username=username, password='haslo12345', nickname=username,
            first_name=username.capitalize(), role=role, department=department, **extra,
        )

    def as_user(self, user):
        self.client.force_authenticate(user=user)
        return self.client

    def anon(self):
        self.client.force_authenticate(user=None)
        return self.client

    def make_post(self, author=None, status=KaizenPost.Status.TO_VERIFY, manager=None, category=None,
                  title='Pomysł testowy', with_approvals=True, **extra):
        post = KaizenPost.objects.create(
            author=author or self.employee,
            title=title,
            content='Opis pomysłu',
            category=category or self.category,
            status=status,
            assigned_manager=manager if manager is not None else self.manager,
            **extra,
        )
        if with_approvals and status == KaizenPost.Status.TO_VERIFY:
            init_approvals(post)
        return post
