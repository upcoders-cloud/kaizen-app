from django.urls import path
from .views import SecureTokenObtainPairView, SecureTokenRefreshView, LogoutView

urlpatterns = [
    path('token/', SecureTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', SecureTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
]