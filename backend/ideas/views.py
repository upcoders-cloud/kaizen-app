import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import KaizenPost, Comment, Like, PostSurvey
from .serializers import PostSerializer, CommentSerializer, LikeSerializer, PostSurveySerializer, PostSurveyInputSerializer
from .permissions import IsCommentAuthorOrReadOnly, IsPostAuthorOrReadOnly
from rest_framework.exceptions import ValidationError
from django.db import IntegrityError, transaction
from .services.post_survey_calculator import calculate_survey_results

logger = logging.getLogger(__name__)

class PostViewSet(viewsets.ModelViewSet):
    queryset = KaizenPost.objects.all().order_by('-created_at')
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsPostAuthorOrReadOnly]  # IsAuthenticated jeśli zamknąć apkę

    def get_permissions(self):
        if self.action == 'like':
            return [permissions.IsAuthenticated()]
        if self.action == 'comments':
            if self.request.method == 'POST':
                return [permissions.IsAuthenticated()]
            return [permissions.AllowAny()]
        if self.action == 'survey':
            if self.request.method in ['POST', 'PUT']:
                return [permissions.IsAuthenticated()]
            return [permissions.AllowAny()]
        return super().get_permissions()

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

    @action(detail=True, methods=['post', 'put'])
    def survey(self, request, pk=None):
        post = self.get_object()

        if request.user != post.author:
            return Response({'detail': 'Brak uprawnień do ankiety.'}, status=status.HTTP_403_FORBIDDEN)

        existing_survey = getattr(post, 'survey', None)
        if request.method == 'POST' and existing_survey:
            return Response({'detail': 'Ankieta już istnieje.'}, status=status.HTTP_400_BAD_REQUEST)
        if request.method == 'PUT' and not existing_survey:
            return Response({'detail': 'Ankieta nie istnieje.'}, status=status.HTTP_404_NOT_FOUND)

        input_serializer = PostSurveyInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        survey_payload = input_serializer.validated_data
        calculated = calculate_survey_results(**survey_payload)

        survey_values = {**survey_payload, **calculated}
        if existing_survey:
            for key, value in survey_values.items():
                setattr(existing_survey, key, value)
            existing_survey.save()
            survey = existing_survey
            response_status = status.HTTP_200_OK
        else:
            survey = PostSurvey.objects.create(post=post, **survey_values)
            response_status = status.HTTP_201_CREATED

        return Response(PostSurveySerializer(survey).data, status=response_status)


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
