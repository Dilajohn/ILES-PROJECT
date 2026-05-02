from django.conf import settings
from django.db import models


class Company(models.Model):
    class Status(models.TextChoices):
        ACTIVE   = "active",   "Active"
        INACTIVE = "inactive", "Inactive"

    name         = models.CharField(max_length=255, unique=True, db_index=True)
    sector       = models.CharField(max_length=128, db_index=True)
    district     = models.CharField(max_length=128, db_index=True)
    email        = models.EmailField(blank=True)
    max_capacity = models.PositiveIntegerField(default=10)
    status       = models.CharField(
        max_length=16, choices=Status.choices,
        default=Status.ACTIVE, db_index=True,
    )

    def __str__(self):
        return self.name


class InternshipPeriod(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Closed"

    name       = models.CharField(max_length=128, unique=True, db_index=True)
    start_date = models.DateField(db_index=True)
    end_date   = models.DateField(db_index=True)
    weeks      = models.PositiveIntegerField(default=16)
    status     = models.CharField(
        max_length=16, choices=Status.choices,
        default=Status.ACTIVE, db_index=True,
    )

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return self.name


class Placement(models.Model):
    student    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="placements", limit_choices_to={"role": "student"},
    )
    company    = models.ForeignKey(Company, on_delete=models.PROTECT, related_name="placements")
    lecturer   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="lecturer_placements", limit_choices_to={"role": "lecturer"},
    )
    mentor     = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="mentor_placements", limit_choices_to={"role": "mentor"},
    )
    period     = models.ForeignKey(InternshipPeriod, on_delete=models.PROTECT, related_name="placements")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="created_placements",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        unique_together = ("student", "period")
        indexes = [
            models.Index(fields=["company", "period"]),
            models.Index(fields=["lecturer", "mentor"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} → {self.company.name}"


class ActivityLog(models.Model):
    class Status(models.TextChoices):
        DRAFT          = "draft",          "Draft"
        PENDING        = "pending",        "Pending"
        MENTOR_APPROVED= "mentor_approved","Mentor Approved"
        VALIDATED      = "validated",      "Validated"
        REJECTED       = "rejected",       "Rejected"

    # placement is nullable so students can log activities before placement is created
    placement     = models.ForeignKey(
        Placement, on_delete=models.CASCADE,
        related_name="activities", null=True, blank=True,
    )
    student       = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="activities", limit_choices_to={"role": "student"},
    )
    mentor        = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="assigned_activities",
        limit_choices_to={"role": "mentor"},
    )
    title         = models.CharField(max_length=255, db_index=True)
    description   = models.TextField(blank=True)
    skills        = models.CharField(max_length=255, blank=True)
    hours_spent   = models.DecimalField(max_digits=4, decimal_places=1)
    activity_date = models.DateField(db_index=True)
    status        = models.CharField(
        max_length=20, choices=Status.choices,
        default=Status.PENDING, db_index=True,
    )
    mentor_note   = models.TextField(blank=True)
    lecturer_note = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-activity_date", "-created_at"]
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["mentor",  "status"]),
        ]

    def __str__(self):
        return f"[{self.status}] {self.title} — {self.student.full_name}"


class Evaluation(models.Model):
    student         = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="evaluations", limit_choices_to={"role": "student"},
    )
    lecturer        = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="issued_evaluations", limit_choices_to={"role": "lecturer"},
    )
    period          = models.ForeignKey(
        InternshipPeriod, on_delete=models.PROTECT, related_name="evaluations",
    )
    skills          = models.PositiveSmallIntegerField()
    professionalism = models.PositiveSmallIntegerField()
    development     = models.PositiveSmallIntegerField()
    deliverables    = models.PositiveSmallIntegerField()
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        unique_together = ("student", "period")

    def __str__(self):
        return f"Eval: {self.student.full_name} — {self.period.name}"
