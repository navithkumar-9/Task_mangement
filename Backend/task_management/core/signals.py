from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
import threading
from .models import Task, Timesheet, TaskComment, Announcement
from .cache_utils import invalidate_task_cache, invalidate_timesheet_cache
from .elasticsearch_client import index_document, delete_document

def run_async(func, *args, **kwargs):
    thread = threading.Thread(target=func, args=args, kwargs=kwargs)
    thread.daemon = True
    thread.start()

def sync_task_to_es(task):
    try:
        doc = {
            "id": task.id,
            "type": "task",
            "task_name": task.task_name,
            "project_name": task.project_name,
            "description": task.description or "",
            "status": task.status,
            "priority": task.priority,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "assignees": [a.username for a in task.assignees.all()],
            "assigned_by": task.assigned_by.username if task.assigned_by else None,
        }
        run_async(index_document, "tasks", task.id, doc)
    except Exception:
        pass

@receiver(post_save, sender=Task)
def task_save_handler(sender, instance, **kwargs):
    run_async(invalidate_task_cache, instance)
    sync_task_to_es(instance)

@receiver(post_delete, sender=Task)
def task_delete_handler(sender, instance, **kwargs):
    run_async(invalidate_task_cache, instance)
    run_async(delete_document, "tasks", instance.id)

@receiver(m2m_changed, sender=Task.assignees.through)
def task_assignees_changed_handler(sender, instance, action, **kwargs):
    if action in ["post_add", "post_remove", "post_clear"]:
        run_async(invalidate_task_cache, instance)
        sync_task_to_es(instance)

@receiver(post_save, sender=Timesheet)
@receiver(post_delete, sender=Timesheet)
def timesheet_change_handler(sender, instance, **kwargs):
    run_async(invalidate_timesheet_cache, instance)

@receiver(post_save, sender=TaskComment)
def comment_save_handler(sender, instance, **kwargs):
    try:
        doc = {
            "id": instance.id,
            "type": "comment",
            "task_id": instance.task.id if instance.task else None,
            "task_name": instance.task.task_name if instance.task else "",
            "username": instance.user.username if instance.user else "",
            "content": instance.content,
        }
        run_async(index_document, "comments", instance.id, doc)
    except Exception:
        pass

@receiver(post_delete, sender=TaskComment)
def comment_delete_handler(sender, instance, **kwargs):
    run_async(delete_document, "comments", instance.id)

@receiver(post_save, sender=Announcement)
def announcement_save_handler(sender, instance, **kwargs):
    try:
        doc = {
            "id": instance.id,
            "type": "announcement",
            "title": instance.title,
            "message": instance.message,
            "audience": instance.audience,
            "sender": instance.sender.username if instance.sender else "",
        }
        run_async(index_document, "announcements", instance.id, doc)
    except Exception:
        pass

@receiver(post_delete, sender=Announcement)
def announcement_delete_handler(sender, instance, **kwargs):
    run_async(delete_document, "announcements", instance.id)
