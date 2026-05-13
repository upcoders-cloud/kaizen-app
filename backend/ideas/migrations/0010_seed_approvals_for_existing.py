"""
Data migration: dla istniejących postów które już przeszły akceptację
(status != TO_VERIFY i != CANCELLED bez rejection_reason) tworzy jednorazowy
rekord PostApproval(stage=MANAGER, decision=APPROVED), żeby nowa logika
oparta na timeline'ie aprobat była spójna ze starymi danymi.
"""
from django.db import migrations
from django.utils import timezone


def seed_approvals(apps, schema_editor):
    KaizenPost = apps.get_model('ideas', 'KaizenPost')
    PostApproval = apps.get_model('ideas', 'PostApproval')

    legacy_statuses = ['SUBMITTED', 'IN_PROGRESS', 'IMPLEMENTED']
    now = timezone.now()

    for post in KaizenPost.objects.filter(status__in=legacy_statuses):
        if PostApproval.objects.filter(post=post).exists():
            continue
        PostApproval.objects.create(
            post=post,
            stage='MANAGER',
            order=1,
            approver=post.assigned_manager,
            decision='APPROVED',
            decided_at=now,
        )


def reverse_seed(apps, schema_editor):
    # Brak operacji odwrotnej — usunięcie wszystkich aprobat byłoby destrukcyjne.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('ideas', '0009_kaizenpost_assigned_director_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_approvals, reverse_seed),
    ]
