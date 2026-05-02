from rest_framework import serializers

from apps.reporting.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor",
            "actor_name",
            "actor_role",
            "event_type",
            "detail",
            "created_at",
        ]
