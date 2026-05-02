from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email must be set.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        LECTURER = "lecturer", "Lecturer"
        MENTOR = "mentor", "Mentor"
        STUDENT = "student", "Student"

    username = None
    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=255, db_index=True)
    role = models.CharField(max_length=20, choices=Role.choices, db_index=True)
    phone_number = models.CharField(max_length=32, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "role"]

    def __str__(self):
        return f"{self.full_name} <{self.email}>"


class StudentProfile(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        FLAGGED = "flagged", "Flagged"
        INACTIVE = "inactive", "Inactive"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    registration_number = models.CharField(max_length=64, unique=True, db_index=True)
    programme = models.CharField(max_length=128, db_index=True)
    academic_year = models.CharField(max_length=32)
    department = models.CharField(max_length=128, default="Computer Science")
    university = models.CharField(max_length=128, default="Makerere University")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE, db_index=True)

    def __str__(self):
        return self.registration_number
