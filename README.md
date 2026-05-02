# myproject

Combined workspace layout:

```text
myproject/
├── backend/
└── frontend/
```

The frontend is your supplied React app. The backend is a Django REST API designed around the same domain:

- JWT auth with roles: `student`, `mentor`, `lecturer`, `admin`
- placements, companies, internship periods
- activity logbook with mentor and lecturer approval flow
- attendance clock-in/clock-out with coordinates
- evaluations, notifications, reports, and audit logs
- PostgreSQL-first settings, Redis cache hooks, DRF pagination/search/filtering, Swagger docs, health checks, and Vercel entrypoint
