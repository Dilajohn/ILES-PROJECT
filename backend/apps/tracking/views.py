from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.internships.models import Placement
from apps.internships.services import create_audit_log
from apps.tracking.models import AttendanceRecord, Notification
from apps.tracking.serializers import AttendanceSerializer, ClockInSerializer, NotificationSerializer
from apps.users.models import User


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.select_related("student","placement","placement__company").all()
    serializer_class   = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields   = ["student","record_date","status","placement"]
    ordering_fields    = ["record_date","created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return AttendanceRecord.objects.none()
        qs   = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.STUDENT:
            return qs.filter(student=user)
        if user.role == User.Role.MENTOR:
            return qs.filter(placement__mentor=user)
        if user.role == User.Role.LECTURER:
            return qs.filter(placement__lecturer=user)
        return qs

    @action(detail=False, methods=["post"], url_path="clock-in")
    def clock_in(self, request):
        if request.user.role != User.Role.STUDENT:
            return Response({"detail": "Only students can clock in."},
                            status=status.HTTP_403_FORBIDDEN)
        serializer = ClockInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        today     = timezone.localdate()
        placement = Placement.objects.filter(student=request.user).select_related("company").first()
        record, created = AttendanceRecord.objects.get_or_create(
            student=request.user,
            record_date=today,
            defaults={
                "placement":   placement,
                "clock_in_at": timezone.localtime().time().replace(microsecond=0),
                "latitude":    serializer.validated_data.get("latitude"),
                "longitude":   serializer.validated_data.get("longitude"),
            },
        )
        if not created:
            return Response(
                {"detail": "Already clocked in today.", "record": AttendanceSerializer(record).data},
                status=status.HTTP_200_OK,
            )
        company_name = placement.company.name if placement else "unknown company"
        create_audit_log(request.user, "clock_in", f"Clocked in at {company_name}")
        return Response(AttendanceSerializer(record).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="clock-out")
    def clock_out(self, request):
        if request.user.role != User.Role.STUDENT:
            return Response({"detail": "Only students can clock out."},
                            status=status.HTTP_403_FORBIDDEN)
        today = timezone.localdate()
        try:
            record = AttendanceRecord.objects.get(student=request.user, record_date=today)
        except AttendanceRecord.DoesNotExist:
            return Response({"detail": "No clock-in record found for today."},
                            status=status.HTTP_400_BAD_REQUEST)
        record.clock_out_at = timezone.localtime().time().replace(microsecond=0)
        record.save(update_fields=["clock_out_at"])
        create_audit_log(request.user, "clock_out", f"Clocked out at {record.clock_out_at}")
        return Response(AttendanceSerializer(record).data)


class NotificationViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    queryset           = Notification.objects.select_related("user").all()
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields   = ["is_read","user"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        if self.request.user.role == User.Role.ADMIN:
            return super().get_queryset()
        return super().get_queryset().filter(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"unread_count": count})

    @action(detail=True, methods=["patch"], url_path="read")
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"updated": updated})
