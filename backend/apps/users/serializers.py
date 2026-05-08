from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.users.models import StudentProfile, User


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StudentProfile
        fields = ["registration_number", "programme", "academic_year",
                  "university", "department", "status"]


class UserSerializer(serializers.ModelSerializer):
    student_profile = StudentProfileSerializer(required=False)

    class Meta:
        model  = User
        fields = [
            "id", "email", "full_name", "role", "phone_number",
            "is_active", "date_joined", "last_login", "student_profile",
        ]
        read_only_fields = ["id", "role", "date_joined", "last_login"]

    def validate_email(self, value):
        email = value.strip().lower()
        queryset = User.objects.filter(email__iexact=email)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def _sync_student_profile(self, user, profile_data):
        if profile_data is None or user.role != User.Role.STUDENT:
            return
        profile, _ = StudentProfile.objects.get_or_create(
            user=user,
            defaults={
                "registration_number": profile_data.get("registration_number") or f"MAK/{str(user.id)[:8].upper()}",
                "programme": profile_data.get("programme") or "BSc Computer Science",
                "academic_year": profile_data.get("academic_year") or "Year 3",
                "department": profile_data.get("department") or "Computer Science",
                "university": profile_data.get("university") or "Makerere University",
                "status": profile_data.get("status") or StudentProfile.Status.ACTIVE,
            },
        )
        for field, value in profile_data.items():
            setattr(profile, field, value)
        profile.save()

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("student_profile", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        self._sync_student_profile(instance, profile_data)
        return instance


class SignupSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, min_length=8,
                                             style={"input_type": "password"})
    confirm_password = serializers.CharField(write_only=True,
                                             style={"input_type": "password"})
    # Optional student-only profile fields
    registration_number = serializers.CharField(required=False, allow_blank=True, write_only=True)
    programme           = serializers.CharField(required=False, allow_blank=True, write_only=True)
    academic_year       = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model  = User
        fields = [
            "email", "full_name", "role", "phone_number",
            "password", "confirm_password",
            "registration_number", "programme", "academic_year",
        ]

    def validate_email(self, value):
        v = value.strip().lower()
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )
        return v

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data):
        # Pull out profile fields before creating the user
        reg_number   = validated_data.pop("registration_number", "")
        programme    = validated_data.pop("programme", "BSc Computer Science")
        academic_year= validated_data.pop("academic_year", "Year 3")
        password     = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        # Create student profile only when role is student
        if user.role == User.Role.STUDENT:
            StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    "registration_number": reg_number or f"MAK/{user.id.hex[:6].upper()}",
                    "programme":           programme,
                    "academic_year":       academic_year,
                },
            )
        return user


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password     = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs
