from apps.reporting.models import AuditLog


def log_user_event(actor, action, detail):
    AuditLog.objects.create(
        actor=actor,
        actor_role=getattr(actor, "role", "system"),
        event_type=action,
        detail=detail,
    )
