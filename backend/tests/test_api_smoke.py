from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient


class ApiSmokeTest(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="admin@example.com",
            password="StrongPass123!",
            full_name="Admin User",
            role="admin",
        )
        self.client = APIClient()

    def test_health_endpoint(self):
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)

    def test_login(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "admin@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
