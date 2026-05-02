from django.http import HttpResponse
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.permissions import IsAdmin, IsAdminOrLecturer, IsAdminOrMentor, IsLecturer, IsMentor
from apps.internships.models import ActivityLog, Company, Evaluation, InternshipPeriod, Placement
from apps.internships.serializers import (
    ActivitySerializer, ActivityStatusSerializer,
    CompanySerializer, EvaluationSerializer,
    InternshipPeriodSerializer, PlacementSerializer,
)
from apps.internships.services import create_audit_log, create_notification
from apps.users.models import User


class CompanyViewSet(viewsets.ModelViewSet):
    queryset           = Company.objects.all().order_by("name")
    serializer_class   = CompanySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields   = ["status","district","sector"]
    search_fields      = ["name","district","sector"]

    def get_permissions(self):
        if self.action in {"create","update","partial_update","destroy"}:
            return [IsAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        company = serializer.save()
        create_audit_log(self.request.user, "create", f"Added company: {company.name}")

    def perform_update(self, serializer):
        company = serializer.save()
        create_audit_log(self.request.user, "edit", f"Updated company: {company.name}")

    def perform_destroy(self, instance):
        create_audit_log(self.request.user, "delete", f"Removed company: {instance.name}")
        instance.delete()


class InternshipPeriodViewSet(viewsets.ModelViewSet):
    queryset           = InternshipPeriod.objects.all()
    serializer_class   = InternshipPeriodSerializer
    permission_classes = [IsAdmin]
    filterset_fields   = ["status"]
    search_fields      = ["name"]

    def perform_create(self, serializer):
        period = serializer.save()
        create_audit_log(self.request.user, "create", f"Created period: {period.name}")

    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin], url_path="toggle-status")
    def toggle_status(self, request, pk=None):
        period = self.get_object()
        period.status = (
            InternshipPeriod.Status.CLOSED
            if period.status == InternshipPeriod.Status.ACTIVE
            else InternshipPeriod.Status.ACTIVE
        )
        period.save(update_fields=["status"])
        create_audit_log(request.user, "edit", f"Period {period.name} set to {period.status}")
        return Response(InternshipPeriodSerializer(period).data)


class PlacementViewSet(viewsets.ModelViewSet):
    queryset = Placement.objects.select_related(
        "student","company","lecturer","mentor","period","created_by"
    ).all()
    serializer_class   = PlacementSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields   = ["company","period","lecturer","mentor","student"]
    search_fields      = ["student__full_name","student__student_profile__registration_number",
                          "company__name","lecturer__full_name","mentor__full_name"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Placement.objects.none()
        qs   = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.STUDENT:
            return qs.filter(student=user)
        if user.role == User.Role.MENTOR:
            return qs.filter(mentor=user)
        if user.role == User.Role.LECTURER:
            return qs.filter(lecturer=user)
        return qs

    def get_permissions(self):
        if self.action in {"create","destroy","update","partial_update"}:
            return [IsAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        placement = serializer.save(created_by=self.request.user)
        create_notification(
            placement.student,
            f"You have been placed at {placement.company.name} for {placement.period.name}.",
        )
        create_audit_log(
            self.request.user, "create",
            f"Created placement: {placement.student.full_name} → {placement.company.name}"
        )

    def perform_destroy(self, instance):
        create_audit_log(self.request.user, "delete",
                         f"Removed placement: {instance.student.full_name}")
        instance.delete()


class ActivityViewSet(viewsets.ModelViewSet):
    queryset = ActivityLog.objects.select_related(
        "student","mentor","placement","placement__lecturer"
    ).all()
    serializer_class   = ActivitySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields   = ["status","student","mentor","placement","activity_date"]
    search_fields      = ["title","description","skills","student__full_name"]
    ordering_fields    = ["activity_date","created_at","status"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ActivityLog.objects.none()
        qs   = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.STUDENT:
            return qs.filter(student=user)
        if user.role == User.Role.MENTOR:
            return qs.filter(placement__mentor=user)
        if user.role == User.Role.LECTURER:
            return qs.filter(placement__lecturer=user)
        return qs

    def get_permissions(self):
        if self.action in {"validate_activity", "reject_activity"}:
            return [IsAdminOrMentor()]
        if self.action in {"approve_activity", "return_activity"}:
            return [IsAdminOrLecturer()]
        if self.action == "destroy":
            return [IsAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        student   = self.request.user
        placement = (
            Placement.objects.filter(student=student)
            .select_related("mentor","lecturer","period","company")
            .order_by("-created_at")
            .first()
        )
        mentor = getattr(placement, "mentor", None)
        activity = serializer.save(
            student=student,
            placement=placement,
            mentor=mentor,
            status=ActivityLog.Status.PENDING,
        )
        create_audit_log(self.request.user, "create", f"Submitted activity: {activity.title}")

    @action(detail=True, methods=["post"], url_path="validate")
    def validate_activity(self, request, pk=None):
        activity = self.get_object()
        if activity.status not in (ActivityLog.Status.PENDING, ActivityLog.Status.REJECTED):
            return Response({"detail": "Activity is not in a validatable state."},
                            status=status.HTTP_400_BAD_REQUEST)
        ser = ActivityStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        activity.status     = ActivityLog.Status.MENTOR_APPROVED
        activity.mentor_note= ser.validated_data.get("note", "")
        activity.mentor     = request.user
        activity.save(update_fields=["status","mentor_note","mentor","updated_at"])
        create_notification(activity.student,
                            f'Your activity "{activity.title}" was approved by your mentor.')
        create_audit_log(request.user, "validate", f"Mentor approved: {activity.title}")
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject_activity(self, request, pk=None):
        activity = self.get_object()
        ser = ActivityStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        note = ser.validated_data.get("note", "")
        if not note:
            return Response({"detail": "A feedback note is required when rejecting."},
                            status=status.HTTP_400_BAD_REQUEST)
        activity.status      = ActivityLog.Status.REJECTED
        activity.mentor_note = note
        activity.save(update_fields=["status","mentor_note","updated_at"])
        create_notification(activity.student,
                            f'Your activity "{activity.title}" was returned for revision. Note: {note}')
        create_audit_log(request.user, "reject", f"Mentor rejected: {activity.title}")
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve_activity(self, request, pk=None):
        activity = self.get_object()
        if activity.status != ActivityLog.Status.MENTOR_APPROVED:
            return Response({"detail": "Activity must be mentor-approved first."},
                            status=status.HTTP_400_BAD_REQUEST)
        ser = ActivityStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        activity.status       = ActivityLog.Status.VALIDATED
        activity.lecturer_note= ser.validated_data.get("note", "")
        activity.save(update_fields=["status","lecturer_note","updated_at"])
        create_notification(activity.student,
                            f'Your activity "{activity.title}" was fully validated.')
        create_audit_log(request.user, "validate", f"Lecturer validated: {activity.title}")
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=["post"], url_path="return")
    def return_activity(self, request, pk=None):
        activity = self.get_object()
        ser = ActivityStatusSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        activity.status       = ActivityLog.Status.REJECTED
        activity.lecturer_note= ser.validated_data.get("note", "")
        activity.save(update_fields=["status","lecturer_note","updated_at"])
        create_notification(activity.student,
                            f'Your activity "{activity.title}" was returned by your lecturer.')
        create_audit_log(request.user, "reject", f"Lecturer returned: {activity.title}")
        return Response(ActivitySerializer(activity).data)


class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.select_related("student","lecturer","period").all()
    serializer_class   = EvaluationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields   = ["student","lecturer","period"]
    ordering_fields    = ["updated_at","created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Evaluation.objects.none()
        qs   = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.STUDENT:
            return qs.filter(student=user)
        if user.role == User.Role.LECTURER:
            return qs.filter(lecturer=user)
        return qs

    def get_permissions(self):
        if self.action in {"create","update","partial_update","destroy"}:
            return [IsAdminOrLecturer()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        evaluation = serializer.save(lecturer=self.request.user)
        weighted   = EvaluationSerializer(evaluation).data["weighted_total"]
        create_notification(
            evaluation.student,
            f"Your evaluation scores were updated. Weighted total: {weighted}%",
        )
        create_audit_log(self.request.user, "grade",
                         f"Saved evaluation for {evaluation.student.full_name}: {weighted}%")

    def perform_update(self, serializer):
        evaluation = serializer.save(lecturer=self.request.user)
        create_audit_log(self.request.user, "edit",
                         f"Updated evaluation for {evaluation.student.full_name}")


class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        return Response({
            "available_reports": ["cohort","attendance","validation","placements","audit","activity"]
        })

    def retrieve(self, request, pk=None):
        payload  = self._build_payload(pk, request)
        response = HttpResponse(payload, content_type="text/plain; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="iles_{pk}_report.txt"'
        create_audit_log(request.user, "report", f"Generated report: {pk}")
        return response

    def _build_payload(self, report_type, request):
        header = (
            f"ILES — Internship Logging & Evaluation System\n"
            f"Report: {report_type.upper()}\n"
            f"Generated by: {request.user.full_name}\n"
            f"{'=' * 60}\n\n"
        )
        if report_type == "placements":
            rows = Placement.objects.select_related("student","company","lecturer","mentor","period")
            body = "\n".join(
                f"{r.student.full_name} → {r.company.name} | "
                f"Lecturer: {r.lecturer.full_name} | Mentor: {r.mentor.full_name} | "
                f"Period: {r.period.name}"
                for r in rows
            ) or "No placements found."
            return header + body

        if report_type == "attendance":
            from apps.tracking.models import AttendanceRecord
            rows = AttendanceRecord.objects.select_related("student","placement__company").all()
            body = "\n".join(
                f"{r.student.full_name} | {r.record_date} | "
                f"In: {r.clock_in_at or '--'} | Out: {r.clock_out_at or '--'} | {r.status}"
                for r in rows
            ) or "No attendance records."
            return header + body

        if report_type == "validation":
            rows = ActivityLog.objects.select_related("student").all()
            body = "\n".join(
                f"{r.activity_date} | {r.student.full_name} | {r.title} | {r.status}"
                for r in rows
            ) or "No activity records."
            return header + body

        if report_type == "cohort":
            from apps.internships.models import Evaluation as Ev
            rows = Placement.objects.select_related("student","company","period")
            lines = []
            for r in rows:
                ev = Ev.objects.filter(student=r.student, period=r.period).first()
                score = f"{EvaluationSerializer(ev).data['weighted_total']}%" if ev else "Not graded"
                lines.append(f"{r.student.full_name:<30} {r.company.name:<25} Score: {score}")
            return header + ("\n".join(lines) or "No data.")

        return header + "Report type not recognised. Available: cohort, attendance, validation, placements."
