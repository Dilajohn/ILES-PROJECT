from .base import *  # noqa

DEBUG = True
ALLOWED_HOSTS = ["*"]

# ── Dev database: use Postgres from .env; set USE_SQLITE=true for quick local start ──
import os
if os.environ.get("USE_SQLITE", "false").lower() == "true":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Disable throttling in dev so testing is not rate-limited
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {},
}

# Shorter tokens in dev for convenience
from datetime import timedelta
SIMPLE_JWT = {
    **SIMPLE_JWT,
    "ACCESS_TOKEN_LIFETIME":  timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
}

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
