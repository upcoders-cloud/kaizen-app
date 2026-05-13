"""
Logika akceptacji posta.

Workflow:
1. Pracownik tworzy post i wskazuje kierownika (assigned_manager).
   Tworzony jest jeden stage `MANAGER` (PENDING).
2. Kierownik podejmuje decyzję `apply_manager_decision`:
   - przy APPROVED uzupełnia `estimated_cost`, `deadline` i ewentualnie
     `assigned_director`. Jeśli koszt przekracza `COST_THRESHOLD_DIRECTOR`,
     dynamicznie tworzony jest stage `DIRECTOR` (PENDING) — post zostaje
     `TO_VERIFY` do czasu decyzji dyrektora.
   - przy REJECTED post → `CANCELLED`, pozostałe pola opcjonalnie aktualizowane.
3. Dyrektor (jeśli wymagany) decyduje zwykłym `process_decision` —
   APPROVED → `SUBMITTED`, REJECTED → `CANCELLED`.
"""
from decimal import Decimal

from django.db.models import Max
from django.utils import timezone

from ..models import KaizenPost, PostApproval


COST_THRESHOLD_DIRECTOR = Decimal('10000.00')


def director_required(cost):
    """Czy koszt wymusza eskalację do dyrektora."""
    if cost is None:
        return False
    try:
        value = Decimal(str(cost))
    except Exception:
        return False
    return value > COST_THRESHOLD_DIRECTOR


def init_approvals(post):
    """Tworzy początkowy etap akceptacji (zawsze MANAGER).

    Etap DIRECTOR dodawany jest dynamicznie przy akceptacji kierownika,
    gdy koszt przekracza próg `COST_THRESHOLD_DIRECTOR`.
    """
    if post.approvals.exists():
        return list(post.approvals.all())
    if not post.assigned_manager_id:
        return []
    approval = PostApproval.objects.create(
        post=post,
        stage=PostApproval.Stage.MANAGER,
        order=1,
        approver=post.assigned_manager,
    )
    return [approval]


def current_pending_stage(post):
    """Pierwszy etap PENDING dla posta (po `order`) lub None."""
    return (
        post.approvals
        .filter(decision=PostApproval.Decision.PENDING)
        .order_by('order')
        .first()
    )


def is_active_approver(post, user):
    """Czy podany user może zaakceptować/odrzucić aktualny etap."""
    stage = current_pending_stage(post)
    if not stage or not stage.approver_id:
        return False
    return stage.approver_id == user.id


def apply_manager_decision(
    post,
    user,
    decision,
    *,
    estimated_cost=None,
    deadline=None,
    assigned_director=None,
    comment=None,
):
    """
    Decyzja kierownika z opcjonalnym uzupełnieniem kosztu/terminu/dyrektora.

    Zwraca `(stage, finished)`, gdzie `finished` oznacza że post osiągnął stan
    końcowy (SUBMITTED albo CANCELLED). Jeśli kierownik zaakceptował, ale
    eskalacja do dyrektora jest wymagana, `finished=False`.
    """
    stage = current_pending_stage(post)
    if stage is None or stage.stage != PostApproval.Stage.MANAGER:
        return None, False
    if stage.approver_id != user.id:
        return None, False
    if decision not in {PostApproval.Decision.APPROVED, PostApproval.Decision.REJECTED}:
        return None, False

    update_fields = []
    if estimated_cost is not None:
        try:
            post.estimated_cost = Decimal(str(estimated_cost))
            update_fields.append('estimated_cost')
        except Exception:
            pass
    if deadline is not None:
        post.deadline = deadline
        update_fields.append('deadline')
    if assigned_director is not None:
        post.assigned_director = assigned_director
        update_fields.append('assigned_director')

    stage.decision = decision
    stage.comment = (comment or '').strip() or None
    stage.decided_at = timezone.now()
    stage.save(update_fields=['decision', 'comment', 'decided_at'])

    if decision == PostApproval.Decision.REJECTED:
        post.status = KaizenPost.Status.CANCELLED
        post.rejection_reason = stage.comment
        update_fields.extend(['status', 'rejection_reason'])
        post.save(update_fields=list(set(update_fields)))
        return stage, True

    # APPROVED: czy potrzebna eskalacja do dyrektora?
    if director_required(post.estimated_cost):
        if not post.assigned_director_id:
            # Caller powinien był zwalidować — fallback: cofnij decyzję
            stage.decision = PostApproval.Decision.PENDING
            stage.decided_at = None
            stage.save(update_fields=['decision', 'decided_at'])
            raise ValueError('Dla kosztu powyżej progu wymagany jest dyrektor.')
        # Tworzymy nowy stage DIRECTOR (order = max + 1)
        max_order = post.approvals.aggregate(value=Max('order')).get('value') or 0
        PostApproval.objects.get_or_create(
            post=post,
            stage=PostApproval.Stage.DIRECTOR,
            defaults={
                'order': max_order + 1,
                'approver': post.assigned_director,
            },
        )
        if update_fields:
            post.save(update_fields=list(set(update_fields)))
        return stage, False

    # Brak eskalacji — post zatwierdzony
    post.status = KaizenPost.Status.SUBMITTED
    post.rejection_reason = None
    update_fields.extend(['status', 'rejection_reason'])
    post.save(update_fields=list(set(update_fields)))
    return stage, True


def process_decision(post, user, decision, comment=None):
    """Decyzja na aktualnym pending stage'u (używana głównie dla DIRECTOR).

    Manager używa `apply_manager_decision` żeby móc przy okazji uzupełnić
    koszt/termin/dyrektora.
    """
    stage = current_pending_stage(post)
    if stage is None:
        return None, False
    if stage.approver_id != user.id:
        return None, False
    if decision not in {PostApproval.Decision.APPROVED, PostApproval.Decision.REJECTED}:
        return None, False

    stage.decision = decision
    stage.comment = (comment or '').strip() or None
    stage.decided_at = timezone.now()
    stage.save(update_fields=['decision', 'comment', 'decided_at'])

    if decision == PostApproval.Decision.REJECTED:
        post.approvals.filter(decision=PostApproval.Decision.PENDING).update(
            decision=PostApproval.Decision.SKIPPED,
            decided_at=timezone.now(),
        )
        post.status = KaizenPost.Status.CANCELLED
        post.rejection_reason = stage.comment
        post.save(update_fields=['status', 'rejection_reason'])
        return stage, True

    next_stage = current_pending_stage(post)
    if next_stage is None:
        post.status = KaizenPost.Status.SUBMITTED
        post.rejection_reason = None
        post.save(update_fields=['status', 'rejection_reason'])
        return stage, True
    return stage, False
