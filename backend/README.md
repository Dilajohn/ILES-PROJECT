# ILES Django Backend

This backend mirrors the React frontend's role-based internship workflow with a PostgreSQL-first Django + DRF design.

## Apps

- `users`: custom auth, roles, student profiles
- `internships`: companies, periods, placements, activities, evaluations
- `tracking`: attendance, notifications
- `reporting`: audit log and export-ready report surfaces
- `common`: pagination, error handling, health check, shared permissions

## Key API groups

- `/api/v1/auth/*`
- `/api/v1/users/*`
- `/api/v1/companies/*`
- `/api/v1/periods/*`
- `/api/v1/placements/*`
- `/api/v1/activities/*`
- `/api/v1/attendance/*`
- `/api/v1/evaluations/*`
- `/api/v1/notifications/*`
- `/api/v1/reports/<type>/`

## Local startup

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Deployment note

For Vercel, the cleanest setup is usually two projects from the same repo:

1. `frontend/` as the React app
2. `backend/` as the Django serverless app

Both can share the same PostgreSQL instance and environment variables while staying in one repository.
