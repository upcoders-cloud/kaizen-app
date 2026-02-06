import hashlib
import hmac
import re
from typing import Optional, Tuple

from django.conf import settings
from django.utils import timezone
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AccessLoginCode

ACCESS_CODE_REGEX = re.compile(r'^[A-Z0-9]{4}-[A-Z0-9]{4}$')
REFRESH_COOKIE_PATH = '/api/access/token/refresh/'


def normalize_access_code(raw_code: str) -> str:
    if raw_code is None:
        return ''
    code = str(raw_code).strip().upper().replace(' ', '')
    if len(code) == 8 and '-' not in code:
        code = f'{code[:4]}-{code[4:]}'
    return code


def is_valid_access_code_format(code: str) -> bool:
    return bool(ACCESS_CODE_REGEX.fullmatch(code or ''))


def build_access_code_digest(code: str) -> str:
    pepper = getattr(settings, 'ACCESS_CODE_PEPPER', settings.SECRET_KEY)
    return hmac.new(
        pepper.encode('utf-8'),
        code.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()


def build_login_response_payload(*, user, access_token: str) -> dict:
    return {
        'access': access_token,
        'username': user.username or '',
        'email': user.email or '',
        'first_name': user.first_name or '',
        'last_name': user.last_name or '',
        'gender': user.gender or '',
    }


def set_refresh_token_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        httponly=True,
        secure=getattr(settings, 'SESSION_COOKIE_SECURE', False),
        samesite='Lax',
        path=REFRESH_COOKIE_PATH,
    )


def clear_refresh_token_cookie(response: Response) -> None:
    response.delete_cookie(
        key='refresh_token',
        path=REFRESH_COOKIE_PATH,
        samesite='Lax',
    )


def issue_tokens_for_user(user) -> Tuple[str, str]:
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)
    return access_token, refresh_token


def authenticate_by_access_code(raw_code: str) -> Optional[object]:
    normalized_code = normalize_access_code(raw_code)
    if not is_valid_access_code_format(normalized_code):
        return None

    code_digest = build_access_code_digest(normalized_code)

    try:
        access_code = AccessLoginCode.objects.select_related('user').get(
            code_digest=code_digest,
            is_active=True,
        )
    except AccessLoginCode.DoesNotExist:
        return None

    user = access_code.user
    if not user or not user.is_active:
        return None

    if access_code.expires_at and access_code.expires_at <= timezone.now():
        return None

    access_code.last_used_at = timezone.now()
    access_code.save(update_fields=['last_used_at', 'updated_at'])

    return user
