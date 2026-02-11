import logging

from django.contrib.auth import get_user_model
from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import AccessCodeLoginSerializer
from .services import (
    authenticate_by_access_code,
    build_login_response_payload,
    clear_refresh_token_cookie,
    issue_tokens_for_user,
    set_refresh_token_cookie,
)

logger = logging.getLogger(__name__)

# --- Documentation Helpers ---
AUTH_TAG = ['Authentication']
AUTH_FAILED_DETAIL = 'Invalid credentials.'

LOGIN_RESPONSE_SCHEMA = inline_serializer(
    name='LoginResponse',
    fields={
        'access': serializers.CharField(),
        'username': serializers.CharField(),
        'email': serializers.CharField(),
        'first_name': serializers.CharField(),
        'last_name': serializers.CharField(),
        'gender': serializers.CharField(),
    },
)

TOKEN_REFRESH_RESPONSE_SCHEMA = inline_serializer(
    name='TokenRefreshResponse',
    fields={
        'access': serializers.CharField(),
    },
)


def _get_client_ip(request):
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')


class SecureTokenObtainPairView(TokenObtainPairView):
    @extend_schema(
        summary='User Login',
        description=(
            'Takes user credentials and returns an access token along with the username. '
            'A refresh token is automatically stored in a secure HttpOnly cookie.'
        ),
        tags=AUTH_TAG,
        responses={
            200: LOGIN_RESPONSE_SCHEMA,
            401: OpenApiResponse(description='Invalid credentials (Username/Password)'),
        },
        examples=[
            OpenApiExample(
                'Successful Login Response',
                value={
                    'access': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    'username': 'michal_kaizen',
                    'email': 'michal@example.com',
                    'first_name': 'Michal',
                    'last_name': 'Nowak',
                    'gender': 'male',
                },
                response_only=True,
            )
        ],
    )
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            refresh_token = response.data.get('refresh')
            username = request.data.get('username')
            user_model = get_user_model()
            user = user_model.objects.filter(username=username).first()

            if user:
                access_token = response.data.get('access', '')
                response.data = build_login_response_payload(user=user, access_token=access_token)
            else:
                response.data['username'] = username or ''
                response.data['first_name'] = ''
                response.data['last_name'] = ''
                response.data['gender'] = ''
                response.data['email'] = ''

            if refresh_token:
                set_refresh_token_cookie(response, refresh_token)
            response.data.pop('refresh', None)

        return response


class AccessCodeLoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'access_code_login'

    @extend_schema(
        summary='Access Code Login',
        description=(
            'Authenticates user with access code in format XXXX-XXXX and returns JWT access token. '
            'Refresh token is set as HttpOnly cookie.'
        ),
        tags=AUTH_TAG,
        request=AccessCodeLoginSerializer,
        responses={
            200: LOGIN_RESPONSE_SCHEMA,
            400: OpenApiResponse(description='Invalid payload or code format'),
            401: OpenApiResponse(description='Invalid credentials (access code)'),
            429: OpenApiResponse(description='Too many attempts'),
        },
    )
    def post(self, request):
        serializer = AccessCodeLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code']
        user = authenticate_by_access_code(code)

        if not user:
            logger.warning('Access code login failed from ip=%s', _get_client_ip(request))
            return Response({'detail': AUTH_FAILED_DETAIL}, status=status.HTTP_401_UNAUTHORIZED)

        access_token, refresh_token = issue_tokens_for_user(user)
        response_payload = build_login_response_payload(user=user, access_token=access_token)

        response = Response(response_payload, status=status.HTTP_200_OK)
        set_refresh_token_cookie(response, refresh_token)
        return response


class SecureTokenRefreshView(TokenRefreshView):
    @extend_schema(
        summary='Refresh Access Token',
        description=(
            'Uses the refresh token stored in the HttpOnly cookie to issue a new access token. '
            'No request body is required as the token is read from cookies.'
        ),
        tags=AUTH_TAG,
        request=None,
        responses={
            200: TOKEN_REFRESH_RESPONSE_SCHEMA,
            401: OpenApiResponse(description='Refresh token is expired or invalid'),
        },
    )
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')

        if refresh_token:
            mutable_data = request.data.copy()
            mutable_data['refresh'] = refresh_token
            request._full_data = mutable_data

        response = super().post(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK and 'refresh' in response.data:
            new_refresh = response.data.pop('refresh')
            set_refresh_token_cookie(response, new_refresh)

        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary='User Logout',
        description='Invalidates the session by blacklisting the token and clearing the cookie.',
        tags=AUTH_TAG,
        responses={
            200: inline_serializer(
                name='LogoutSuccess',
                fields={'detail': serializers.CharField()},
            )
        },
    )
    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass

        response = Response(
            {'detail': 'Successfully logged out and token invalidated.'},
            status=status.HTTP_200_OK,
        )
        clear_refresh_token_cookie(response)
        return response
