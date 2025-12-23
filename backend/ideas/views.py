import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import KaizenPost, Comment, Like
from .serializers import PostSerializer, CommentSerializer, LikeSerializer
from .permissions import IsCommentAuthorOrReadOnly, IsPostAuthorOrReadOnly
from rest_framework.exceptions import ValidationError
from django.db import IntegrityError, transaction

logger = logging.getLogger(__name__)

class PostViewSet(viewsets.ModelViewSet):
    queryset = KaizenPost.objects.all().order_by('-created_at')
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsPostAuthorOrReadOnly]  # IsAuthenticated jeśli zamknąć apkę

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        user = request.user
        like_obj, created = Like.objects.get_or_create(post=post, user=user)

        if not created:
            like_obj.delete()  # Jeśli już był like, to go usuwamy (toggle)
            return Response({'status': 'unliked'})
        return Response({'status': 'liked'})

    @action(detail=True, methods=['post', 'get'])
    def comments(self, request, pk=None):
        post = self.get_object()
        if request.method == 'GET':
            comments = post.comments.all()
            serializer = CommentSerializer(comments, many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            logger.info(
                '[comments] auth_header=%s user=%s',
                request.META.get('HTTP_AUTHORIZATION'),
                request.user
            )
            serializer = CommentSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(author=request.user, post=post)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CommentViewSet(viewsets.ModelViewSet):
    # Pobieramy wszystkie komentarze, najnowsze na górze
    queryset = Comment.objects.all().order_by('-created_at')
    serializer_class = CommentSerializer

    # Opcjonalnie: Tylko zalogowani mogą widzieć/pisać
    permission_classes = [permissions.IsAuthenticated, IsCommentAuthorOrReadOnly]

    # To jest KLUCZOWE przy dodawaniu komentarza:
    # Automatycznie przypisujemy autora jako osobę zalogowaną
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)



class LikeViewSet(viewsets.ModelViewSet):
    queryset = Like.objects.all()
    serializer_class = LikeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        try:
            # Próba zapisania
            with transaction.atomic():
                serializer.save(user=self.request.user)
        except IntegrityError:
            # Jeśli baza krzyknie, że duplikat ->  HTTP 400 dla Frontendu
            raise ValidationError({
                "detail": "Już polubiłeś ten post! (Duplikat)"
            })
