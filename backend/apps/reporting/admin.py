from django.contrib import admin

from apps.reporting.models import AuditLog

admin.site.register(AuditLog)
