from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.internships.models import ActivityLog, Company, Evaluation, InternshipPeriod, Placement


class ReportEndpointTests(TestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.student = self.user_model.objects.create_user(
            email="student@example.com",
            password="StrongPass123!",
            full_name="Student Example",
            role="student",
        )
        self.lecturer = self.user_model.objects.create_user(
            email="lecturer@example.com",
            password="StrongPass123!",
            full_name="Lecturer Example",
            role="lecturer",
        )
        self.mentor = self.user_model.objects.create_user(
            email="mentor@example.com",
            password="StrongPass123!",
            full_name="Mentor Example",
            role="mentor",
        )
        self.company = Company.objects.create(
            name="Acme Labs",
            sector="Software",
            district="Kampala",
            max_capacity=5,
        )
        self.period = InternshipPeriod.objects.create(
            name="Semester Test Period",
            start_date="2026-01-01",
            end_date="2026-04-30",
            weeks=16,
            status="active",
        )
        self.placement = Placement.objects.create(
            student=self.student,
            company=self.company,
            lecturer=self.lecturer,
            mentor=self.mentor,
            period=self.period,
            created_by=self.lecturer,
        )
        ActivityLog.objects.create(
            placement=self.placement,
            student=self.student,
            mentor=self.mentor,
            title="Daily standup",
            description="Joined team standup",
            skills="communication",
            hours_spent=1.5,
            activity_date="2026-02-01",
            status="validated",
        )
        Evaluation.objects.create(
            student=self.student,
            lecturer=self.lecturer,
            period=self.period,
            skills=80,
            professionalism=75,
            development=70,
            deliverables=90,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def test_student_can_download_activity_report(self):
        response = self.client.get("/api/v1/reports/activity/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Daily standup", response.content.decode())
        self.assertNotIn("Report type not recognised", response.content.decode())

    def test_student_can_download_evaluation_report(self):
        response = self.client.get("/api/v1/reports/evaluation/")
        self.assertEqual(response.status_code, 200)
        body = response.content.decode()
        self.assertIn("Weighted Total", body)
        self.assertIn("Student Example", body)


class StaffActivityCreationTests(TestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.student = self.user_model.objects.create_user(
            email="student2@example.com",
            password="StrongPass123!",
            full_name="Student Two",
            role="student",
        )
        self.mentor = self.user_model.objects.create_user(
            email="mentor2@example.com",
            password="StrongPass123!",
            full_name="Mentor Two",
            role="mentor",
        )
        self.lecturer = self.user_model.objects.create_user(
            email="lecturer2@example.com",
            password="StrongPass123!",
            full_name="Lecturer Two",
            role="lecturer",
        )
        self.company = Company.objects.create(
            name="Beta Labs",
            sector="Software",
            district="Kampala",
            max_capacity=5,
        )
        self.period = InternshipPeriod.objects.create(
            name="Mentor Period",
            start_date="2026-05-01",
            end_date="2026-08-31",
            weeks=16,
            status="active",
        )
        Placement.objects.create(
            student=self.student,
            company=self.company,
            lecturer=self.lecturer,
            mentor=self.mentor,
            period=self.period,
            created_by=self.lecturer,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.mentor)

    def test_mentor_can_create_activity_for_selected_student(self):
        response = self.client.post(
            "/api/v1/activities/",
            {
                "student": str(self.student.id),
                "title": "Assigned task",
                "description": "Complete documentation",
                "skills": "writing",
                "hours_spent": 2,
                "activity_date": "2026-05-08",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        activity = ActivityLog.objects.get(title="Assigned task")
        self.assertEqual(activity.student, self.student)
        self.assertEqual(activity.mentor, self.mentor)

    def test_mentor_can_fetch_activities_with_null_placement(self):
        activity = ActivityLog.objects.create(
            placement=None,
            student=self.student,
            mentor=self.mentor,
            title="Activity without placement",
            description="Doing self study",
            skills="independent",
            hours_spent=4,
            activity_date="2026-05-10",
            status="pending",
        )
        response = self.client.get("/api/v1/activities/")
        self.assertEqual(response.status_code, 200)
        activity_ids = [act["id"] for act in response.json()["results"]]
        self.assertIn(activity.id, activity_ids)


class StudentActivityPermissionTests(TestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.student = self.user_model.objects.create_user(
            email="student3@example.com",
            password="StrongPass123!",
            full_name="Student Three",
            role="student",
        )
        self.mentor = self.user_model.objects.create_user(
            email="mentor3@example.com",
            password="StrongPass123!",
            full_name="Mentor Three",
            role="mentor",
        )
        self.lecturer = self.user_model.objects.create_user(
            email="lecturer3@example.com",
            password="StrongPass123!",
            full_name="Lecturer Three",
            role="lecturer",
        )
        self.company = Company.objects.create(
            name="Gamma Labs",
            sector="Software",
            district="Kampala",
            max_capacity=5,
        )
        self.period = InternshipPeriod.objects.create(
            name="Student Permission Period",
            start_date="2026-06-01",
            end_date="2026-09-30",
            weeks=16,
            status="active",
        )
        placement = Placement.objects.create(
            student=self.student,
            company=self.company,
            lecturer=self.lecturer,
            mentor=self.mentor,
            period=self.period,
            created_by=self.lecturer,
        )
        self.rejected = ActivityLog.objects.create(
            placement=placement,
            student=self.student,
            mentor=self.mentor,
            title="Rejected activity",
            description="Needs revision",
            skills="python",
            hours_spent=2,
            activity_date="2026-06-10",
            status="rejected",
        )
        self.validated = ActivityLog.objects.create(
            placement=placement,
            student=self.student,
            mentor=self.mentor,
            title="Validated activity",
            description="Already approved",
            skills="testing",
            hours_spent=3,
            activity_date="2026-06-11",
            status="validated",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def test_student_can_delete_rejected_activity(self):
        response = self.client.delete(f"/api/v1/activities/{self.rejected.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(ActivityLog.objects.filter(id=self.rejected.id).exists())

    def test_student_cannot_update_validated_activity(self):
        response = self.client.patch(
            f"/api/v1/activities/{self.validated.id}/",
            {"title": "Changed title"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_student_updating_rejected_activity_resets_status_to_pending(self):
        self.assertEqual(self.rejected.status, "rejected")
        response = self.client.patch(
            f"/api/v1/activities/{self.rejected.id}/",
            {"title": "Updated rejected activity title"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.rejected.refresh_from_db()
        self.assertEqual(self.rejected.status, "pending")
        self.assertEqual(self.rejected.title, "Updated rejected activity title")
