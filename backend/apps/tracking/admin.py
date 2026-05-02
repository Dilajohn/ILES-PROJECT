from django.contrib import admin

from apps.tracking.models import AttendanceRecord, Notification

admin.site.register(AttendanceRecord)
admin.site.register(Notification)
