"""Wspólne filtry analityki: ?date_from=&date_to=&department=&category=&status="""
from dataclasses import dataclass
from datetime import date

from ideas.models import KaizenPost


def _parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(str(value).strip())
    except ValueError:
        return None


def _parse_int(value):
    try:
        return int(value) if value not in (None, '') else None
    except (TypeError, ValueError):
        return None


@dataclass
class AnalyticsFilters:
    date_from: date | None = None
    date_to: date | None = None
    department: int | None = None
    category: int | None = None
    status: str | None = None

    @classmethod
    def from_params(cls, params):
        status = (params.get('status') or '').upper().strip() or None
        if status not in KaizenPost.Status.values:
            status = None
        return cls(
            date_from=_parse_date(params.get('date_from')),
            date_to=_parse_date(params.get('date_to')),
            department=_parse_int(params.get('department')),
            category=_parse_int(params.get('category')),
            status=status,
        )

    def posts(self, qs=None):
        """Queryset postów zawężony filtrami (data = data zgłoszenia)."""
        qs = qs if qs is not None else KaizenPost.objects.all()
        if self.date_from:
            qs = qs.filter(created_at__date__gte=self.date_from)
        if self.date_to:
            qs = qs.filter(created_at__date__lte=self.date_to)
        if self.department:
            qs = qs.filter(author__department_id=self.department)
        if self.category:
            qs = qs.filter(category_id=self.category)
        if self.status:
            qs = qs.filter(status=self.status)
        return qs
