import urllib.parse
from django.core.cache import cache


def make_cache_key(prefix, request):
    """Construct cache key combining a prefix and sorted query parameters."""
    params = sorted(request.GET.items())
    query_str = urllib.parse.urlencode(params)
    return f"{prefix}:{query_str}"


def clear_user_cache(user_id):
    """Clear all caches for a specific user (dashboard stats, task lists, timesheets)."""
    try:
        cache.delete_pattern(f"user:{user_id}:*")
    except AttributeError:
        # Fallback for standard LocMemCache/DatabaseCache during local tests
        cache.clear()


def clear_superadmin_cache():
    """Clear all caches for superadmins."""
    try:
        cache.delete_pattern("superadmin:*")
    except AttributeError:
        cache.clear()


def invalidate_task_cache(task):
    """Clear caches for all assignees, creator, and superadmins."""
    if task:
        try:
            # Clean assignee caches
            for assignee in task.assignees.all():
                clear_user_cache(assignee.id)
        except Exception:
            pass

        if task.assigned_by:
            clear_user_cache(task.assigned_by.id)
            if task.assigned_by.created_by:
                clear_user_cache(task.assigned_by.created_by.id)
        clear_superadmin_cache()


def invalidate_timesheet_cache(timesheet):
    """Clear caches for timesheet creator, creator's leader, related task, and superadmins."""
    if timesheet:
        if timesheet.team_member:
            clear_user_cache(timesheet.team_member.id)
            if timesheet.team_member.created_by:
                clear_user_cache(timesheet.team_member.created_by.id)
        if timesheet.task:
            invalidate_task_cache(timesheet.task)
        clear_superadmin_cache()
