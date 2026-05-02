# Changelog — ILES Front-end

All notable changes documented here. Follows [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-04-11
### Added
- Vite + React 18 scaffold
- React Router v6 with lazy-loaded routes and code splitting
- Design-system tokens (theme/tokens.js — colors, typography, spacing, breakpoints, buttonVariants)
- Axios client pre-configured for Django (http://localhost:8000/api/) with JWT interceptors
- authService.js, userService.js, internshipService.js API stubs
- Landing page: hero, role-tabs (UGX currency), promo cards, feature banners, stats, testimonials, inspire row
- Student Dashboard: live GPS clock-in, activity logbook, attendance week strip, evaluation bars, QR modal, deadlines
- Field Mentor Validation: filterable activity queue, detail/approve/reject panel, QR scanner simulation, mentee progress
- Lecturer Dashboard: cohort table, live weighted grade entry, 2nd-stage validation queue, timeline, report generation
- Administrator Panel: 8 navigable tabs (Overview, Students, Users, Companies, Periods, Placements, Reports, Audit Log)
- AuthLayout (centered card) and MainLayout (fixed sidebar + mobile hamburger)
- Login page: validation, forgot-password link, demo portal shortcuts
- Signup page: validation, role selector, success redirect
- Shared components: Button (variant-driven from tokens), Alert, Sidebar (role-aware), Card
- useAuth context hook, useToast hook
- helpers.js: formatUGX, calcWeightedScore, avatarColor, ROLE_ROUTES
- global.css: CSS variables, chip classes, responsive breakpoints (mobile ≤768px, tablet 768–1024px, desktop >1024px)
- .env.example with VITE_API_URL
- README.md with setup, Django integration, CORS, deployment notes
