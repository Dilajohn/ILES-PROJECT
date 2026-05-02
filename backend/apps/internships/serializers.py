from rest_framework import serializers

from apps.internships.models import ActivityLog, Company, Evaluation, InternshipPeriod, Placement
from apps.users.models import StudentProfile, User


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Company
        fields = "__all__"


class InternshipPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model  = InternshipPeriod
        fields = "__all__"


class PlacementSerializer(serializers.ModelSerializer):
    student_name  = serializers.CharField(source="student.full_name",  read_only=True)
    company_name  = serializers.CharField(source="company.name",        read_only=True)
    lecturer_name = serializers.CharField(source="lecturer.full_name",  read_only=True)
    mentor_name   = serializers.CharField(source="mentor.full_name",    read_only=True)
    period_name   = serializers.CharField(source="period.name",         read_only=True)

    class Meta:
        model  = Placement
        fields = [
            "id","student","student_name","company","company_name",
            "lecturer","lecturer_name","mentor","mentor_name",
            "period","period_name","created_by","created_at",
        ]
        read_only_fields = ["created_by","created_at"]

    def validate(self, attrs):
        qs = Placement.objects.filter(student=attrs["student"], period=attrs["period"])
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "This student already has a placement for this period."
            )
        return attrs


class ActivitySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = ActivityLog
        fields = [
            "id","placement","student","student_name","mentor",
            "title","description","skills","hours_spent",
            "activity_date","status","status_label",
            "mentor_note","lecturer_note","created_at","updated_at",
        ]
        read_only_fields = ["created_at","updated_at","status","mentor_note","lecturer_note"]
        extra_kwargs = {
            "placement": {"required": False},
            "student":   {"required": False},
            "mentor":    {"required": False},
        }

    def validate_hours_spent(self, value):
        if value < 0 or value > 12:
            raise serializers.ValidationError("Hours spent must be between 0 and 12.")
        return value


class ActivityStatusSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default="")


class EvaluationSerializer(serializers.ModelSerializer):
    weighted_total = serializers.SerializerMethodField()
    grade_letter   = serializers.SerializerMethodField()

    class Meta:
        model  = Evaluation
        fields = [
            "id","student","lecturer","period",
            "skills","professionalism","development","deliverables",
            "weighted_total","grade_letter","created_at","updated_at",
        ]
        read_only_fields = ["lecturer","created_at","updated_at"]
        # Suppress unique_together validator — perform_create uses update_or_create
        validators = []

    def get_weighted_total(self, obj):
        return round(
            obj.skills * 0.30
            + obj.professionalism * 0.25
            + obj.development * 0.25
            + obj.deliverables * 0.20
        )

    def get_grade_letter(self, obj):
        t = self.get_weighted_total(obj)
        if t >= 80: return "A"
        if t >= 70: return "B"
        if t >= 60: return "C"
        if t >= 50: return "D"
        return "F"

    def validate(self, attrs):
        for field in ("skills", "professionalism", "development", "deliverables"):
            val = attrs.get(field, 0)
            if not 0 <= val <= 100:
                raise serializers.ValidationError({field: "Score must be between 0 and 100."})
        return attrs

    def create(self, validated_data):
        obj, _ = Evaluation.objects.update_or_create(
            student=validated_data["student"],
            period=validated_data["period"],
            defaults=validated_data,
        )
        return obj
