"""
Testy integracyjne pełnego przepływu pomysłu przez HTTP API:
zgłoszenie -> lider -> kierownik (-> dyrektor) -> wdrożenie, oraz odrzucenie z ponownym zgłoszeniem.
Sprawdzają statusy, kolejki akceptacji, powiadomienia, punkty (ledger) i odznaki.
"""
from gamification.models import Action, Badge, Level, PointTransaction
from ideas.models import KaizenPost, Notification, PostApproval

from .testing import OrgTestCase

Status = KaizenPost.Status


class IdeaLifecycleTests(OrgTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        Level.objects.create(name='Start', min_points=0, order=1)
        Level.objects.create(name='Innowator', min_points=50, order=2)
        Badge.objects.create(code='first-idea', name='Pierwszy pomysł',
                             criteria_type=Badge.Criteria.POST_COUNT, threshold=1)
        Badge.objects.create(code='implemented-1', name='Sprawczy',
                             criteria_type=Badge.Criteria.IMPLEMENTED_COUNT, threshold=1)

    # --- helpers ---

    def submit_idea(self, title='Automatyczne raporty zmiany'):
        response = self.as_user(self.employee).post('/api/posts/', {
            'title': title, 'content': 'Raport z MES po każdej zmianie.',
            'category': self.category.id, 'assigned_manager': self.manager.id,
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data['id']

    def post_as(self, user, url, payload=None):
        return self.as_user(user).post(url, payload or {}, format='json')

    def detail(self, user, post_id):
        response = self.as_user(user).get(f'/api/posts/{post_id}/')
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def queue_count(self, user):
        return self.as_user(user).get('/api/posts/approvals_queue/count/').data['count']

    def actions(self, user):
        return sorted(PointTransaction.objects.filter(user=user).values_list('action', flat=True))

    def points(self, user):
        return self.as_user(user).get('/api/gamification/me/').data['points']

    def notifications(self, user):
        data = self.as_user(user).get('/api/notifications/').data
        return [(n['type'], n['post_id']) for n in data]

    # --- scenariusze ---

    def test_full_flow_below_threshold_to_implemented(self):
        post_id = self.submit_idea()

        # Zgłoszenie: ścieżka lider -> kierownik, lider dostaje zadanie
        post = self.detail(self.employee, post_id)
        self.assertEqual(post['status'], Status.TO_VERIFY)
        self.assertEqual([a['stage'] for a in post['approvals']], ['TEAM_LEAD', 'MANAGER'])
        self.assertEqual(post['current_stage']['approver']['id'], self.lead.id)
        self.assertEqual((self.queue_count(self.lead), self.queue_count(self.manager)), (1, 0))
        self.assertIn(('ASSIGNED', post_id), self.notifications(self.lead))
        self.assertEqual(self.actions(self.employee), [Action.IDEA_CREATED])

        # Lider akceptuje bez kosztu -> kolejka kierownika
        response = self.post_as(self.lead, f'/api/posts/{post_id}/approve/', {'comment': 'Popieram'})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['status'], Status.TO_VERIFY)
        self.assertEqual(response.data['current_stage']['stage'], 'MANAGER')
        self.assertEqual((self.queue_count(self.lead), self.queue_count(self.manager)), (0, 1))
        self.assertIn(('ASSIGNED', post_id), self.notifications(self.manager))
        self.assertEqual(self.actions(self.lead), [Action.REVIEW_COMPLETED])

        # Kierownik akceptuje z kosztem poniżej progu -> SUBMITTED, bez etapu dyrektora
        response = self.post_as(self.manager, f'/api/posts/{post_id}/approve/', {
            'estimated_cost': '4500.00', 'deadline': '2026-12-31',
        })
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['status'], Status.SUBMITTED)
        self.assertEqual(response.data['estimated_cost'], '4500.00')
        self.assertEqual([a['decision'] for a in response.data['approvals']], ['APPROVED', 'APPROVED'])
        self.assertIsNone(response.data['current_stage'])
        self.assertIn(('APPROVED', post_id), self.notifications(self.employee))
        self.assertEqual(self.queue_count(self.manager), 0)

        # Postęp: tylko przypisany kierownik; 50% -> IN_PROGRESS, 100% -> IMPLEMENTED
        url = f'/api/posts/{post_id}/progress/'
        self.assertEqual(self.as_user(self.lead).patch(url, {'progress_percent': 50}, format='json').status_code, 403)
        response = self.as_user(self.manager).patch(url, {'progress_percent': 50}, format='json')
        self.assertEqual(response.data['status'], Status.IN_PROGRESS)
        self.assertTrue(response.data['can_update_progress'])
        response = self.as_user(self.manager).patch(url, {'progress_percent': 100}, format='json')
        self.assertEqual(response.data['status'], Status.IMPLEMENTED)

        # Punkty autora: 5 (zgłoszenie) + 15 (akceptacja) + 50 (wdrożenie)
        self.assertEqual(
            self.actions(self.employee),
            sorted([Action.IDEA_CREATED, Action.IDEA_APPROVED, Action.IDEA_IMPLEMENTED]),
        )
        me = self.as_user(self.employee).get('/api/gamification/me/').data
        self.assertEqual(me['points'], 70)
        self.assertEqual(me['level']['name'], 'Innowator')
        earned = {b['badge']['code'] for b in me['badges'] if b['earned']}
        self.assertEqual(earned, {'first-idea', 'implemented-1'})
        self.assertEqual(self.points(self.manager), 5)  # jedna weryfikacja

        # Pomysł widoczny w feedzie, kanbanie i "Moim wkładzie"
        feed_ids = [p['id'] for p in self.as_user(self.employee2).get('/api/posts/').data['results']]
        self.assertIn(post_id, feed_ids)
        pipeline = self.as_user(self.manager).get('/api/posts/pipeline/').data
        self.assertEqual([p['id'] for p in pipeline['IMPLEMENTED']], [post_id])
        impact = self.as_user(self.employee).get('/api/analytics/me/impact/').data
        self.assertEqual((impact['total_ideas'], impact['implemented'], impact['points']), (1, 1, 70))

    def test_flow_above_threshold_requires_director(self):
        post_id = self.submit_idea('Nowa linia pakująca')
        self.assertEqual(self.post_as(self.lead, f'/api/posts/{post_id}/approve/').status_code, 200)

        # Koszt > 10 000 zł bez dyrektora -> 400, etap kierownika nadal czeka
        response = self.post_as(self.manager, f'/api/posts/{post_id}/approve/', {'estimated_cost': '25000'})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.queue_count(self.manager), 1)

        response = self.post_as(self.manager, f'/api/posts/{post_id}/approve/', {
            'estimated_cost': '25000', 'assigned_director': self.director.id,
        })
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['status'], Status.TO_VERIFY)
        self.assertEqual(response.data['current_stage']['stage'], 'DIRECTOR')
        self.assertEqual([a['stage'] for a in response.data['approvals']], ['TEAM_LEAD', 'MANAGER', 'DIRECTOR'])
        self.assertEqual((self.queue_count(self.manager), self.queue_count(self.director)), (0, 1))
        self.assertIn(('ASSIGNED', post_id), self.notifications(self.director))
        self.assertNotIn(Action.IDEA_APPROVED, self.actions(self.employee))

        # Dyrektor spoza łańcucha innego posta nie może decydować; tu decyduje przypisany
        self.assertEqual(self.post_as(self.lead, f'/api/posts/{post_id}/approve/').status_code, 403)
        response = self.post_as(self.director, f'/api/posts/{post_id}/approve/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['status'], Status.SUBMITTED)
        self.assertIn(('APPROVED', post_id), self.notifications(self.employee))
        self.assertEqual(self.points(self.employee), 20)  # 5 + 15
        self.assertEqual(self.actions(self.director), [Action.REVIEW_COMPLETED])

        # Dyrektor (przypisany) może też prowadzić postęp
        response = self.as_user(self.director).patch(
            f'/api/posts/{post_id}/progress/', {'progress_percent': 100}, format='json',
        )
        self.assertEqual(response.data['status'], Status.IMPLEMENTED)
        self.assertEqual(self.points(self.employee), 70)

    def test_rejection_and_resubmit(self):
        post_id = self.submit_idea('Kanban materiałów')

        # Odrzucenie wymaga powodu
        self.assertEqual(self.post_as(self.lead, f'/api/posts/{post_id}/reject/').status_code, 400)
        response = self.post_as(self.lead, f'/api/posts/{post_id}/reject/', {'rejection_reason': 'Doprecyzuj koszty'})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['status'], Status.CANCELLED)
        self.assertEqual(response.data['rejection_reason'], 'Doprecyzuj koszty')
        self.assertEqual(
            [(a['stage'], a['decision']) for a in response.data['approvals']],
            [('TEAM_LEAD', 'REJECTED'), ('MANAGER', 'SKIPPED')],
        )
        self.assertIn(('REJECTED', post_id), self.notifications(self.employee))
        self.assertEqual(self.queue_count(self.manager), 0)

        # Odrzucony: widoczny dla autora i łańcucha, niewidoczny dla innych, nie w feedzie
        self.assertEqual(self.as_user(self.employee2).get(f'/api/posts/{post_id}/').status_code, 404)
        self.assertNotIn(post_id, [p['id'] for p in self.as_user(self.employee2).get('/api/posts/').data['results']])
        self.assertIn(post_id, [p['id'] for p in self.as_user(self.employee).get('/api/posts/my_cases/').data])

        # Tylko autor może ponownie zgłosić; wcześniej może poprawić treść
        self.assertEqual(self.post_as(self.manager, f'/api/posts/{post_id}/resubmit/').status_code, 403)
        response = self.as_user(self.employee).patch(
            f'/api/posts/{post_id}/', {'content': 'Koszt: 2 tablice kanban, ok. 800 zł.'}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        response = self.post_as(self.employee, f'/api/posts/{post_id}/resubmit/')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['status'], Status.TO_VERIFY)
        self.assertIsNone(response.data['rejection_reason'])
        self.assertEqual(
            [(a['stage'], a['decision']) for a in response.data['approvals']],
            [('TEAM_LEAD', 'PENDING'), ('MANAGER', 'PENDING')],
        )
        self.assertEqual(self.queue_count(self.lead), 1)

        # Drugie podejście przechodzi
        self.assertEqual(self.post_as(self.lead, f'/api/posts/{post_id}/approve/').status_code, 200)
        response = self.post_as(self.manager, f'/api/posts/{post_id}/approve/', {'estimated_cost': '800'})
        self.assertEqual(response.data['status'], Status.SUBMITTED)

        # Punkty bez duplikatów: jedno zgłoszenie i jedna akceptacja; lider: dwie decyzje (odrzucenie + akceptacja)
        self.assertEqual(self.actions(self.employee), sorted([Action.IDEA_CREATED, Action.IDEA_APPROVED]))
        self.assertEqual(self.actions(self.lead), [Action.REVIEW_COMPLETED, Action.REVIEW_COMPLETED])
        self.assertEqual(
            Notification.objects.filter(recipient=self.lead, type='ASSIGNED', post_id=post_id).count(), 2,
        )
        self.assertEqual(PostApproval.objects.filter(post_id=post_id).count(), 2)
