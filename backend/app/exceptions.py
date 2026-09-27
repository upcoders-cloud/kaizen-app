from django.db import OperationalError
from django.http import Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler, set_rollback

NOT_FOUND_DETAIL = 'Nie znaleziono.'
CONFLICT_DETAIL = 'Operacja koliduje z inną, równoległą zmianą. Spróbuj ponownie.'

# PostgreSQL: deadlock_detected, serialization_failure, lock_not_available
_PG_CONFLICT_CODES = {'40P01', '40001', '55P03'}


def is_lock_conflict(exc):
    """Czy błąd bazy to konflikt blokad (SQLite "database is locked", deadlock PostgreSQL)."""
    if not isinstance(exc, OperationalError):
        return False
    cause = exc.__cause__
    code = getattr(cause, 'sqlstate', None) or getattr(cause, 'pgcode', None)
    if code in _PG_CONFLICT_CODES:
        return True
    # SQLite: "database is locked" / "database table is locked"
    return 'is locked' in str(exc).lower()


def exception_handler(exc, context):
    """Domyślny handler DRF + polski komunikat dla 404 z `get_object_or_404`
    (Django zwraca nieprzetłumaczone "No <Model> matches the given query.")
    oraz 409 zamiast 500 przy konflikcie blokad bazy."""
    if is_lock_conflict(exc):
        set_rollback()
        return Response({'detail': CONFLICT_DETAIL}, status=status.HTTP_409_CONFLICT)
    response = drf_exception_handler(exc, context)
    if response is not None and isinstance(exc, Http404):
        response.data = {'detail': NOT_FOUND_DETAIL}
    return response
