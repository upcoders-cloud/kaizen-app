from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiResponse, OpenApiExample

# --- Documentation Helpers ---
AUTH_TAG = ["Authentication"]

LOGIN_RESPONSE_SCHEMA = inline_serializer(
    name='LoginResponse',
    fields={
        'access': serializers.CharField(),
        'username': serializers.CharField(),
        'email': serializers.CharField(),
        'first_name': serializers.CharField(),
        'last_name': serializers.CharField(),
        'gender': serializers.CharField(),
    }
)

TOKEN_REFRESH_RESPONSE_SCHEMA = inline_serializer(
    name='TokenRefreshResponse',
    fields={
        'access': serializers.CharField(),
    }
)


class SecureTokenObtainPairView(TokenObtainPairView):
    @extend_schema(
        summary="User Login",
        description=(
                "Takes user credentials and returns an access token along with the username. "
                "A refresh token is automatically stored in a secure HttpOnly cookie."
        ),
        tags=AUTH_TAG,
        responses={
            200: LOGIN_RESPONSE_SCHEMA,
            401: OpenApiResponse(description="Invalid credentials (Username/Password)")
        },
        examples=[
            OpenApiExample(
                'Successful Login Response',
                value={
                    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "username": "michal_kaizen",
                    "email": "michal@example.com",
                    "first_name": "Michal",
                    "last_name": "Nowak",
                    "gender": "male"
                },
                response_only=True,
            )
        ]
    )
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            # Inject username into response body
            username = request.data.get('username')
            response.data['username'] = username
            User = get_user_model()
            user = User.objects.filter(username=username).first()
            if user:
                response.data['first_name'] = user.first_name or ''
                response.data['last_name'] = user.last_name or ''
                response.data['gender'] = user.gender or ''
                response.data['email'] = user.email or ''
            else:
                response.data['first_name'] = ''
                response.data['last_name'] = ''
                response.data['gender'] = ''
                response.data['email'] = ''

            # Extract and set Refresh Token as HttpOnly Cookie
            refresh_token = response.data.get('refresh')
            response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                httponly=True,
                secure=getattr(settings, 'SESSION_COOKIE_SECURE', False),
                samesite='Lax',
                path='/api/access/token/refresh/',
            )

            # Clean up JSON body
            del response.data['refresh']

        return response


class SecureTokenRefreshView(TokenRefreshView):
    @extend_schema(
        summary="Refresh Access Token",
        description=(
                "Uses the refresh token stored in the HttpOnly cookie to issue a new access token. "
                "No request body is required as the token is read from cookies."
        ),
        tags=AUTH_TAG,
        request=None,  # Removes the 'refresh' requirement from Swagger UI body
        responses={
            200: TOKEN_REFRESH_RESPONSE_SCHEMA,
            401: OpenApiResponse(description="Refresh token is expired or invalid")
        }
    )
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')

        if refresh_token:
            mutable_data = request.data.copy()
            mutable_data['refresh'] = refresh_token
            request._full_data = mutable_data

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200 and 'refresh' in response.data:
            new_refresh = response.data['refresh']
            response.set_cookie(
                key='refresh_token',
                value=new_refresh,
                httponly=True,
                secure=getattr(settings, 'SESSION_COOKIE_SECURE', False),
                samesite='Lax',
                path='/api/access/token/refresh/',
            )
            del response.data['refresh']

        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="User Logout",
        description="Invalidates the session by blacklisting the token and clearing the cookie.",
        tags=AUTH_TAG,
        responses={
            200: inline_serializer(
                name='LogoutSuccess',
                fields={'detail': serializers.CharField()}
            )
        }
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
            {"detail": "Successfully logged out and token invalidated."},
            status=status.HTTP_200_OK
        )
        response.delete_cookie(
            key='refresh_token',
            path='/api/access/token/refresh/',
            samesite='Lax'
        )
        return response
