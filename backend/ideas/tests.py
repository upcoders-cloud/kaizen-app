from datetime import timedelta

from django.db import IntegrityError
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework import status

from app.testing import OrgTestCase
from ideas.models import Comment, KaizenPost, Like, PostApproval, PostSurvey

Status = KaizenPost.Status


class PostBasicsTests(OrgTestCase):
    def test_like_is_unique_per_user(self):
        post = self.make_post(status=Status.SUBMITTED)
        Like.objects.create(user=self.employee2, post=post)
        with self.assertRaises(IntegrityError):
            Like.objects.create(user=self.employee2, post=post)

    def test_create_post_sets_author_and_approvals(self):
        response = self.as_user(self.employee2).post('/api/posts/', {
            'title': 'Nowy pomysł', 'content': 'Treść', 'category': self.category.id,
            'assigned_manager': self.manager2.id,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        post = KaizenPost.objects.get(id=response.data['id'])
        self.assertEqual(post.author, self.employee2)
        # Logistyka nie ma lidera -> tylko etap kierownika
        self.assertEqual(list(post.approvals.values_list('stage', flat=True)), ['MANAGER'])

    def test_like_toggle_and_counts(self):
        post = self.make_post(status=Status.SUBMITTED)
        client = self.as_user(self.employee2)
        self.assertEqual(client.post(f'/api/posts/{post.id}/like/').data['likes_count'], 1)
        detail = client.get(f'/api/posts/{post.id}/').data
        self.assertTrue(detail['is_liked_by_me'])
        self.assertEqual(detail['likes_count'], 1)
        self.assertEqual(client.post(f'/api/posts/{post.id}/like/').data['status'], 'unliked')

    def test_author_contains_department(self):
        self.make_post(status=Status.SUBMITTED)
        row = self.as_user(self.employee2).get('/api/posts/').data['results'][0]
        self.assertEqual(row['author']['department_name'], 'Produkcja')
        self.assertEqual(row['author']['department'], self.prod.id)


class TeamLeadStageTests(OrgTestCase):
    def _create_as_employee(self):
        response = self.as_user(self.employee).post('/api/posts/', {
            'title': 'Pomysł z działu z liderem', 'content': 'Treść', 'category': self.category.id,
            'assigned_manager': self.manager.id,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return KaizenPost.objects.get(id=response.data['id'])

    def test_department_lead_is_first_stage(self):
        post = self._create_as_employee()
        stages = list(post.approvals.order_by('order').values_list('stage', 'approver_id'))
        self.assertEqual(stages, [('TEAM_LEAD', self.lead.id), ('MANAGER', self.manager.id)])
        self.assertEqual(post.assigned_team_lead, self.lead)

    def test_lead_stage_skipped_for_non_employee_author(self):
        post = self.make_post(author=self.director)
        self.assertEqual(list(post.approvals.values_list('stage', flat=True)), ['MANAGER'])

    def test_queue_follows_current_stage(self):
        post = self._create_as_employee()
        self.assertEqual(self.as_user(self.lead).get('/api/posts/approvals_queue/count/').data['count'], 1)
        self.assertEqual(self.as_user(self.manager).get('/api/posts/approvals_queue/count/').data['count'], 0)
        self.assertEqual(self.as_user(self.manager).get('/api/posts/my_cases/').data, [])

        # lider nie podaje kosztu, akceptacja przekazuje post kierownikowi
        response = self.as_user(self.lead).post(f'/api/posts/{post.id}/approve/', {}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['status'], 'TO_VERIFY')
        self.assertEqual(response.data['current_stage']['stage'], 'MANAGER')

        self.assertEqual(self.as_user(self.lead).get('/api/posts/approvals_queue/count/').data['count'], 0)
        queue = self.as_user(self.manager).get('/api/posts/approvals_queue/').data
        self.assertEqual(queue['count'], 1)
        self.assertEqual(queue['results'][0]['id'], post.id)
        self.assertEqual(
            self.as_user(self.manager).get('/api/posts/approvals_queue/?stage=TEAM_LEAD').data['count'], 0,
        )

        response = self.as_user(self.manager).post(
            f'/api/posts/{post.id}/approve/', {'estimated_cost': '500'}, format='json',
        )
        self.assertEqual(response.data['status'], 'SUBMITTED')

    def test_manager_cannot_approve_before_lead(self):
        post = self._create_as_employee()
        response = self.as_user(self.manager).post(
            f'/api/posts/{post.id}/approve/', {'estimated_cost': '500'}, format='json',
        )
        self.assertEqual(response.status_code, 403)

    def test_lead_rejection_cancels_and_skips_manager(self):
        post = self._create_as_employee()
        response = self.as_user(self.lead).post(
            f'/api/posts/{post.id}/reject/', {'rejection_reason': 'Duplikat'}, format='json',
        )
        self.assertEqual(response.data['status'], 'CANCELLED')
        manager_stage = post.approvals.get(stage='MANAGER')
        self.assertEqual(manager_stage.decision, PostApproval.Decision.SKIPPED)

    def test_employee_queue_is_empty(self):
        self._create_as_employee()
        response = self.as_user(self.employee).get('/api/posts/approvals_queue/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 0)


class PostListFilterTests(OrgTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.p_submitted = KaizenPost.objects.create(
            author=cls.employee, title='Alfa', content='x', category=cls.category, status=Status.SUBMITTED,
        )
        cls.p_implemented = KaizenPost.objects.create(
            author=cls.employee2, title='Beta', content='x', category=cls.category2, status=Status.IMPLEMENTED,
        )
        cls.p_to_verify = KaizenPost.objects.create(
            author=cls.employee, title='Gamma', content='x', category=cls.category, status=Status.TO_VERIFY,
        )
        cls.p_cancelled = KaizenPost.objects.create(
            author=cls.employee2, title='Delta', content='x', category=cls.category, status=Status.CANCELLED,
        )
        PostSurvey.objects.create(
            post=cls.p_implemented, frequency_value=1, frequency_unit='DAY', affected_people=1,
            time_lost_minutes=1, estimated_time_savings_hours=1, estimated_financial_savings=900,
        )
        Like.objects.create(post=cls.p_submitted, user=cls.manager)
        Like.objects.create(post=cls.p_submitted, user=cls.lead)
        Comment.objects.create(post=cls.p_implemented, author=cls.lead, text='ok')
        old = timezone.now() - timedelta(days=100)
        KaizenPost.objects.filter(id=cls.p_implemented.id).update(created_at=old)

    def ids(self, user, query=''):
        response = self.as_user(user).get(f'/api/posts/{query}')
        self.assertEqual(response.status_code, 200)
        return [row['id'] for row in response.data['results']]

    def test_default_feed_shows_public_statuses(self):
        self.assertCountEqual(self.ids(self.employee), [self.p_submitted.id, self.p_implemented.id])

    def test_employee_cannot_filter_hidden_statuses_of_others(self):
        self.assertCountEqual(
            self.ids(self.employee, '?status=TO_VERIFY'), [self.p_submitted.id, self.p_implemented.id],
        )

    def test_management_can_filter_hidden_statuses(self):
        self.assertEqual(self.ids(self.manager, '?status=TO_VERIFY'), [self.p_to_verify.id])
        self.assertCountEqual(
            self.ids(self.director, '?status=TO_VERIFY,CANCELLED'), [self.p_to_verify.id, self.p_cancelled.id],
        )
        self.assertEqual(len(self.ids(self.admin, '?status=all')), 4)

    def test_mine_with_all_statuses(self):
        self.assertCountEqual(
            self.ids(self.employee, '?mine=true&status=all'), [self.p_submitted.id, self.p_to_verify.id],
        )
        self.assertEqual(self.ids(self.employee2, '?mine=true&status=CANCELLED'), [self.p_cancelled.id])

    def test_department_category_date_filters(self):
        self.assertEqual(self.ids(self.manager, f'?department={self.logi.id}'), [self.p_implemented.id])
        self.assertEqual(self.ids(self.manager, f'?category={self.category2.id}'), [self.p_implemented.id])
        since = (timezone.now() - timedelta(days=10)).date().isoformat()
        self.assertEqual(self.ids(self.manager, f'?date_from={since}'), [self.p_submitted.id])
        until = (timezone.now() - timedelta(days=50)).date().isoformat()
        self.assertEqual(self.ids(self.manager, f'?date_to={until}'), [self.p_implemented.id])

    def test_ordering(self):
        self.assertEqual(self.ids(self.employee, '?ordering=oldest')[0], self.p_implemented.id)
        self.assertEqual(self.ids(self.employee, '?ordering=likes')[0], self.p_submitted.id)
        self.assertEqual(self.ids(self.employee, '?ordering=comments')[0], self.p_implemented.id)
        self.assertEqual(self.ids(self.employee, '?ordering=savings')[0], self.p_implemented.id)

    def test_search(self):
        self.assertEqual(self.ids(self.employee, '?search=alf'), [self.p_submitted.id])


class PipelineTrendingProgressTests(OrgTestCase):
    def test_pipeline_permissions(self):
        for user in (self.employee, self.lead):
            self.assertEqual(self.as_user(user).get('/api/posts/pipeline/').status_code, 403)
        for user in (self.manager, self.director, self.admin):
            self.assertEqual(self.as_user(user).get('/api/posts/pipeline/').status_code, 200)

    def test_pipeline_shape(self):
        submitted = self.make_post(status=Status.SUBMITTED)
        in_progress = self.make_post(status=Status.IN_PROGRESS, manager=self.manager2)
        self.make_post(status=Status.TO_VERIFY)
        data = self.as_user(self.manager).get('/api/posts/pipeline/').data
        self.assertEqual(set(data), {'SUBMITTED', 'IN_PROGRESS', 'IMPLEMENTED'})
        self.assertEqual([r['id'] for r in data['SUBMITTED']], [submitted.id])
        self.assertTrue(data['SUBMITTED'][0]['can_update_progress'])
        self.assertFalse(data['IN_PROGRESS'][0]['can_update_progress'])
        self.assertEqual(data['IN_PROGRESS'][0]['id'], in_progress.id)
        mine = self.as_user(self.manager).get('/api/posts/pipeline/?mine_only=true').data
        self.assertEqual(mine['IN_PROGRESS'], [])

    def test_trending_scores_recent_interactions(self):
        quiet = self.make_post(status=Status.SUBMITTED, title='Cichy')
        hot = self.make_post(status=Status.SUBMITTED, title='Gorący')
        hidden = self.make_post(status=Status.TO_VERIFY, title='Ukryty', with_approvals=False)
        for user in (self.lead, self.manager, self.director):
            Like.objects.create(post=hot, user=user)
            Like.objects.create(post=hidden, user=user)
        Like.objects.create(post=quiet, user=self.lead, created_at=timezone.now() - timedelta(days=30))
        data = self.as_user(self.employee).get('/api/posts/trending/?limit=5').data
        self.assertEqual(data[0]['id'], hot.id)
        self.assertEqual(data[0]['score'], 3)
        self.assertNotIn(hidden.id, [r['id'] for r in data])
        self.assertIn(quiet.id, [r['id'] for r in data])  # uzupełnienie najnowszymi

    def test_progress_permissions(self):
        post = self.make_post(status=Status.SUBMITTED, assigned_director=self.director)
        url = f'/api/posts/{post.id}/progress/'
        self.assertEqual(self.as_user(self.manager2).patch(url, {'progress_percent': 10}, format='json').status_code, 403)
        self.assertEqual(self.as_user(self.employee).patch(url, {'progress_percent': 10}, format='json').status_code, 403)
        response = self.as_user(self.director).patch(url, {'progress_percent': 40}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'IN_PROGRESS')
        response = self.as_user(self.admin).patch(url, {'progress_percent': 100}, format='json')
        self.assertEqual(response.data['status'], 'IMPLEMENTED')

    def test_implemented_progress_cannot_go_down(self):
        post = self.make_post(status=Status.IMPLEMENTED, progress_percent=100)
        url = f'/api/posts/{post.id}/progress/'
        response = self.as_user(self.manager).patch(url, {'progress_percent': 50}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('wdrożony', response.data['detail'])
        post.refresh_from_db()
        self.assertEqual((post.status, post.progress_percent), (Status.IMPLEMENTED, 100))
        # termin i ponowne 100% nadal dozwolone
        response = self.as_user(self.manager).patch(
            url, {'progress_percent': 100, 'deadline': '2026-12-01'}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['deadline'], '2026-12-01')


class HiddenPostVisibilityTests(OrgTestCase):
    """Review backendu #1: ukryte statusy tylko dla autora, łańcucha akceptacji, management i admina."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        # pomysł pracownika Produkcji: lider -> kierownik
        cls.hidden = KaizenPost.objects.create(
            author=cls.employee, title='Ukryty', content='c', category=cls.category,
            status=Status.TO_VERIFY, assigned_manager=cls.manager,
        )
        from ideas.services.approval import init_approvals
        init_approvals(cls.hidden)
        cls.cancelled = KaizenPost.objects.create(
            author=cls.employee, title='Odrzucony', content='c', category=cls.category,
            status=Status.CANCELLED, rejection_reason='Nie',
        )
        Comment.objects.create(post=cls.hidden, author=cls.lead, text='Tajny komentarz')
        cls.public = KaizenPost.objects.create(
            author=cls.employee, title='Publiczny', content='c', category=cls.category, status=Status.SUBMITTED,
        )

    def status_of(self, user, url, method='get'):
        client = self.as_user(user) if user else self.anon()
        return getattr(client, method)(url, format='json').status_code

    def test_retrieve(self):
        url = f'/api/posts/{self.hidden.id}/'
        for user in (self.employee, self.lead, self.manager, self.manager2, self.director, self.admin):
            self.assertEqual(self.status_of(user, url), 200, user.username)
        for user in (self.employee2, self.lead2, None):
            self.assertEqual(self.status_of(user, url), 404, getattr(user, 'username', 'anon'))
        self.assertEqual(self.as_user(self.employee2).get(url).data, {'detail': 'Nie znaleziono.'})
        self.assertEqual(self.status_of(self.employee2, f'/api/posts/{self.cancelled.id}/'), 404)
        self.assertEqual(self.status_of(None, f'/api/posts/{self.public.id}/'), 200)

    def test_detail_actions_hidden_from_outsiders(self):
        base = f'/api/posts/{self.hidden.id}/'
        self.assertEqual(self.status_of(self.employee2, base + 'comments/'), 404)
        self.assertEqual(self.status_of(None, base + 'comments/'), 404)
        self.assertEqual(self.status_of(self.employee2, base + 'like/', 'post'), 404)
        self.assertEqual(self.status_of(self.employee2, base + 'bookmark/', 'post'), 404)
        self.assertEqual(self.status_of(self.lead2, base + 'approve/', 'post'), 404)
        self.assertFalse(Like.objects.filter(post=self.hidden).exists())
        # osoby z łańcucha widzą dyskusję
        self.assertEqual(self.status_of(self.manager, base + 'comments/'), 200)
        self.assertEqual(len(self.as_user(self.employee).get(base + 'comments/').data), 1)

    def test_comment_and_like_endpoints_filtered(self):
        texts = [c['text'] for c in self.as_user(self.employee2).get('/api/comments/').data]
        self.assertNotIn('Tajny komentarz', texts)
        texts = [c['text'] for c in self.as_user(self.lead).get('/api/comments/').data]
        self.assertIn('Tajny komentarz', texts)
        response = self.as_user(self.employee2).post('/api/likes/', {'post': self.hidden.id}, format='json')
        self.assertEqual(response.status_code, 400)
        response = self.as_user(self.employee2).post('/api/likes/', {'post': self.public.id}, format='json')
        self.assertEqual(response.status_code, 201)

    def test_lead_decides_on_foreign_authors_post(self):
        """Review #4: lider (nie autor) może zaakceptować i odrzucić cudzy pomysł."""
        response = self.as_user(self.lead).post(f'/api/posts/{self.hidden.id}/approve/', {}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['current_stage']['stage'], 'MANAGER')
        other = self.make_post(title='Drugi')
        response = self.as_user(self.lead).post(
            f'/api/posts/{other.id}/reject/', {'rejection_reason': 'Duplikat'}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['status'], 'CANCELLED')


class AssignedTeamLeadValidationTests(OrgTestCase):
    """Review #5: lider musi należeć do działu autora."""

    def create(self, author, lead):
        return self.as_user(author).post('/api/posts/', {
            'title': 'Pomysł', 'content': 'Treść', 'category': self.category.id,
            'assigned_manager': self.manager.id, 'assigned_team_lead': lead.id,
        }, format='json')

    def test_foreign_lead_rejected(self):
        response = self.create(self.employee, self.lead2)
        self.assertEqual(response.status_code, 400)
        self.assertIn('assigned_team_lead', response.data)
        self.assertFalse(KaizenPost.objects.exists())

    def test_own_department_lead_accepted(self):
        response = self.create(self.employee2, self.lead2)
        self.assertEqual(response.status_code, 201, response.data)
        post = KaizenPost.objects.get(id=response.data['id'])
        self.assertEqual(post.approvals.order_by('order').first().approver, self.lead2)

    def test_update_validates_against_author_department(self):
        post = self.make_post(author=self.employee2, status=Status.CANCELLED, with_approvals=False)
        response = self.as_user(self.employee2).patch(
            f'/api/posts/{post.id}/', {'assigned_team_lead': self.lead.id}, format='json',
        )
        self.assertEqual(response.status_code, 400)


class ArrayOrPageTests(OrgTestCase):
    """Review #7: domyślnie tablica (maks. 200 najnowszych), z ?page= paginacja."""

    def test_notifications(self):
        from ideas.models import Notification
        from ideas.views import ARRAY_LIMIT
        post = self.make_post(status=Status.SUBMITTED)
        Notification.objects.bulk_create([
            Notification(recipient=self.employee, actor=self.lead, post=post, type='LIKE')
            for _ in range(ARRAY_LIMIT + 5)
        ])
        client = self.as_user(self.employee)
        data = client.get('/api/notifications/').data
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), ARRAY_LIMIT)
        page = client.get('/api/notifications/?page=2&page_size=100').data
        self.assertEqual(page['count'], ARRAY_LIMIT + 5)
        self.assertEqual(len(page['results']), 100)
        self.assertEqual(client.get('/api/notifications/unread_count/').data['count'], ARRAY_LIMIT + 5)

    def test_my_cases(self):
        self.make_post(author=self.employee, status=Status.CANCELLED, with_approvals=False)
        client = self.as_user(self.employee)
        self.assertIsInstance(client.get('/api/posts/my_cases/').data, list)
        page = client.get('/api/posts/my_cases/?page=1').data
        self.assertEqual(page['count'], 1)
        self.assertIn('results', page)


def _png_base64():
    import base64
    import io
    from PIL import Image
    buffer = io.BytesIO()
    Image.new('RGB', (2, 2), (29, 43, 100)).save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()


class WebcoreRequestsTests(OrgTestCase):
    """Prośby webcore: wzmianki z kropką, typy zdjęć, can_update_progress w pełnym poście."""

    def test_mention_regex(self):
        from ideas.views import extract_mentions
        self.assertCountEqual(
            extract_mentions('Pytanie do @dawid.baran. Oraz @ab, @a i (@julia.majewska)'),
            ['dawid.baran', 'ab', 'julia.majewska'],
        )
        self.assertEqual(extract_mentions('Pisz na jan@firma.pl'), [])
        self.assertEqual(extract_mentions('@user_1-x...'), ['user_1-x'])

    def test_dotted_mention_notifies(self):
        from ideas.models import Notification
        dotted = self.make_user('dawid.baran', 'EMPLOYEE', self.prod)
        post = self.make_post(status=Status.SUBMITTED)
        response = self.as_user(self.employee2).post(
            f'/api/posts/{post.id}/comments/', {'text': 'Zobacz @dawid.baran.'}, format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Notification.objects.filter(recipient=dotted, type='MENTION').exists())

    def test_image_types_on_create_and_read(self):
        import tempfile
        from django.test import override_settings
        png = _png_base64()
        with tempfile.TemporaryDirectory() as media, override_settings(MEDIA_ROOT=media):
            response = self.as_user(self.employee2).post('/api/posts/', {
                'title': 'Ze zdjęciami', 'content': 'Treść', 'category': self.category.id,
                'assigned_manager': self.manager2.id,
                'images': [png, {'image': png, 'type': 'BEFORE'}, {'image': f'data:image/png;base64,{png}', 'type': 'AFTER'}],
            }, format='json')
            self.assertEqual(response.status_code, 201, response.data)
            items = self.as_user(self.employee2).get(f"/api/posts/{response.data['id']}/").data['image_items']
            self.assertEqual([item['type'] for item in items], ['GENERAL', 'BEFORE', 'AFTER'])

            bad = self.as_user(self.employee2).post('/api/posts/', {
                'title': 'Zły typ', 'content': 'Treść', 'category': self.category.id,
                'images': [{'image': png, 'type': 'DURING'}],
            }, format='json')
            self.assertEqual(bad.status_code, 400)
            self.assertIn('images', bad.data)

    def test_can_update_progress_in_full_post(self):
        post = self.make_post(status=Status.SUBMITTED)
        self.assertTrue(self.as_user(self.manager).get(f'/api/posts/{post.id}/').data['can_update_progress'])
        self.assertFalse(self.as_user(self.employee).get(f'/api/posts/{post.id}/').data['can_update_progress'])
        self.assertTrue(self.as_user(self.admin).get(f'/api/posts/{post.id}/').data['can_update_progress'])
        hidden = self.make_post()
        self.assertFalse(self.as_user(self.admin).get(f'/api/posts/{hidden.id}/').data['can_update_progress'])


class Review2VisibilityTests(OrgTestCase):
    """Review 2, #1 i #2: zakładki i wzmianki nie ujawniają pomysłu po utracie dostępu."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.lead_b = cls.make_user('leadb', 'TEAM_LEAD', cls.prod)

    def move_to_other_lead(self, post):
        """Lider odrzuca, autor wskazuje innego lidera działu i zgłasza ponownie."""
        response = self.as_user(self.lead).post(
            f'/api/posts/{post.id}/reject/', {'rejection_reason': 'Popraw'}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        author = self.as_user(self.employee)
        response = author.patch(f'/api/posts/{post.id}/', {'assigned_team_lead': self.lead_b.id}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(author.post(f'/api/posts/{post.id}/resubmit/').status_code, 200)
        self.assertEqual(post.approvals.order_by('order').first().approver, self.lead_b)

    def test_bookmarks_hide_post_after_access_lost(self):
        post = self.make_post()
        public = self.make_post(status=Status.SUBMITTED, title='Publiczny')
        client = self.as_user(self.lead)
        self.assertEqual(client.post(f'/api/posts/{post.id}/bookmark/').status_code, 200)
        self.assertEqual(client.post(f'/api/posts/{public.id}/bookmark/').status_code, 200)
        ids = [row['id'] for row in client.get('/api/posts/bookmarked/').data['results']]
        self.assertEqual(ids, [public.id, post.id])

        self.move_to_other_lead(post)
        client = self.as_user(self.lead)
        self.assertEqual(client.get(f'/api/posts/{post.id}/').status_code, 404)
        ids = [row['id'] for row in client.get('/api/posts/bookmarked/').data['results']]
        self.assertEqual(ids, [public.id])

    def comment(self, post, text, user=None):
        response = self.as_user(user or self.employee).post(
            f'/api/posts/{post.id}/comments/', {'text': text}, format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)

    def test_mention_only_for_readers(self):
        from ideas.models import Notification
        hidden = self.make_post()
        self.comment(hidden, 'Co sądzicie @emp2 i @lead?')
        mentions = Notification.objects.filter(type='MENTION', post=hidden)
        self.assertEqual(list(mentions.values_list('recipient', flat=True)), [self.lead.id])

        cancelled = self.make_post(status=Status.CANCELLED, with_approvals=False, title='Odrzucony')
        self.comment(cancelled, 'Zobacz @emp2')
        self.assertFalse(Notification.objects.filter(type='MENTION', post=cancelled).exists())

        public = self.make_post(status=Status.SUBMITTED, title='Publiczny')
        self.comment(public, 'Zobacz @emp2')
        self.assertTrue(Notification.objects.filter(type='MENTION', post=public, recipient=self.employee2).exists())

    def test_notifications_mask_content_of_posts_no_longer_visible(self):
        post = self.make_post(title='Tajny pomysł')
        self.comment(post, 'Pilne @lead')
        row = self.as_user(self.lead).get('/api/notifications/').data[0]
        self.assertEqual((row['type'], row['post_title'], row['comment_text']), ('MENTION', 'Tajny pomysł', 'Pilne @lead'))

        self.move_to_other_lead(post)
        client = self.as_user(self.lead)
        row = next(r for r in client.get('/api/notifications/').data if r['type'] == 'MENTION')
        self.assertEqual(row['post_id'], post.id)
        self.assertIsNone(row['post_title'])
        self.assertIsNone(row['comment_text'])
        marked = client.post(f"/api/notifications/{row['id']}/mark_read/").data
        self.assertIsNone(marked['post_title'])
        # Management widzi wszystkie pomysły, więc nadal dostaje treść.
        self.comment(post, 'Info dla @manager2')
        row = self.as_user(self.manager2).get('/api/notifications/').data[0]
        self.assertEqual(row['post_title'], 'Tajny pomysł')


class Review2WorkflowTests(OrgTestCase):
    """Review 2, #5, #6, #8: lider działu, blokada decyzji, atomowy resubmit."""

    def test_department_lead_must_be_team_lead_of_same_department(self):
        client = self.as_user(self.admin)
        for user in (self.employee, self.lead2):
            response = client.patch(f'/api/admin/departments/{self.prod.id}/', {'lead': user.id}, format='json')
            self.assertEqual(response.status_code, 400, user)
            self.assertIn('lead', response.data)
        response = client.post('/api/admin/departments/', {'name': 'Nowy', 'lead': self.lead.id}, format='json')
        self.assertEqual(response.status_code, 400)
        self.prod.refresh_from_db()
        self.assertEqual(self.prod.lead, self.lead)

    def test_resolve_team_lead_ignores_invalid_stored_lead(self):
        from users.models import CustomUser, Department
        for invalid in (self.employee2, self.lead2):
            # Zapis z pominięciem walidacji (stare dane lub ręczna zmiana w bazie).
            Department.objects.filter(pk=self.prod.pk).update(lead=invalid)
            author = CustomUser.objects.get(pk=self.employee.pk)
            post = self.make_post(author=author, title=f'Pomysł {invalid.username}')
            self.assertEqual(list(post.approvals.values_list('stage', flat=True)), ['MANAGER'])

    def test_explicit_lead_must_have_team_lead_role(self):
        colleague = self.make_user('kolega', 'EMPLOYEE', self.prod)
        response = self.as_user(self.employee).post('/api/posts/', {
            'title': 'Pomysł', 'content': 'Treść', 'category': self.category.id,
            'assigned_manager': self.manager.id, 'assigned_team_lead': colleague.id,
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('assigned_team_lead', response.data)

    def test_decision_checks_state_after_lock(self):
        """Stan sprawdzany na zablokowanym, świeżo odczytanym poście (nie na obiekcie z get_object)."""
        from unittest import mock
        from ideas import views
        post = self.make_post()
        client = self.as_user(self.lead)
        self.assertEqual(client.post(f'/api/posts/{post.id}/approve/').status_code, 200)

        real_lock = views.lock_post
        with mock.patch.object(views, 'lock_post', side_effect=real_lock) as lock:
            response = client.post(f'/api/posts/{post.id}/reject/', {'rejection_reason': 'Jednak nie'}, format='json')
        lock.assert_called_once_with(post.id)
        self.assertEqual(response.status_code, 403)
        post.refresh_from_db()
        self.assertEqual(post.status, Status.TO_VERIFY)
        self.assertEqual(
            list(post.approvals.order_by('order').values_list('decision', flat=True)),
            ['APPROVED', 'PENDING'],
        )

    def test_lock_conflict_returns_409(self):
        from unittest import mock
        from django.db import OperationalError
        post = self.make_post()
        with mock.patch('ideas.views.lock_post', side_effect=OperationalError('database is locked')):
            response = self.as_user(self.lead).post(f'/api/posts/{post.id}/approve/')
        self.assertEqual(response.status_code, 409)
        self.assertIn('detail', response.data)
        self.assertTrue(post.approvals.filter(decision='PENDING', stage='TEAM_LEAD').exists())

    def test_resubmit_is_atomic(self):
        from unittest import mock
        post = self.make_post(status=Status.CANCELLED, with_approvals=False, rejection_reason='Popraw')
        old = PostApproval.objects.create(post=post, stage='MANAGER', order=1, approver=self.manager, decision='REJECTED')
        client = self.as_user(self.employee)
        with mock.patch('ideas.views.init_approvals', side_effect=RuntimeError('awaria')):
            with self.assertRaises(RuntimeError):
                client.post(f'/api/posts/{post.id}/resubmit/')
        post.refresh_from_db()
        self.assertEqual(post.status, Status.CANCELLED)
        self.assertEqual(list(post.approvals.all()), [old])
        # Po awarii pomysł nadal da się zgłosić ponownie.
        self.assertEqual(client.post(f'/api/posts/{post.id}/resubmit/').status_code, 200)
        self.assertEqual(post.approvals.first().stage, 'TEAM_LEAD')


class Review2QueryCountTests(OrgTestCase):
    """Review 2, #7: stała liczba zapytań dla zakładek i powiadomień."""

    def count_queries(self, url):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        client = self.as_user(self.employee2)
        with CaptureQueriesContext(connection) as ctx:
            self.assertEqual(client.get(url).status_code, 200)
        return len(ctx.captured_queries)

    def make_rows(self, count):
        from ideas.models import Bookmark, Comment, Notification
        for i in range(count):
            post = self.make_post(status=Status.SUBMITTED, title=f'Pomysł {i}', author=self.employee)
            comment = Comment.objects.create(post=post, author=self.lead, text='Tekst')
            Like.objects.create(post=post, user=self.lead)
            Bookmark.objects.create(post=post, user=self.employee2)
            Notification.objects.create(
                recipient=self.employee2, actor=self.lead, post=post, comment=comment, type='COMMENT',
            )

    def test_constant_queries(self):
        self.make_rows(1)
        single = {url: self.count_queries(url) for url in ('/api/posts/bookmarked/', '/api/notifications/')}
        self.make_rows(6)
        for url, expected in single.items():
            self.assertEqual(self.count_queries(url), expected, url)


class Review2ConcurrentDecisionTests(TransactionTestCase):
    """Review 2, #6: równoległe approve i reject tego samego etapu na osobnych połączeniach
    kończą się spójnym stanem (jedna decyzja wygrywa, druga dostaje 400/403/409)."""

    def setUp(self):
        from users.models import Department
        self.department = Department.objects.create(name='Produkcja')
        self.employee = OrgTestCase.make_user('emp', 'EMPLOYEE', self.department)
        self.lead = OrgTestCase.make_user('lead', 'TEAM_LEAD', self.department)
        self.manager = OrgTestCase.make_user('manager', 'MANAGER', self.department)
        self.department.lead = self.lead
        self.department.save()
        from ideas.models import Category
        from ideas.services.approval import init_approvals
        self.post = KaizenPost.objects.create(
            author=self.employee, title='Pomysł', content='Opis',
            category=Category.objects.create(name='BHP'), assigned_manager=self.manager,
        )
        init_approvals(self.post)

    def run_parallel(self, *requests):
        import threading
        from django.db import connection
        from rest_framework.test import APIClient
        barrier = threading.Barrier(len(requests))
        results = [None] * len(requests)

        def worker(index, path, data):
            try:
                client = APIClient()
                client.force_authenticate(user=self.lead)
                barrier.wait()
                results[index] = client.post(path, data, format='json').status_code
            finally:
                connection.close()

        threads = [threading.Thread(target=worker, args=(i, *req)) for i, req in enumerate(requests)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        return results

    def test_parallel_approve_and_reject(self):
        base = f'/api/posts/{self.post.id}'
        codes = self.run_parallel((f'{base}/approve/', {}), (f'{base}/reject/', {'rejection_reason': 'Nie'}))
        self.assertEqual(codes.count(200), 1, codes)
        self.assertTrue(set(codes) <= {200, 400, 403, 409}, codes)
        self.post.refresh_from_db()
        decisions = list(self.post.approvals.order_by('order').values_list('decision', flat=True))
        if self.post.status == KaizenPost.Status.CANCELLED:
            self.assertEqual(decisions, ['REJECTED', 'SKIPPED'])
        else:
            self.assertEqual(self.post.status, KaizenPost.Status.TO_VERIFY)
            self.assertEqual(decisions, ['APPROVED', 'PENDING'])
