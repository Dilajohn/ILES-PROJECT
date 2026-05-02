# ILES — Internship Logging & Evaluation System
### React Front-end v0.1.0 | Makerere University COCIT | CSC 1202

---

## Overview

ILES is a workflow-driven platform that manages internship placements, weekly activity logs, supervisor reviews, academic evaluations, weighted performance scoring, and institutional dashboards.

This repository contains the **React front-end** built with Vite, designed to connect to a Django REST Framework back-end.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit VITE_API_URL=http://localhost:8000/api

# 3. Start development server
npm run dev
# → http://localhost:5173

# 4. Build for production
npm run build
```

---

## Project Structure

```
src/
├── api/                        # API layer (independent of UI)
│   ├── client.js               # Axios base client + JWT interceptors
│   ├── authService.js          # login, signup, logout, refresh, forgotPassword
│   ├── userService.js          # fetchCurrentUser, fetchStudents, etc.
│   └── internshipService.js    # activities, attendance, evaluations, reports
│
├── theme/
│   └── tokens.js               # Single source of truth: colors, typography,
│                               # spacing, radius, breakpoints, buttonVariants
│
├── styles/
│   └── global.css              # CSS variables, chip classes, responsive breakpoints
│
├── components/                 # Shared, reusable UI components
│   ├── Button/                 # Variant-driven; reads styles from tokens.js
│   ├── Alert/                  # info | success | warning | danger
│   └── Sidebar/                # Role-aware navigation for all 4 actors
│
├── layouts/
│   ├── MainLayout.jsx          # Fixed sidebar + mobile hamburger + Outlet
│   └── AuthLayout.jsx          # Centered card for login / signup pages
│
├── pages/                      # Top-level auth pages
│   ├── LoginPage.jsx           # Email + password, validation, demo shortcuts
│   ├── SignupPage.jsx          # Full registration with role selector
│   └── ForgotPasswordPage.jsx  # Email reset flow
│
├── features/                   # Domain-driven feature folders
│   ├── landing/                # Public landing page (UGX currency)
│   ├── dashboard/              # Student portal
│   ├── mentor/                 # Field Mentor validation panel
│   ├── lecturer/               # Lecturer cohort dashboard + grade entry
│   └── admin/                  # Administrator 8-tab panel
│
├── hooks/
│   ├── useAuth.js              # AuthContext: login, signup, logout, user state
│   └── useToast.js             # Notification hook
│
└── utils/
    └── helpers.js              # formatUGX, calcWeightedScore, ROLE_ROUTES, etc.
```

---

## Routing

| Path | Component | Description |
|------|-----------|-------------|
| `/` | LandingPage | Public landing with UGX, hero, testimonials |
| `/login` | LoginPage | Email + password auth |
| `/signup` | SignupPage | Registration with role selection |
| `/forgot-password` | ForgotPasswordPage | Password reset |
| `/dashboard/student/*` | StudentDashboard | GPS clock-in, logbook, QR, evaluations |
| `/dashboard/mentor/*` | MentorDashboard | Activity validation queue, QR scanner |
| `/dashboard/lecturer/*` | LecturerDashboard | Cohort table, grade entry, reports |
| `/dashboard/admin/*` | AdminDashboard | 8 tabs: all master data + audit log |

All dashboard routes use **lazy loading** for optimised bundle splitting.

---

## Design System

All design tokens live in `src/theme/tokens.js`. Changing a value there updates every component that uses it.

```js
// Changing the primary button color — updates ALL Button variant="primary" instances:
buttonVariants.primary.bg = '#your-new-color';
```

**Breakpoints:**
- Mobile: ≤ 768px
- Tablet: 768px – 1024px
- Desktop: > 1024px

---

## Django Integration

### 1. Install CORS headers

```bash
pip install django-cors-headers djangorestframework-simplejwt
```

### 2. Django settings.py

```python
INSTALLED_APPS = [
    'corsheaders',
    'rest_framework',
    ...
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be first
    'django.middleware.common.CommonMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',   # Vite dev server
    'http://localhost:3000',   # CRA dev server
    'https://your-production-domain.com',
]

CORS_ALLOW_CREDENTIALS = True  # Required for cookie/session auth

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

### 3. Django URL patterns (urls.py)

```python
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('api/auth/login/',          TokenObtainPairView.as_view()),
    path('api/auth/token/refresh/',  TokenRefreshView.as_view()),
    path('api/auth/signup/',         YourSignupView.as_view()),
    path('api/auth/logout/',         YourLogoutView.as_view()),
    path('api/users/',               UserListView.as_view()),
    path('api/activities/',          ActivityListView.as_view()),
    path('api/attendance/',          AttendanceListView.as_view()),
    path('api/evaluations/',         EvaluationListView.as_view()),
    path('api/placements/',          PlacementListView.as_view()),
    path('api/periods/',             PeriodListView.as_view()),
    path('api/companies/',           CompanyListView.as_view()),
    path('api/reports/<str:type>/',  ReportView.as_view()),
]
```

### 4. JWT Flow

The Axios client (`src/api/client.js`) automatically:
1. Attaches `Authorization: Bearer <token>` to every request
2. Intercepts 401 responses and attempts a token refresh
3. Redirects to `/login` if refresh fails

Tokens are stored in `localStorage` under keys `iles_access_token` and `iles_refresh_token`.

---

## Deployment

### Option A: Separate servers (recommended for development)

```bash
# Frontend on port 5173
npm run dev

# Django backend on port 8000
python manage.py runserver
```

### Option B: Django serves the React build (production)

```bash
# Build React
npm run build
# → dist/ folder

# Copy dist/ to Django's STATIC_ROOT or serve via WhiteNoise
pip install whitenoise
```

```python
# settings.py
STATICFILES_DIRS = [BASE_DIR / 'frontend/dist']
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Add WhiteNoise to MIDDLEWARE
MIDDLEWARE = ['whitenoise.middleware.WhiteNoiseMiddleware', ...]
```

```python
# urls.py — catch-all to serve React's index.html for client-side routing
from django.views.generic import TemplateView
urlpatterns += [re_path(r'^(?!api/).*', TemplateView.as_view(template_name='index.html'))]
```

---

## Demo Portals

The login page includes **demo shortcuts** — click any role button to jump directly to that portal without a backend:

| Role | URL | Accent |
|------|-----|--------|
| Student | `/dashboard/student` | Teal `#00bfa5` |
| Field Mentor | `/dashboard/mentor` | Green `#059669` |
| Lecturer | `/dashboard/lecturer` | Purple `#7c3aed` |
| Administrator | `/dashboard/admin` | Red `#dc2626` |

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/). See `CHANGELOG.md` for the full history.

Current version: **0.1.0**

To bump the version after adding features:
```bash
npm version patch   # 0.1.0 → 0.1.1 (bug fixes)
npm version minor   # 0.1.0 → 0.2.0 (new features)
npm version major   # 0.1.0 → 1.0.0 (breaking changes)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Build tool | Vite 5 |
| UI library | React 18 |
| Routing | React Router v6 |
| HTTP client | Axios 1.x |
| Styling | CSS Modules + CSS Variables |
| Fonts | Google Fonts (Sora, DM Sans) |
| Auth | JWT via djangorestframework-simplejwt |

---

© 2026 Makerere University COCIT — CSC 1202
