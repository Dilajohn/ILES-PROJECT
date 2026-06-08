from django.http import HttpResponse
from rest_framework.exceptions import PermissionDenied
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.permissions import IsAdmin, IsAdminOrLecturer, IsAdminOrMentor
from apps.internships.models import ActivityLog, Company, Evaluation, InternshipPeriod, Placement
from apps.internships.serializers import (
    ActivitySerializer,
    ActivityStatusSerializer,
    CompanySerializer,
    EvaluationSerializer,
    InternshipPeriodSerializer,
    PlacementSerializer,
)
from apps.internships.services import create_audit_log, create_notification
from apps.reporting.models import AuditLog
from apps.tracking.models import AttendanceRecord
from apps.users.models import User


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all().order_by("name")
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "district", "sector"]
    search_fields = ["name", "district", "sector"]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
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
    queryset = InternshipPeriod.objects.all()
    serializer_class = InternshipPeriodSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ["status"]
    search_fields = ["name"]

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
        "student", "company", "lecturer", "mentor", "period", "created_by"
    ).all()
    serializer_class = PlacementSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["company", "period", "lecturer", "mentor", "student"]
    search_fields = [
        "student__full_name",
        "student__student_profile__registration_number",
        "company__name",
        "lecturer__full_name",
        "mentor__full_name",
    ]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Placement.objects.none()
        qs = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.STUDENT:
            return qs.filter(student=user)
        if user.role == User.Role.MENTOR:
            return qs.filter(mentor=user)
        if user.role == User.Role.LECTURER:
            return qs.filter(lecturer=user)
        return qs

    def get_permissions(self):
        if self.action in {"create", "destroy", "update", "partial_update"}:
            return [IsAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        placement = serializer.save(created_by=self.request.user)
        create_notification(
            placement.student,
            f"You have been placed at {placement.company.name} for {placement.period.name}.",
        )
        create_audit_log(
            self.request.user,
            "create",
            f"Created placement: {placement.student.full_name} -> {placement.company.name}",
        )

    def perform_destroy(self, instance):
        create_audit_log(self.request.user, "delete", f"Removed placement: {instance.student.full_name}")
        instance.delete()


class ActivityViewSet(viewsets.ModelViewSet):
    queryset = ActivityLog.objects.select_related(
        "student", "mentor", "placement", "placement__lecturer"
    ).all()
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "student", "mentor", "placement", "activity_date"]
    search_fields = ["title", "description", "skills", "student__full_name"]
    ordering_fields = ["activity_date", "created_at", "status"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ActivityLog.objects.none()
        qs = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.STUDENT:
            return qs.filter(student=user)
        if user.role == User.Role.MENTOR:
            from django.db.models import Q
            # Activities where this user is the assigned mentor directly,
            # OR where the student's placement is under this mentor
            return qs.filter(Q(mentor=user) | Q(placement__mentor=user)).distinct()
        if user.role == User.Role.LECTURER:
            from django.db.models import Q
            # Activities where the student's placement is under this lecturer,
            # OR where no placement is set but the student has a placement linked to this lecturer
            return qs.filter(
                Q(placement__lecturer=user)
                | Q(placement__isnull=True, student__placements__lecturer=user)
            ).distinct()
        return qs

    def get_permissions(self):
        if self.action in {"validate_activity", "reject_activity"}:
            return [IsAdminOrMentor()]
        if self.action in {"approve_activity", "return_activity"}:
            return [IsAdminOrLecturer()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        if self.request.user.role == User.Role.STUDENT:
            student = self.request.user
        else:
            student = serializer.validated_data.get("student")
            if student is None:
                raise ValueError("A student must be provided when staff create an activity.")

        placement = (
            Placement.objects.filter(student=student)
            .select_related("mentor", "lecturer", "period", "company")
            .order_by("-created_at")
            .first()
        )
        mentor = serializer.validated_data.get("mentor") or getattr(placement, "mentor", None)
        activity = serializer.save(
            student=student,
            placement=placement,
            mentor=mentor,
            status=ActivityLog.Status.PENDING,
        )
        create_audit_log(self.request.user, "create", f"Submitted activity: {activity.title}")

        # Notify the assigned mentor so the activity appears in their dashboard
        if mentor:
            create_notification(
                mentor,
                f'Student {student.full_name} submitted a new activity: "{activity.title}". Please review.',
            )
        # Notify the linked lecturer as well
        lecturer = getattr(placement, "lecturer", None)
        if lecturer:
            create_notification(
                lecturer,
                f'Student {student.full_name} submitted a new activity: "{activity.title}".',
            )

    def perform_update(self, serializer):
        activity = self.get_object()
        user = self.request.user
        if user.role == User.Role.STUDENT:
            if activity.status not in {
                ActivityLog.Status.PENDING,
                ActivityLog.Status.REJECTED,
            }:
                raise PermissionDenied("Only pending or rejected activities can be edited.")
            serializer.save(status=ActivityLog.Status.PENDING)
        else:
            serializer.save()
        create_audit_log(user, "edit", f"Updated activity: {activity.title}")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.Role.ADMIN:
            create_audit_log(user, "delete", f"Deleted activity: {instance.title}")
            instance.delete()
            return
        if user.role == User.Role.STUDENT and instance.student_id == user.id and instance.status == ActivityLog.Status.REJECTED:
            create_audit_log(user, "delete", f"Deleted rejected activity: {instance.title}")
            instance.delete()
            return
        raise PermissionDenied("You do not have permission to delete this activity.")

    @action(detail=True, methods=["post"], url_path="validate")
    def validate_activity(self, request, pk=None):
        activity = self.get_object()
        if activity.status not in (ActivityLog.Status.PENDING, ActivityLog.Status.REJECTED):
            return Response(
                {"detail": "Activity is not in a validatable state."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ActivityStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        activity.status = ActivityLog.Status.MENTOR_APPROVED
        activity.mentor_note = serializer.validated_data.get("note", "")
        activity.mentor = request.user
        activity.save(update_fields=["status", "mentor_note", "mentor", "updated_at"])
        create_notification(activity.student, f'Your activity "{activity.title}" was approved by your mentor.')
        create_audit_log(request.user, "validate", f"Mentor approved: {activity.title}")
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject_activity(self, request, pk=None):
        activity = self.get_object()
        serializer = ActivityStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.validated_data.get("note", "")
        if not note:
            return Response(
                {"detail": "A feedback note is required when rejecting."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        activity.status = ActivityLog.Status.REJECTED
        activity.mentor_note = note
        activity.save(update_fields=["status", "mentor_note", "updated_at"])
        create_notification(
            activity.student,
            f'Your activity "{activity.title}" was returned for revision. Note: {note}',
        )
        create_audit_log(request.user, "reject", f"Mentor rejected: {activity.title}")
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve_activity(self, request, pk=None):
        activity = self.get_object()
        if activity.status != ActivityLog.Status.MENTOR_APPROVED:
            return Response(
                {"detail": "Activity must be mentor-approved first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ActivityStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        activity.status = ActivityLog.Status.VALIDATED
        activity.lecturer_note = serializer.validated_data.get("note", "")
        activity.save(update_fields=["status", "lecturer_note", "updated_at"])
        create_notification(activity.student, f'Your activity "{activity.title}" was fully validated.')
        create_audit_log(request.user, "validate", f"Lecturer validated: {activity.title}")
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=["post"], url_path="return")
    def return_activity(self, request, pk=None):
        activity = self.get_object()
        serializer = ActivityStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        activity.status = ActivityLog.Status.REJECTED
        activity.lecturer_note = serializer.validated_data.get("note", "")
        activity.save(update_fields=["status", "lecturer_note", "updated_at"])
        create_notification(activity.student, f'Your activity "{activity.title}" was returned by your lecturer.')
        create_audit_log(request.user, "reject", f"Lecturer returned: {activity.title}")
        return Response(ActivitySerializer(activity).data)


class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.select_related("student", "lecturer", "period").order_by("-updated_at", "-created_at")
    serializer_class = EvaluationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["student", "lecturer", "period"]
    ordering_fields = ["updated_at", "created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Evaluation.objects.none()
        qs = super().get_queryset()
        user = self.request.user
        if user.role == User.Role.STUDENT:
            return qs.filter(student=user)
        if user.role == User.Role.LECTURER:
            return qs.filter(lecturer=user)
        return qs

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAdminOrLecturer()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        evaluation = serializer.save(lecturer=self.request.user)
        weighted = EvaluationSerializer(evaluation).data["weighted_total"]
        create_notification(
            evaluation.student,
            f"Your evaluation scores were updated. Weighted total: {weighted}%",
        )
        create_audit_log(
            self.request.user,
            "grade",
            f"Saved evaluation for {evaluation.student.full_name}: {weighted}%",
        )

    def perform_update(self, serializer):
        evaluation = serializer.save(lecturer=self.request.user)
        create_audit_log(self.request.user, "edit", f"Updated evaluation for {evaluation.student.full_name}")


class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        return Response(
            {
                "available_reports": [
                    "cohort",
                    "attendance",
                    "validation",
                    "placements",
                    "audit",
                    "activity",
                    "evaluation",
                ]
            }
        )

    def retrieve(self, request, pk=None):
        payload = self._build_payload(pk, request)
        response = HttpResponse(payload, content_type="text/plain; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="iles_{pk}_report.txt"'
        create_audit_log(request.user, "report", f"Generated report: {pk}")
        return response

    def _build_payload(self, report_type, request):
        user = request.user
        placement_rows = Placement.objects.select_related("student", "company", "lecturer", "mentor", "period")
        attendance_rows = AttendanceRecord.objects.select_related("student", "placement__company")
        activity_rows = ActivityLog.objects.select_related("student", "mentor", "placement", "placement__lecturer")
        evaluation_rows = Evaluation.objects.select_related("student", "lecturer", "period")
        audit_rows = AuditLog.objects.select_related("actor")

        if user.role == User.Role.STUDENT:
            placement_rows = placement_rows.filter(student=user)
            attendance_rows = attendance_rows.filter(student=user)
            activity_rows = activity_rows.filter(student=user)
            evaluation_rows = evaluation_rows.filter(student=user)
            audit_rows = audit_rows.filter(actor=user)
        elif user.role == User.Role.MENTOR:
            placement_rows = placement_rows.filter(mentor=user)
            attendance_rows = attendance_rows.filter(placement__mentor=user)
            activity_rows = activity_rows.filter(placement__mentor=user)
            evaluation_rows = evaluation_rows.filter(student__placements__mentor=user).distinct()
            audit_rows = audit_rows.filter(actor=user)
        elif user.role == User.Role.LECTURER:
            placement_rows = placement_rows.filter(lecturer=user)
            attendance_rows = attendance_rows.filter(placement__lecturer=user)
            activity_rows = activity_rows.filter(placement__lecturer=user)
            evaluation_rows = evaluation_rows.filter(lecturer=user)
            audit_rows = audit_rows.filter(actor=user)

        header = (
            f"ILES - Internship Logging & Evaluation System\n"
            f"Report: {report_type.upper()}\n"
            f"Generated by: {user.full_name}\n"
            f"{'=' * 60}\n\n"
        )

        if report_type == "placements":
            body = "\n".join(
                f"{r.student.full_name} -> {r.company.name} | "
                f"Lecturer: {r.lecturer.full_name} | Mentor: {r.mentor.full_name} | "
                f"Period: {r.period.name}"
                for r in placement_rows
            ) or "No placements found."
            return header + body

        if report_type == "attendance":
            body = "\n".join(
                f"{r.student.full_name} | {r.record_date} | "
                f"In: {r.clock_in_at or '--'} | Out: {r.clock_out_at or '--'} | {r.status}"
                for r in attendance_rows
            ) or "No attendance records."
            return header + body

        if report_type in {"validation", "activity"}:
            body = "\n".join(
                f"{r.activity_date} | {r.student.full_name} | {r.title} | {r.hours_spent}h | {r.status}"
                for r in activity_rows
            ) or "No activity records."
            return header + body

        if report_type == "cohort":
            lines = []
            for row in placement_rows:
                evaluation = evaluation_rows.filter(student=row.student, period=row.period).first()
                score = f"{EvaluationSerializer(evaluation).data['weighted_total']}%" if evaluation else "Not graded"
                lines.append(f"{row.student.full_name:<30} {row.company.name:<25} Score: {score}")
            return header + ("\n".join(lines) or "No data.")

        if report_type == "evaluation":
            body = "\n".join(
                (
                    f"{row.student.full_name} | {row.period.name} | "
                    f"Skills: {row.skills}% | Professionalism: {row.professionalism}% | "
                    f"Development: {row.development}% | Deliverables: {row.deliverables}% | "
                    f"Weighted Total: {EvaluationSerializer(row).data['weighted_total']}% | "
                    f"Grade: {EvaluationSerializer(row).data['grade_letter']}"
                )
                for row in evaluation_rows
            ) or "No evaluation records."
            return header + body

        if report_type == "audit":
            body = "\n".join(
                f"{row.created_at:%Y-%m-%d %H:%M} | {row.actor_role} | {row.event_type} | {row.detail}"
                for row in audit_rows
            ) or "No audit log entries."
            return header + body

        return header + "Report type not recognised. Available: cohort, attendance, validation, placements, activity, evaluation, audit."
