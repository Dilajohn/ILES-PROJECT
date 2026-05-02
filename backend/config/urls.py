from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

from apps.common.views import HealthCheckView
from apps.internships.views import (
    ActivityViewSet,
    CompanyViewSet,
    EvaluationViewSet,
    InternshipPeriodViewSet,
    PlacementViewSet,
    ReportViewSet,
)
from apps.reporting.views import AuditLogViewSet
from apps.tracking.views import AttendanceViewSet, NotificationViewSet
from apps.users.views import AuthViewSet, UserViewSet

router = DefaultRouter()
router.register("auth", AuthViewSet, basename="auth")
router.register("users", UserViewSet, basename="users")
router.register("companies", CompanyViewSet, basename="companies")
router.register("periods", InternshipPeriodViewSet, basename="periods")
router.register("placements", PlacementViewSet, basename="placements")
router.register("activities", ActivityViewSet, basename="activities")
router.register("attendance", AttendanceViewSet, basename="attendance")
router.register("evaluations", EvaluationViewSet, basename="evaluations")
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("reports", ReportViewSet, basename="reports")
router.register("audit-logs", AuditLogViewSet, basename="audit-logs")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", HealthCheckView.as_view(), name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
