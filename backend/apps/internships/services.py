from apps.reporting.models import AuditLog
from apps.tracking.models import Notification


def create_notification(user, message):
    Notification.objects.create(user=user, message=message)


def create_audit_log(actor, event_type, detail):
    AuditLog.objects.create(
        actor=actor,
        actor_role=getattr(actor, "role", "system"),
        event_type=event_type,
        detail=detail,
    )
