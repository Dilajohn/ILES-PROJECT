import logging

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.permissions import IsAdmin
from apps.users.models import User
from apps.users.serializers import ChangePasswordSerializer, SignupSerializer, UserSerializer
from apps.users.services import log_user_event

logger = logging.getLogger("iles")


class AuthViewSet(viewsets.GenericViewSet):
    queryset = User.objects.none()
    permission_classes = [AllowAny]
    serializer_class = SignupSerializer
    throttle_scope = "auth"

    @action(detail=False, methods=["post"], url_path="signup")
    def signup(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        log_user_event(user, "create", f"User account created for {user.email}")
        return Response(
            {
                "user":    UserSerializer(user).data,
                "refresh": str(refresh),
                "access":  str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="login")
    def login(self, request):
        from django.contrib.auth import authenticate
        email    = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")
        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = authenticate(request, email=email, password=password)
        if not user:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_active:
            return Response(
                {"detail": "This account has been deactivated."},
                status=status.HTTP_403_FORBIDDEN,
            )
        refresh = RefreshToken.for_user(user)
        log_user_event(user, "login", f"User signed in: {user.email}")
        return Response(
            {
                "user":    UserSerializer(user).data,
                "refresh": str(refresh),
                "access":  str(refresh.access_token),
            }
        )

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="logout")
    def logout(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except (InvalidToken, TokenError) as e:
                logger.warning("Logout: token blacklist failed (%s) — session cleared anyway", e)
        log_user_event(request.user, "logout", f"User signed out: {request.user.email}")
        return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="token/refresh")
    def refresh(self, request):
        raw = request.data.get("refresh")
        if not raw:
            return Response({"detail": "Refresh token required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(raw)
            return Response({"access": str(token.access_token)})
        except (InvalidToken, TokenError):
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=["post"], url_path="password-reset")
    def password_reset(self, request):
        # TODO: wire to Celery + email in production
        email = request.data.get("email", "")
        logger.info("Password reset requested for: %s", email)
        return Response(
            {"detail": "If that email is registered, a reset link has been sent."},
            status=status.HTTP_202_ACCEPTED,
        )


class UserViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = User.objects.select_related("student_profile").all().order_by("full_name")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields   = ["role", "is_active"]
    search_fields      = ["full_name", "email", "student_profile__registration_number"]
    ordering_fields    = ["full_name", "created_at", "role"]

    def get_serializer_class(self):
        if self.action == "create":
            return SignupSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in {"create", "list", "update", "partial_update", "destroy", "retrieve"}:
            return [IsAdmin()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_user_event(request.user, "create", f"Admin created user: {user.email}")
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @me.mapping.patch
    def update_me(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_user_event(user, "edit", f"Profile updated: {user.email}")
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=["post"], url_path="change-password")
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        log_user_event(request.user, "edit", f"Password updated: {request.user.email}")
        return Response({"detail": "Password updated successfully."})

    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin], url_path="toggle-status")
    def toggle_status(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        action_word = "enabled" if user.is_active else "disabled"
        log_user_event(request.user, "edit", f"Account {action_word}: {user.email}")
        return Response({"detail": f"Account {action_word}.", "is_active": user.is_active})

    @action(detail=False, methods=["get"], url_path="students")
    def students(self, request):
        queryset = self.filter_queryset(self.get_queryset().filter(role=User.Role.STUDENT))
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(UserSerializer(page, many=True).data)
        return Response(UserSerializer(queryset, many=True).data)

    @action(detail=False, methods=["get"], url_path="mentors")
    def mentors(self, request):
        queryset = self.filter_queryset(self.get_queryset().filter(role=User.Role.MENTOR))
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(UserSerializer(page, many=True).data)
        return Response(UserSerializer(queryset, many=True).data)

    @action(detail=False, methods=["get"], url_path="lecturers")
    def lecturers(self, request):
        queryset = self.filter_queryset(self.get_queryset().filter(role=User.Role.LECTURER))
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(UserSerializer(page, many=True).data)
        return Response(UserSerializer(queryset, many=True).data)
