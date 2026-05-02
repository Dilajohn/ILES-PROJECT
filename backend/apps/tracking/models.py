from django.conf import settings
from django.db import models

from apps.internships.models import Placement


class AttendanceRecord(models.Model):
    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"

    placement = models.ForeignKey(Placement, on_delete=models.CASCADE, related_name="attendance_records", null=True, blank=True)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_records", limit_choices_to={"role": "student"})
    record_date = models.DateField(db_index=True)
    clock_in_at = models.TimeField(null=True, blank=True)
    clock_out_at = models.TimeField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PRESENT, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "record_date")
        indexes = [models.Index(fields=["student", "record_date"])]


class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
