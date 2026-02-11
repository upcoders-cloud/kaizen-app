from django.urls import path
from .views import AccessCodeLoginView, LogoutView, SecureTokenObtainPairView, SecureTokenRefreshView

urlpatterns = [
    path('token/', SecureTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/code/', AccessCodeLoginView.as_view(), name='token_access_code'),
    path('token/refresh/', SecureTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
]
