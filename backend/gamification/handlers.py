"""
Odsprzęgnięte obserwowanie domeny `ideas`.

Kierunek zależności: gamification → ideas (dozwolony).
`ideas` nie wie nic o gamifikacji. Wszystkie naliczenia idą przez engine.award,
z `dedupe_key` zapewniającym idempotencję (retry sygnału nie podwaja punktów).
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from ideas.models import Comment, KaizenPost, Like, PostApproval
from .models import Action
from .services import engine


@receiver(pre_save, sender=KaizenPost)
def _stash_old_status(sender, instance, **kwargs):
    if not instance.pk:
        instance._old_status = None
        return
    old = sender.objects.filter(pk=instance.pk).values_list('status', flat=True).first()
    instance._old_status = old


@receiver(post_save, sender=KaizenPost)
def _on_post_saved(sender, instance, created, **kwargs):
    if created:
        engine.award(
            instance.author,
            Action.IDEA_CREATED,
            source=instance,
            dedupe_key=f'idea_created:{instance.pk}',
        )
        return

    old_status = getattr(instance, '_old_status', None)
    if old_status == instance.status:
        return

    if instance.status == KaizenPost.Status.SUBMITTED:
        engine.award(
            instance.author,
            Action.IDEA_APPROVED,
            source=instance,
            dedupe_key=f'idea_approved:{instance.pk}',
        )
    elif instance.status == KaizenPost.Status.IMPLEMENTED:
        engine.award(
            instance.author,
            Action.IDEA_IMPLEMENTED,
            source=instance,
            dedupe_key=f'idea_implemented:{instance.pk}',
        )


@receiver(post_save, sender=Like)
def _on_like_created(sender, instance, created, **kwargs):
    if not created:
        return
    author = instance.post.author
    if author and author.id != instance.user_id:
        engine.award(
            author,
            Action.LIKE_RECEIVED,
            source=instance.post,
            dedupe_key=f'like:{instance.post_id}:{instance.user_id}',
            metadata={'from_user': instance.user_id},
        )


@receiver(post_save, sender=Comment)
def _on_comment_created(sender, instance, created, **kwargs):
    if not created:
        return
    engine.award(
        instance.author,
        Action.COMMENT_MADE,
        source=instance,
        dedupe_key=f'comment:{instance.pk}',
    )


@receiver(pre_save, sender=PostApproval)
def _stash_old_decision(sender, instance, **kwargs):
    if not instance.pk:
        instance._old_decision = None
        return
    instance._old_decision = (
        sender.objects.filter(pk=instance.pk)
        .values_list('decision', flat=True)
        .first()
    )


@receiver(post_save, sender=PostApproval)
def _on_approval_decided(sender, instance, created, **kwargs):
    decided = {PostApproval.Decision.APPROVED, PostApproval.Decision.REJECTED}
    old = getattr(instance, '_old_decision', None)
    if instance.decision in decided and old not in decided and instance.approver_id:
        engine.award(
            instance.approver,
            Action.REVIEW_COMPLETED,
            source=instance,
            dedupe_key=f'review:{instance.pk}',
        )
