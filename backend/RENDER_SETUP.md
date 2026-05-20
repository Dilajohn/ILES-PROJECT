# Render Backend Deployment Guide

This project is ready to run on Render as a Django web service with PostgreSQL.

## Service Shape

- Service type: Web Service
- Runtime: Python
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Pre-deploy command: `python manage.py collectstatic --noinput && python manage.py migrate`
- Start command: `gunicorn config.wsgi:application`
- Health check path: `/health/`

## What the Backend Already Has

- Production settings module: `config.settings.prod`
- WSGI entrypoint for Gunicorn: `config.wsgi:application`
- PostgreSQL configuration from environment variables
- WhiteNoise static file support
- Health endpoint at `/health/`
- Gunicorn in `requirements.txt`

## Environment Variable Connection Map

Use this section as the exact connection list between Render, Django, PostgreSQL, Redis, and the frontend.

### Core Django variables

`DJANGO_SETTINGS_MODULE`
- Set to: `config.settings.prod`
- Used by:
  - `backend/config/wsgi.py`
  - `backend/api/index.py`
- Purpose:
  - Tells Django to load production settings on Render.

`DJANGO_SECRET_KEY`
- Example value: generate a long random secret
- Used by:
  - `backend/config/settings/base.py`
- Purpose:
  - Signs sessions, CSRF tokens, and Django security data.
- Connection:
  - Render Environment -> Django `SECRET_KEY`

`DJANGO_DEBUG`
- Set to: `False`
- Used by:
  - `backend/config/settings/base.py`
- Purpose:
  - Must stay off in production.
- Connection:
  - Render Environment -> Django `DEBUG`

`DJANGO_ALLOWED_HOSTS`
- Example value:
  - `iles-backend.onrender.com,your-custom-domain.com`
- Used by:
  - `backend/config/settings/base.py`
- Purpose:
  - Allows requests for your Render backend hostname and any custom domain.
- Connection:
  - Browser request host -> Render domain -> Django host validation
- Note:
  - The backend now also auto-adds Render's `RENDER_EXTERNAL_HOSTNAME` when available.

`DJANGO_TIME_ZONE`
- Recommended value: `Africa/Kampala`
- Used by:
  - `backend/config/settings/base.py`
- Purpose:
  - Controls application timezone behavior.

`DJANGO_LOG_LEVEL`
`APP_LOG_LEVEL`
- Recommended value: `INFO`
- Used by:
  - `backend/config/settings/base.py`
- Purpose:
  - Controls console log verbosity in Render logs.

### PostgreSQL variables

These connect your Render web service to your database.

`POSTGRES_DB`
- Example: `iles_db`
- Used by:
  - `backend/config/settings/base.py`
- Connection:
  - Render PostgreSQL database name -> Django database `NAME`

`POSTGRES_USER`
- Example: `iles_user`
- Used by:
  - `backend/config/settings/base.py`
- Connection:
  - Render PostgreSQL username -> Django database `USER`

`POSTGRES_PASSWORD`
- Example: the password Render generates for the database user
- Used by:
  - `backend/config/settings/base.py`
- Connection:
  - Render PostgreSQL password -> Django database `PASSWORD`

`POSTGRES_HOST`
- Example: `dpg-xxxxxxxxxxxx-a.oregon-postgres.render.com`
- Used by:
  - `backend/config/settings/base.py`
- Connection:
  - Render PostgreSQL host -> Django database `HOST`

`POSTGRES_PORT`
- Set to: `5432`
- Used by:
  - `backend/config/settings/base.py`
- Connection:
  - Render PostgreSQL port -> Django database `PORT`

`POSTGRES_SSLMODE`
- Set to: `require`
- Used by:
  - `backend/config/settings/base.py`
- Connection:
  - Render PostgreSQL SSL requirement -> Django psycopg `sslmode`

`POSTGRES_CONN_MAX_AGE`
- Recommended value: `60`
- Used by:
  - `backend/config/settings/base.py`
- Purpose:
  - Reuses database connections for better production performance.

### Frontend-to-backend connection variables

These are the most important cross-service variables.

`CORS_ALLOWED_ORIGINS`
- Example:
  - `https://iles-frontend.onrender.com`
- Used by:
  - `backend/config/settings/base.py`
- Purpose:
  - Allows the frontend origin to call the backend API from the browser.
- Connection:
  - Frontend public URL -> Django CORS allowlist

`CSRF_TRUSTED_ORIGINS`
- Example:
  - `https://iles-frontend.onrender.com`
- Used by:
  - `backend/config/settings/base.py`
- Purpose:
  - Trusts the frontend origin for CSRF-protected requests.
- Connection:
  - Frontend public URL -> Django CSRF trusted origins

`VITE_API_URL`
- Set in the frontend service, not the backend
- Example:
  - `https://iles-backend.onrender.com/api/v1`
- Used by:
  - `frontend/src/api/client.js`
- Purpose:
  - Tells the React app which backend API base URL to call.
- Connection:
  - Backend public URL -> Frontend environment -> Browser API calls

### Optional Redis / Celery variables

These are optional right now. Your backend can boot without them.

`REDIS_URL`
- Example:
  - `redis://red-xxxxxxxxxxxx:6379`
- Used by:
  - `backend/config/settings/base.py`
- Purpose:
  - Enables Redis cache if present.
- Connection:
  - Render Key Value / Redis URL -> Django cache backend

`CELERY_BROKER_URL`
- Usually set to the same value as `REDIS_URL`
- Used by:
  - `backend/config/settings/base.py`
  - `backend/config/celery.py`
- Purpose:
  - Broker for background jobs.
- Connection:
  - Render Redis URL -> Celery broker

`CELERY_RESULT_BACKEND`
- Usually set to the same value as `CELERY_BROKER_URL`
- Used by:
  - `backend/config/settings/base.py`
- Purpose:
  - Stores Celery task results if you later run workers.
- Connection:
  - Render Redis URL -> Celery result backend

## Recommended Production Values

```env
DJANGO_SETTINGS_MODULE=config.settings.prod
DJANGO_SECRET_KEY=replace-with-a-long-random-secret
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=iles-backend.onrender.com
DJANGO_TIME_ZONE=Africa/Kampala

POSTGRES_DB=replace-with-render-db-name
POSTGRES_USER=replace-with-render-db-user
POSTGRES_PASSWORD=replace-with-render-db-password
POSTGRES_HOST=replace-with-render-db-host
POSTGRES_PORT=5432
POSTGRES_SSLMODE=require
POSTGRES_CONN_MAX_AGE=60

CORS_ALLOWED_ORIGINS=https://iles-frontend.onrender.com
CSRF_TRUSTED_ORIGINS=https://iles-frontend.onrender.com

DJANGO_LOG_LEVEL=INFO
APP_LOG_LEVEL=INFO

# Optional
REDIS_URL=
CELERY_BROKER_URL=
CELERY_RESULT_BACKEND=
```

## Step-by-Step Render Setup

### 1. Push this repository to GitHub

Render deploys from Git repositories, so make sure this project is on GitHub and includes the new root `render.yaml`.

### 2. Create the PostgreSQL database on Render

In Render:

1. Open Dashboard.
2. Click `New +`.
3. Choose `PostgreSQL`.
4. Name it something like `iles-db`.
5. Create the database.
6. After creation, copy these values:
   - database name
   - user
   - password
   - host
   - port

### 3. Create the backend web service

In Render:

1. Click `New +`.
2. Choose `Blueprint` if you want Render to read `render.yaml`.
3. Connect the GitHub repo.
4. Confirm that the service root is `backend`.
5. Let Render create the web service from `render.yaml`.

If you do not use Blueprint:

1. Click `New +`.
2. Choose `Web Service`.
3. Connect the GitHub repo.
4. Set `Root Directory` to `backend`.
5. Set Runtime to `Python`.
6. Set Build Command to `pip install -r requirements.txt`.
7. Set Pre-Deploy Command to `python manage.py collectstatic --noinput && python manage.py migrate`.
8. Set Start Command to `gunicorn config.wsgi:application`.
9. Set Health Check Path to `/health/`.

### 4. Add backend environment variables

Add these into the Render backend service environment settings:

1. `DJANGO_SETTINGS_MODULE=config.settings.prod`
2. `DJANGO_SECRET_KEY=...`
3. `DJANGO_DEBUG=False`
4. `DJANGO_ALLOWED_HOSTS=<your-backend-service>.onrender.com`
5. `DJANGO_TIME_ZONE=Africa/Kampala`
6. `POSTGRES_DB=<from Render Postgres>`
7. `POSTGRES_USER=<from Render Postgres>`
8. `POSTGRES_PASSWORD=<from Render Postgres>`
9. `POSTGRES_HOST=<from Render Postgres>`
10. `POSTGRES_PORT=5432`
11. `POSTGRES_SSLMODE=require`
12. `POSTGRES_CONN_MAX_AGE=60`
13. `CORS_ALLOWED_ORIGINS=<your frontend public URL>`
14. `CSRF_TRUSTED_ORIGINS=<your frontend public URL>`
15. `DJANGO_LOG_LEVEL=INFO`
16. `APP_LOG_LEVEL=INFO`

Only add these if you are also deploying Redis/Celery now:

17. `REDIS_URL=<your redis url>`
18. `CELERY_BROKER_URL=<same as redis url>`
19. `CELERY_RESULT_BACKEND=<same as redis url>`

### 5. Deploy the backend

After the environment variables are saved:

1. Trigger the deploy.
2. Wait for build to finish.
3. The pre-deploy step will:
   - collect static files
   - run database migrations
4. The start step will launch Gunicorn.

### 6. Test the deployed backend

After deployment, open:

- `https://your-backend-service.onrender.com/health/`
- `https://your-backend-service.onrender.com/api/docs/`

Expected result:

- `/health/` returns a success JSON response
- `/api/docs/` loads Swagger UI

### 7. Connect the frontend

In the frontend service environment:

1. Add `VITE_API_URL=https://your-backend-service.onrender.com/api/v1`
2. Redeploy the frontend

### 8. Update backend frontend-origin variables if the frontend URL changes

Any time the frontend domain changes, update both:

- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`

If you forget this step, the browser will block requests or Django will reject them.

## Final Deployment Chain

Use this as the simple mental model:

1. Browser opens frontend.
2. Frontend reads `VITE_API_URL`.
3. Frontend sends requests to Render backend.
4. Backend accepts the frontend origin because of:
   - `CORS_ALLOWED_ORIGINS`
   - `CSRF_TRUSTED_ORIGINS`
5. Backend connects to PostgreSQL because of:
   - `POSTGRES_DB`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_HOST`
   - `POSTGRES_PORT`
   - `POSTGRES_SSLMODE`
6. Render health checks `/health/`.
7. If Redis is added later, the backend and Celery connect through:
   - `REDIS_URL`
   - `CELERY_BROKER_URL`
   - `CELERY_RESULT_BACKEND`

## Readiness Result

From code inspection, the backend is structurally ready for Render.

Strong points:

- production settings exist
- Gunicorn is installed
- PostgreSQL environment-driven config exists
- static files are supported
- health endpoint exists
- frontend API base URL is configurable

One verification gap remains in this environment:

- the checked-in local `.venv` points to an inaccessible Python path, so full Django runtime checks could not be executed from this sandbox

Before your final production deploy, run this locally inside `backend` if your environment is healthy:

```bash
python manage.py check --deploy --settings=config.settings.prod
```
