from rest_framework import mixins, viewsets

from apps.common.permissions import IsAdmin
from apps.reporting.models import AuditLog
from apps.reporting.serializers import AuditLogSerializer


class AuditLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset           = AuditLog.objects.select_related("actor").all()
    serializer_class   = AuditLogSerializer
    permission_classes = [IsAdmin]
    filterset_fields   = ["event_type","actor_role"]
    search_fields      = ["detail","actor__full_name","actor__email"]
    ordering_fields    = ["created_at","event_type","actor_role"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return AuditLog.objects.none()
        return super().get_queryset()
