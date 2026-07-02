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
        # Fallback if increment fails (e.g. key does not exist or backend is LocMemCache)
        try:
            val = cache.get(version_key)
            if val is None:
                cache.set(version_key, 1, timeout=None)
            else:
                cache.set(version_key, int(val) + 1, timeout=None)
        except Exception:
            cache.set(version_key, 1, timeout=None)

def clear_superadmin_cache():
    """Clear all caches for superadmins by atomically incrementing their version (O(1) invalidation)."""
    version_key = "superadmin:version"
    try:
        cache.incr(version_key)
    except Exception:
        try:
            val = cache.get(version_key)
            if val is None:
                cache.set(version_key, 1, timeout=None)
            else:
                cache.set(version_key, int(val) + 1, timeout=None)
        except Exception:
            cache.set(version_key, 1, timeout=None)

def invalidate_task_cache(task):
    """Clear caches for all assignees, creator, and superadmins."""
    if task:
        try:
            for assignee_id in task.assignees.values_list('id', flat=True):
                clear_user_cache(assignee_id)
        except Exception:
            pass
        if task.assigned_by_id:
            clear_user_cache(task.assigned_by_id)
            try:
                leader_id = task.assigned_by.created_by_id
                if leader_id:
                    clear_user_cache(leader_id)
            except Exception:
                pass
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
