from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.users.models import StudentProfile, User


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StudentProfile
        fields = ["registration_number", "programme", "academic_year",
                  "university", "department"]


class UserSerializer(serializers.ModelSerializer):
    student_profile = StudentProfileSerializer(read_only=True)

    class Meta:
        model  = User
        fields = [
            "id", "email", "full_name", "role", "phone_number",
            "is_active", "date_joined", "last_login", "student_profile",
        ]
        read_only_fields = ["id", "role", "date_joined", "last_login"]


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
