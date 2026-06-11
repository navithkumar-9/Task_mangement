from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from .models import Task, Timesheet
from .cache_utils import invalidate_task_cache, invalidate_timesheet_cache

@receiver(post_save, sender=Task)
@receiver(post_delete, sender=Task)
def task_change_handler(sender, instance, **kwargs):
    invalidate_task_cache(instance)

@receiver(m2m_changed, sender=Task.assignees.through)
def task_assignees_changed_handler(sender, instance, action, **kwargs):
    if action in ["post_add", "post_remove", "post_clear"]:
        invalidate_task_cache(instance)

@receiver(post_save, sender=Timesheet)
@receiver(post_delete, sender=Timesheet)
def timesheet_change_handler(sender, instance, **kwargs):
    invalidate_timesheet_cache(instance)
