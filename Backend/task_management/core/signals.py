from django.db.models.signals import post_save, post_delete, pre_delete, m2m_changed
from django.dispatch import receiver
from django.db import transaction
import threading

from .models import Task, Timesheet, TaskComment, Announcement
from .cache_utils import (
    invalidate_task_cache,
    invalidate_timesheet_cache,
    clear_user_cache,
    clear_superadmin_cache,
)
from django.core.cache import cache
from .elasticsearch_client import index_document, delete_document


def run_async(func, *args, **kwargs):
    """Run a function in a daemon thread for non-blocking I/O (e.g. Elasticsearch)."""
    thread = threading.Thread(target=func, args=args, kwargs=kwargs)
    thread.daemon = True
    thread.start()


def _sync_task_to_es(task):
    """Build ES document from committed task state and index asynchronously.
    Performs database queries fully inside the background thread to avoid blocking main thread.
    """
    task_id = task.id
    def run_sync():
        try:
            # Query inside the background thread with prefetch/select related to keep it optimized
            t = Task.objects.prefetch_related("assignees").select_related("assigned_by").get(id=task_id)
            doc = {
                "id": t.id,
                "type": "task",
                "task_name": t.task_name,
                "project_name": t.project_name,
                "description": t.description or "",
                "status": t.status,
                "priority": t.priority,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "assignees": [a.username for a in t.assignees.all()],
                "assigned_by": t.assigned_by.username if t.assigned_by else None,
            }
            index_document("tasks", t.id, doc)
        except Exception:
            pass

    run_async(run_sync)


# ─── Task Signals ───


@receiver(post_save, sender=Task)
def task_save_handler(sender, instance, **kwargs):
    """Invalidate caches and sync to ES after the transaction commits."""
    # Capture IDs to avoid querying in on_commit
    try:
        assignee_ids = list(instance.assignees.values_list("id", flat=True))
    except Exception:
        assignee_ids = []
    
    leader_id = None
    if instance.assigned_by_id:
        try:
            leader_id = instance.assigned_by.created_by_id
        except Exception:
            pass
            
    transaction.on_commit(lambda: invalidate_task_cache(instance, assignee_ids=assignee_ids, leader_id=leader_id))
    transaction.on_commit(lambda: _sync_task_to_es(instance))


@receiver(pre_delete, sender=Task)
def task_pre_delete_handler(sender, instance, **kwargs):
    """
    Capture relationship IDs before deletion (M2M through-table entries are
    cascade-deleted before post_delete fires, so we must read them here).
    Cache invalidation and ES cleanup are deferred until after commit.
    """
    # Capture IDs while M2M relations still exist in the database
    try:
        assignee_ids = list(instance.assignees.values_list("id", flat=True))
    except Exception:
        assignee_ids = []

    assigned_by_id = instance.assigned_by_id
    leader_id = None
    if assigned_by_id:
        try:
            leader_id = instance.assigned_by.created_by_id
        except Exception:
            pass
    task_id = instance.id

    def on_commit():
        for uid in assignee_ids:
            clear_user_cache(uid)
        if assigned_by_id:
            clear_user_cache(assigned_by_id)
        if leader_id:
            clear_user_cache(leader_id)
        clear_superadmin_cache()
        run_async(delete_document, "tasks", task_id)

    transaction.on_commit(on_commit)


@receiver(m2m_changed, sender=Task.assignees.through)
def task_assignees_changed_handler(sender, instance, action, **kwargs):
    """Invalidate caches and sync to ES when assignees are added/removed."""
    if action in ("post_add", "post_remove", "post_clear"):
        try:
            assignee_ids = list(instance.assignees.values_list("id", flat=True))
        except Exception:
            assignee_ids = []
        leader_id = None
        if instance.assigned_by_id:
            try:
                leader_id = instance.assigned_by.created_by_id
            except Exception:
                pass
        transaction.on_commit(lambda: invalidate_task_cache(instance, assignee_ids=assignee_ids, leader_id=leader_id))
        transaction.on_commit(lambda: _sync_task_to_es(instance))


# ─── Timesheet Signals ───


@receiver(post_save, sender=Timesheet)
@receiver(post_delete, sender=Timesheet)
def timesheet_change_handler(sender, instance, **kwargs):
    """Invalidate timesheet caches after the transaction commits."""
    team_leader_id = None
    if instance.team_member_id:
        try:
            team_leader_id = User.objects.filter(id=instance.team_member_id).values_list("created_by_id", flat=True).first()
        except Exception:
            pass
            
    task_assignee_ids = []
    task_leader_id = None
    if instance.task_id:
        try:
            task_assignee_ids = list(Task.assignees.through.objects.filter(task_id=instance.task_id).values_list("user_id", flat=True))
            assigned_by_id = Task.objects.filter(id=instance.task_id).values_list("assigned_by_id", flat=True).first()
            if assigned_by_id:
                task_leader_id = User.objects.filter(id=assigned_by_id).values_list("created_by_id", flat=True).first()
        except Exception:
            pass

    transaction.on_commit(lambda: invalidate_timesheet_cache(
        instance, 
        team_leader_id=team_leader_id, 
        task_assignee_ids=task_assignee_ids, 
        task_leader_id=task_leader_id
    ))


# ─── Comment Signals ───


@receiver(post_save, sender=TaskComment)
def comment_save_handler(sender, instance, **kwargs):
    """Index comment in Elasticsearch after commit and clear comments cache.
    Performs database queries fully inside the background thread to avoid blocking main thread.
    """
    if instance.task_id:
        transaction.on_commit(lambda: cache.delete(f"task:{instance.task_id}:comments"))

    comment_id = instance.id
    def run_sync():
        try:
            c = TaskComment.objects.select_related("task", "user").get(id=comment_id)
            doc = {
                "id": c.id,
                "type": "comment",
                "task_id": c.task.id if c.task else None,
                "task_name": c.task.task_name if c.task else "",
                "username": c.user.username if c.user else "",
                "content": c.content,
            }
            index_document("comments", c.id, doc)
        except Exception:
            pass

    transaction.on_commit(lambda: run_async(run_sync))


@receiver(post_delete, sender=TaskComment)
def comment_delete_handler(sender, instance, **kwargs):
    """Remove comment from Elasticsearch after commit and clear comments cache."""
    if instance.task_id:
        transaction.on_commit(lambda: cache.delete(f"task:{instance.task_id}:comments"))

    comment_id = instance.id
    transaction.on_commit(lambda: run_async(delete_document, "comments", comment_id))


# ─── Announcement Signals ───


@receiver(post_save, sender=Announcement)
def announcement_save_handler(sender, instance, **kwargs):
    """Index announcement in Elasticsearch after commit.
    Performs database queries fully inside the background thread to avoid blocking main thread.
    """
    announcement_id = instance.id
    def run_sync():
        try:
            a = Announcement.objects.select_related("sender").get(id=announcement_id)
            doc = {
                "id": a.id,
                "type": "announcement",
                "title": a.title,
                "message": a.message,
                "audience": a.audience,
                "sender": a.sender.username if a.sender else "",
            }
            index_document("announcements", a.id, doc)
        except Exception:
            pass

    transaction.on_commit(lambda: run_async(run_sync))


@receiver(post_delete, sender=Announcement)
def announcement_delete_handler(sender, instance, **kwargs):
    """Remove announcement from Elasticsearch after commit."""
    ann_id = instance.id
    transaction.on_commit(lambda: run_async(delete_document, "announcements", ann_id))
