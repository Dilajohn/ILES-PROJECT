from django.contrib import admin

from apps.internships.models import ActivityLog, Company, Evaluation, InternshipPeriod, Placement

admin.site.register(Company)
admin.site.register(InternshipPeriod)
admin.site.register(Placement)
admin.site.register(ActivityLog)
admin.site.register(Evaluation)
