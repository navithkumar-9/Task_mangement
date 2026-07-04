from django.core.management.base import BaseCommand, CommandError

from core.elasticsearch_client import index_document, is_es_available
from core.models import Announcement, Task, TaskComment


class Command(BaseCommand):
    help = "Rebuild Elasticsearch indexes for global search."

    def handle(self, *args, **options):
        if not is_es_available():
            raise CommandError(
                "Elasticsearch is disabled or unavailable. Set "
                "ELASTICSEARCH_ENABLED=True and verify ELASTICSEARCH_HOST."
            )

        task_count = 0
        for task in (
            Task.objects.select_related("assigned_by")
            .prefetch_related("assignees")
            .iterator(chunk_size=200)
        ):
            index_document(
                "tasks",
                task.id,
                {
                    "id": task.id,
                    "type": "task",
                    "task_name": task.task_name,
                    "project_name": task.project_name,
                    "description": task.description or "",
                    "status": task.status,
                    "priority": task.priority,
                    "due_date": task.due_date.isoformat() if task.due_date else None,
                    "assignees": [user.username for user in task.assignees.all()],
                    "assigned_by": task.assigned_by.username if task.assigned_by else "",
                },
            )
            task_count += 1

        comment_count = 0
        for comment in TaskComment.objects.select_related("task", "user").iterator(
            chunk_size=200
        ):
            index_document(
                "comments",
                comment.id,
                {
                    "id": comment.id,
                    "type": "comment",
                    "task_id": comment.task_id,
                    "task_name": comment.task.task_name if comment.task else "",
                    "username": comment.user.username if comment.user else "",
                    "content": comment.content or "",
                },
            )
            comment_count += 1

        announcement_count = 0
        for announcement in Announcement.objects.select_related("sender").iterator(
            chunk_size=200
        ):
            index_document(
                "announcements",
                announcement.id,
                {
                    "id": announcement.id,
                    "type": "announcement",
                    "title": announcement.title,
                    "message": announcement.message or "",
                    "audience": announcement.audience,
                    "sender": announcement.sender.username if announcement.sender else "",
                },
            )
            announcement_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Indexed "
                f"{task_count} tasks, "
                f"{comment_count} comments, "
                f"{announcement_count} announcements."
            )
        )
