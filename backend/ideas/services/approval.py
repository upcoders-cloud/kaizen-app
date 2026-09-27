"""
Logika akceptacji posta.

Workflow:
0. (opcjonalnie) Jeśli autor jest pracownikiem (EMPLOYEE), a jego dział ma
   lidera (`Department.lead`) albo post ma `assigned_team_lead`, pierwszym
   etapem jest `TEAM_LEAD` (PENDING). Decyzja lidera idzie przez
   `process_decision`; akceptacja przekazuje post kierownikowi.
1. Pracownik tworzy post i wskazuje kierownika (assigned_manager).
   Tworzony jest stage `MANAGER` (PENDING).
2. Kierownik podejmuje decyzję `apply_manager_decision`:
   - przy APPROVED uzupełnia `estimated_cost`, `deadline` i ewentualnie
     `assigned_director`. Jeśli koszt przekracza `COST_THRESHOLD_DIRECTOR`,
     dynamicznie tworzony jest stage `DIRECTOR` (PENDING) - post zostaje
     `TO_VERIFY` do czasu decyzji dyrektora.
   - przy REJECTED post → `CANCELLED`, pozostałe pola opcjonalnie aktualizowane.
3. Dyrektor (jeśli wymagany) decyduje zwykłym `process_decision` -
   APPROVED → `SUBMITTED`, REJECTED → `CANCELLED`.
"""
from decimal import Decimal

from django.db import transaction
from django.db.models import Max, OuterRef, Subquery
from django.utils import timezone

from users.models import department_lead_error
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


def resolve_team_lead(post):
    """Lider zespołu dla posta: jawnie przypisany albo lider działu autora.

    Etap lidera dotyczy tylko postów pracowników (EMPLOYEE); lider nie
    akceptuje własnych pomysłów ani pomysłów kadry. Kandydat musi mieć rolę
    TEAM_LEAD i dział autora (ochrona przed starymi lub ręcznie zmienionymi
    danymi); nieaktualny jawny lider ustępuje liderowi działu.
    """
    author = post.author
    if getattr(author, 'role', None) != 'EMPLOYEE' or not author.department_id:
        return None
    candidates = [post.assigned_team_lead, author.department.lead]
    for lead in candidates:
        if lead is None or lead.id in (author.id, post.assigned_manager_id):
            continue
        if department_lead_error(lead, author.department_id) is None:
            return lead
    return None


def init_approvals(post):
    """Tworzy początkowe etapy akceptacji: opcjonalny TEAM_LEAD i MANAGER.

    Etap DIRECTOR dodawany jest dynamicznie przy akceptacji kierownika,
    gdy koszt przekracza próg `COST_THRESHOLD_DIRECTOR`.
    """
    if post.approvals.exists():
        return list(post.approvals.all())

    created = []
    order = 1
    lead = resolve_team_lead(post)
    if lead is not None:
        if post.assigned_team_lead_id != lead.id:
            post.assigned_team_lead = lead
            post.save(update_fields=['assigned_team_lead'])
        created.append(PostApproval.objects.create(
            post=post,
            stage=PostApproval.Stage.TEAM_LEAD,
            order=order,
            approver=lead,
        ))
        order += 1
    if post.assigned_manager_id:
        created.append(PostApproval.objects.create(
            post=post,
            stage=PostApproval.Stage.MANAGER,
            order=order,
            approver=post.assigned_manager,
        ))
    return created


def with_current_stage(qs):
    """Adnotuje queryset postów polami `current_stage_name` i `current_approver_id`
    (pierwszy etap PENDING wg `order`)."""
    first_pending = (
        PostApproval.objects
        .filter(post=OuterRef('pk'), decision=PostApproval.Decision.PENDING)
        .order_by('order')
    )
    return qs.annotate(
        current_stage_name=Subquery(first_pending.values('stage')[:1]),
        current_approver_id=Subquery(first_pending.values('approver')[:1]),
    )


def approvals_queue(user, stage=None):
    """Posty TO_VERIFY, w których `user` jest approverem bieżącego etapu."""
    qs = with_current_stage(
        KaizenPost.objects.filter(status=KaizenPost.Status.TO_VERIFY)
    ).filter(current_approver_id=user.id)
    if stage:
        qs = qs.filter(current_stage_name=stage)
    return qs


PROGRESS_STATUSES = (
    KaizenPost.Status.SUBMITTED,
    KaizenPost.Status.IN_PROGRESS,
    KaizenPost.Status.IMPLEMENTED,
)


def can_update_progress(post, user):
    """Postęp wdrożenia aktualizuje przypisany kierownik, przypisany dyrektor lub admin."""
    if not user or not user.is_authenticated:
        return False
    if post.status not in PROGRESS_STATUSES:
        return False
    if user.is_staff or user.is_superuser:
        return True
    return user.id in (post.assigned_manager_id, post.assigned_director_id)


def current_pending_stage(post):
    """Pierwszy etap PENDING dla posta (po `order`) lub None."""
    return (
        post.approvals
        .filter(decision=PostApproval.Decision.PENDING)
        .order_by('order')
        .first()
    )


def lock_post(post_id):
    """Blokuje post (SELECT FOR UPDATE) do końca bieżącej transakcji.

    Wspólny punkt serializacji decyzji (approve/reject) i ponownego zgłoszenia:
    status i bieżący etap sprawdzać dopiero na zwróconym obiekcie. Na SQLite blokadę
    zapisu daje BEGIN IMMEDIATE (settings), select_for_update działa na PostgreSQL.
    """
    return KaizenPost.objects.select_for_update().get(pk=post_id)


def is_active_approver(post, user):
    """Czy podany user może zaakceptować/odrzucić aktualny etap."""
    stage = current_pending_stage(post)
    if not stage or not stage.approver_id:
        return False
    return stage.approver_id == user.id


@transaction.atomic
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
            # Caller powinien był zwalidować - fallback: cofnij decyzję
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

    # Brak eskalacji - post zatwierdzony
    post.status = KaizenPost.Status.SUBMITTED
    post.rejection_reason = None
    update_fields.extend(['status', 'rejection_reason'])
    post.save(update_fields=list(set(update_fields)))
    return stage, True


@transaction.atomic
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
