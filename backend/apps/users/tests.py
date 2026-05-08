from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.users.models import StudentProfile
from apps.users.serializers import UserSerializer


class UserSerializerTests(TestCase):
    def test_updates_nested_student_profile(self):
        user = get_user_model().objects.create_user(
            email="nested@example.com",
            password="StrongPass123!",
            full_name="Nested Student",
            role="student",
        )
        StudentProfile.objects.create(
            user=user,
            registration_number="REG-001",
            programme="BSc Computer Science",
            academic_year="Year 3",
        )

        serializer = UserSerializer(
            user,
            data={
                "full_name": "Nicole Updated",
                "student_profile": {
                    "registration_number": "REG-NEW",
                    "programme": "BSc Software Engineering",
                    "academic_year": "Year 4",
                    "university": "Makerere University",
                    "department": "Computer Science",
                    "status": "active",
                },
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        user.refresh_from_db()
        user.student_profile.refresh_from_db()
        self.assertEqual(user.full_name, "Nicole Updated")
        self.assertEqual(user.student_profile.registration_number, "REG-NEW")
        self.assertEqual(user.student_profile.programme, "BSc Software Engineering")
