from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.conf import settings


class SecureTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh_token = response.data.get('refresh')
            # Set HttpOnly Cookie for the refresh token
            response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                httponly=True,  # Important: JavaScript cannot read this
                secure=False,  # Set to True in production (HTTPS)
                samesite='Lax',  # Protects against CSRF
                path='/api/access/token/refresh/',  # Only sent to the refresh endpoint
            )
            # Remove refresh from the JSON body for security
            del response.data['refresh']
        return response


from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.response import Response


class SecureTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        # 1. Get the token from the cookie
        refresh_token = request.COOKIES.get('refresh_token')

        if refresh_token:
            # 2. Make the request data mutable so we can inject the token
            # If request.data is a QueryDict (standard), we need to copy it
            if hasattr(request.data, '_mutable'):
                request.data._mutable = True

            # If it's a standard dictionary/JSON, we just update it
            # Using a copy is the safest way to bypass DRF's immutability
            mutable_data = request.data.copy()
            mutable_data['refresh'] = refresh_token
            request._full_data = mutable_data  # Injecting into the internal DRF data holder

        # 3. Call the parent logic
        response = super().post(request, *args, **kwargs)

        # 4. Handle Rotation (Setting the NEW refresh token back into a cookie)
        if response.status_code == 200 and 'refresh' in response.data:
            new_refresh = response.data['refresh']
            response.set_cookie(
                key='refresh_token',
                value=new_refresh,
                httponly=True,
                secure=False,  # Set to True in production (HTTPS)
                samesite='Lax',
                path='/api/access/token/refresh/',
            )
            # Remove from JSON to keep it out of JavaScript's reach
            del response.data['refresh']

        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # 1. Get the token from the cookie
        refresh_token = request.COOKIES.get('refresh_token')

        if refresh_token:
            try:
                # 2. Add the token to the server-side blacklist
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                # If the token is already expired or invalid, we just continue
                pass

        # 3. Prepare the response to clear the cookie
        response = Response(
            {"detail": "Successfully logged out and token invalidated."},
            status=status.HTTP_200_OK
        )

        # 4. Instruct browser to delete the cookie
        response.delete_cookie(
            key='refresh_token',
            path='/api/access/token/refresh/',
            samesite='Lax'
        )

        return response