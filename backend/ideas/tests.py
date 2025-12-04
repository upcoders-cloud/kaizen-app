from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import KaizenPost, Comment, Like

User = get_user_model()


class KaizenTests(APITestCase):

    # setUp uruchamia się PRZED każdym pojedynczym testem
    def setUp(self):
        # 1. Tworzymy testowego użytkownika
        self.user = User.objects.create_user(
            username='testuser',
            password='testpassword123',
            nickname='TestowyMarek'
        )
        # 2. Tworzymy drugiego użytkownika (do testowania lajków)
        self.user2 = User.objects.create_user(
            username='testuser2',
            password='testpassword123',
            nickname='InnyJacek'
        )

        # 3. Logujemy użytkownika w systemie testowym (pomijamy logowanie Microsoft)
        self.client.force_authenticate(user=self.user)

        # 4. Dane do tworzenia postów
        self.post_data = {
            'content': 'Testowy pomysł na usprawnienie',
            'category': 'PROCES'
        }

    # --- TESTY MODELI  ---

    def test_post_model_string_representation(self):
        """Sprawdza czy post wyświetla się jako tekst poprawnie"""
        post = KaizenPost.objects.create(author=self.user, content="Krótki tekst", category="BHP")
        expected_str = "BHP: Krótki tekst..."
        self.assertEqual(str(post), expected_str)

    def test_like_model_unique_constraint(self):
        """Sprawdza czy baza danych blokuje drugiego lajka od tej samej osoby"""
        post = KaizenPost.objects.create(author=self.user, content="Post do lajkowania")

        # Pierwszy lajk - OK
        Like.objects.create(user=self.user, post=post)

        # Drugi lajk - POWINIEN WYWOŁAĆ BŁĄD
        with self.assertRaises(Exception):  # Oczekujemy błędu IntegrityError
            Like.objects.create(user=self.user, post=post)

    # --- TESTY API (ENDPOINTY) ---

    def test_create_post_api(self):
        """Testuje endpoint POST /api/posts/"""
        url = reverse('post-list')  # To automatycznie znajduje URL /api/posts/
        response = self.client.post(url, self.post_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(KaizenPost.objects.count(), 1)
        self.assertEqual(KaizenPost.objects.get().author, self.user)  # Czy autor przypisał się sam?

    def test_get_posts_list_api(self):
        """Testuje endpoint GET /api/posts/"""
        # Najpierw tworzymy posta ręcznie w bazie
        KaizenPost.objects.create(author=self.user, **self.post_data)

        url = reverse('post-list')
        response = self.client.get(url, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        # Sprawdzamy czy API ukryło nazwisko i pokazało nickname
        self.assertEqual(response.data[0]['author']['nickname'], 'TestowyMarek')

    def test_create_comment_api(self):
        """Testuje endpoint POST /api/comments/"""
        post = KaizenPost.objects.create(author=self.user, **self.post_data)

        url = reverse('comment-list')  # URL: /api/comments/
        data = {'post': post.id, 'text': 'Świetny pomysł!'}

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comment.objects.count(), 1)
        self.assertEqual(Comment.objects.get().text, 'Świetny pomysł!')

    def test_like_api_flow(self):
        """Testuje endpoint POST /api/likes/ oraz blokadę duplikatów przez API"""
        post = KaizenPost.objects.create(author=self.user, **self.post_data)
        url = reverse('like-list')  # URL: /api/likes/
        data = {'post': post.id}

        # 1. Marek daje lajka
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(post.likes.count(), 1)

        # 2. Marek próbuje dać lajka drugi raz (API powinno zwrócić 400 Bad Request)
        response_duplicate = self.client.post(url, data, format='json')
        self.assertEqual(response_duplicate.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Jacek (inny user) daje lajka temu samemu postowi (powinno przejść)
        self.client.force_authenticate(user=self.user2)  # Przełączamy usera
        response_user2 = self.client.post(url, data, format='json')
        self.assertEqual(response_user2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(post.likes.count(), 2)
