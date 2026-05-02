# Frontend to backend mapping

## Auth

- `POST /api/v1/auth/signup/`
- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/token/refresh/`
- `POST /api/v1/auth/logout/`
- `POST /api/v1/auth/password-reset/`
- `GET /api/v1/users/me/`

## Admin

- `GET|POST|PATCH|DELETE /api/v1/users/`
- `GET /api/v1/users/students/`
- `GET /api/v1/users/mentors/`
- `GET /api/v1/users/lecturers/`
- `GET|POST|PATCH|DELETE /api/v1/companies/`
- `GET|POST|PATCH /api/v1/periods/`
- `GET|POST|PATCH|DELETE /api/v1/placements/`
- `GET /api/v1/reports/placements/`
- `GET /api/v1/reports/audit/`

## Student

- `GET|POST|PATCH|DELETE /api/v1/activities/`
  Query params:
  `status`, `activity_date`, `ordering`, `search`, `page`, `page_size`
- `GET|POST /api/v1/attendance/`
- `POST /api/v1/attendance/clock-in/`
- `POST /api/v1/attendance/clock-out/`
- `GET /api/v1/evaluations/?student=<id>`
- `GET /api/v1/notifications/`
- `POST /api/v1/notifications/mark-all-read/`
- `GET /api/v1/reports/activity/`
- `GET /api/v1/reports/attendance/`

## Mentor

- `GET /api/v1/activities/?mentor=<id>&status=pending`
- `POST /api/v1/activities/<id>/validate/`
- `POST /api/v1/activities/<id>/reject/`
- `POST /api/v1/activities/` for mentor-created student tasks
- `GET /api/v1/attendance/?placement=<id>`
- `GET /api/v1/reports/validation/`

## Lecturer

- `GET /api/v1/activities/?status=mentor_approved`
- `POST /api/v1/activities/<id>/approve/`
- `GET|POST|PATCH /api/v1/evaluations/`
- `GET /api/v1/attendance/`
- `GET /api/v1/reports/cohort/`

## Cross-cutting

- Health check: `GET /health/`
- OpenAPI schema: `GET /api/schema/`
- Swagger UI: `GET /api/docs/`

## Notes

- All list endpoints support DRF pagination.
- Search uses DRF `SearchFilter`; field-specific filtering uses `django-filter`.
- JWT is the primary auth mechanism.
- Activity validation is modeled as a two-stage workflow:
  `pending -> mentor_approved -> validated`
- Audit logging and notifications are emitted from service helpers rather than view code alone.
