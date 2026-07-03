import urllib.parse
from django.core.cache import cache

def get_user_cache_version(user_id):
    """Retrieve the current cache version for a specific user.
    Creates and stores version 1 if it does not exist.
    """
    version_key = f"user:{user_id}:version"
    try:
        version = cache.get(version_key)
    except Exception:
        version = None

    if version is None:
        version = 1
        try:
            cache.set(version_key, version, timeout=None)
        except Exception:
            pass
    return version

def get_superadmin_cache_version():
    """Retrieve the current cache version for superadmins.
    Creates and stores version 1 if it does not exist.
    """
    version_key = "superadmin:version"
    try:
        version = cache.get(version_key)
    except Exception:
        version = None

    if version is None:
        version = 1
        try:
            cache.set(version_key, version, timeout=None)
        except Exception:
            pass
    return version

def make_cache_key(prefix, request):
    """Construct cache key combining a prefix (injected with generational version) and query parameters."""
    version = 1
    prefix_with_ver = prefix

    if prefix.startswith("user:"):
        parts = prefix.split(":")
        if len(parts) >= 2:
            try:
                user_id = int(parts[1])
                version = get_user_cache_version(user_id)
                # Structure: user:user_id:vVersion:rest_of_prefix
                prefix_with_ver = f"{parts[0]}:{parts[1]}:v{version}"
                if len(parts) > 2:
                    prefix_with_ver += ":" + ":".join(parts[2:])
            except ValueError:
                pass
    elif prefix.startswith("superadmin:"):
        version = get_superadmin_cache_version()
        parts = prefix.split(":")
        # Structure: superadmin:vVersion:rest_of_prefix
        prefix_with_ver = f"{parts[0]}:v{version}"
        if len(parts) > 1:
            prefix_with_ver += ":" + ":".join(parts[1:])

    params = sorted(request.GET.items())
    query_str = urllib.parse.urlencode(params)
    return f"{prefix_with_ver}:{query_str}"

def clear_user_cache(user_id):
    """Clear all caches for a specific user by atomically incrementing their version (O(1) invalidation)."""
    version_key = f"user:{user_id}:version"
    try:
        cache.incr(version_key)
    except Exception:
        cache.set(version_key, 1, timeout=None)

def clear_superadmin_cache():
    """Clear all caches for superadmins by atomically incrementing their version (O(1) invalidation)."""
    version_key = "superadmin:version"
    try:
        cache.incr(version_key)
    except Exception:
        cache.set(version_key, 1, timeout=None)

def invalidate_task_cache(task, assignee_ids=None, leader_id=None):
    """Clear caches for all assignees, creator, and superadmins."""
    if task:
        if assignee_ids is None:
            try:
                assignee_ids = list(task.assignees.values_list('id', flat=True))
            except Exception:
                assignee_ids = []
        for assignee_id in assignee_ids:
            clear_user_cache(assignee_id)
            
        if task.assigned_by_id:
            clear_user_cache(task.assigned_by_id)
            if leader_id is None:
                try:
                    leader_id = task.assigned_by.created_by_id
                except Exception:
                    pass
            if leader_id:
                clear_user_cache(leader_id)
        clear_superadmin_cache()

def invalidate_timesheet_cache(timesheet, team_leader_id=None, task_assignee_ids=None, task_leader_id=None):
    """Clear caches for timesheet creator, creator's leader, related task, and superadmins."""
    if timesheet:
        if timesheet.team_member_id:
            clear_user_cache(timesheet.team_member_id)
            if team_leader_id:
                clear_user_cache(team_leader_id)
        if timesheet.task_id:
            invalidate_task_cache(timesheet.task, assignee_ids=task_assignee_ids, leader_id=task_leader_id)
        clear_superadmin_cache()
