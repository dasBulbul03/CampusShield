# CampusShield - Implementation Plan

## Overview
AI-powered campus safety and grievance management platform with student & admin workflows, AI-assisted incident analysis using Gemini API, and full Docker deployment.

## PHASE 1: Project Structure & Setup ✓
- [x] Inspect workspace
- [x] Create implementation plan
- [x] Create monorepo structure (frontend + backend)

## PHASE 2: Backend + Database + Auth ✓
- [x] FastAPI app setup
- [x] SQLAlchemy models (users, complaints, complaint_analysis, etc.)
- [x] Alembic migrations
- [x] JWT auth with RBAC (student/admin)
- [x] Password hashing
- [x] Auth endpoints

## PHASE 3: Complaint Creation & Retrieval ✓
- [x] Complaint model & CRUD
- [x] Complaint endpoints (create, get, list)
- [x] Anonymous reporting
- [x] Evidence upload (local storage)
- [x] Complaint tracking

## PHASE 4: Gemini AI Integration ✓
- [x] AI service with prompt safety
- [x] Structured JSON response validation
- [x] Deterministic fallback classifier
- [x] Analysis endpoints

## PHASE 5: Student UI ✓
- [x] Landing page
- [x] Login/Register
- [x] Student dashboard
- [x] Report incident form
- [x] Complaint tracking/timeline
- [x] View complaint details

## PHASE 6: Admin UI ✓
- [x] Admin dashboard
- [x] Complaint list (filters/sort/pagination)
- [x] Complaint detail with controls
- [x] Assign, update status, override AI, add notes

## PHASE 7: Connect Workflows ✓
- [x] Wire frontend to backend APIs
- [x] Auth context
- [x] Role-based routing
- [x] Notifications
- [x] Status updates

## PHASE 8: Analytics, Notifications & Feedback ✓
- [x] Analytics charts (category/severity/status)
- [x] In-app notifications (bell + list + mark-read)
- [x] Post-resolution feedback (rating 1-5)

## PHASE 9: Dockerization ✓
- [x] Frontend Dockerfile (Vite build + nginx)
- [x] Backend Dockerfile
- [x] docker-compose.yml (frontend, backend, postgres)
- [x] .env.example

## PHASE 10: Testing & Verification ✓
- [x] Backend pytest suite (auth, RBAC, complaints, evidence, AI fallback, feedback, notifications)
- [x] AI fallback test
- [x] Auth & RBAC test
- [x] Frontend ESLint + production build

## PHASE 11: Polish ✓
- [x] Responsive design
- [x] Loading/error states
- [x] Seed/demo data
- [x] README with docs

---

## Hardening Waves

Post-MVP cleanup, executed in priority order. Each wave was verified with an
automated check script before moving on.

### P0 - Correctness
- [x] Report confirmation shows the real complaint ID (`complaintNumber` from the API response)
- [x] `incident_date` is parsed and persisted instead of silently dropped
- [x] Favicon / PWA icon added (`frontend/public/shield.svg`)
- [x] Gemini enum validation - a hallucinated `category`/`severity`/`priority` can no longer 500 or
  poison the database; it falls back to the deterministic classifier

### P1 - Security
- [x] Evidence upload: extension whitelist, 10MB size limit, empty-file rejection, server-generated
  random filenames
- [x] Uploaded files are no longer served as public statics - `GET /api/v1/complaints/{id}/evidence/{eid}`
  enforces owner-or-admin access with correct 401/403/404 semantics
- [x] Compose `SECRET_KEY` no longer hardcoded in plain text (override via env)
- [x] `.gitignore` tightened (`.env.*`, caches, `uploads/*`)

### P2 - Product completeness
- [x] Notification endpoints (`GET /`, `POST /{id}/read`, `POST /read-all`) with unread counts
- [x] Notification bell component in both layouts (30s poll, badge, mark-all-read)
- [x] Feedback gated to `RESOLVED` only, single-submission, rating 1-5; detail response embeds it

### P3 - Engineering hygiene
- [x] Real ESLint (flat config) replacing the `echo 'lint ok'` stub; 0 errors
- [x] Frontend 401 interceptor - expired tokens redirect to login instead of dead pages
- [x] Error states on every data-loading page (`LoadError` + retry)
- [x] Admin complaint list: server-side pagination, `status`/`priority`/`category`/`search` filters,
  debounced search, page reset on filter change
- [x] Backend pytest suite (43 tests) + `pytest.ini` + `requirements-dev.txt`
- [x] Alembic initial migration; `Base.metadata.create_all` removed from startup - schema is now
  owned by `alembic upgrade head`
- [x] Container entrypoint runs migrations before Uvicorn
- [x] GitHub Actions CI (backend tests, frontend lint + build)
- [x] `PLAN.md` / `README.md` updated to match reality

---

## Known Limitations

Documented deliberately so they are not mistaken for oversight:

1. **Status transitions are not enforced.** An admin can move a complaint from
   `SUBMITTED` straight to `RESOLVED`, skipping AI analysis and investigation.
   A transition matrix would be the next backend change.
2. **No rate limiting, email verification, or password reset.** Auth is JWT-only
   with a 30-minute expiry and no revocation list.
3. **Evidence is stored on local disk** with no malware/type scanning beyond the
   extension and size checks. Object storage + scanning would be required for
   a real deployment.
4. **Anonymous reports still store `student_id`** so the owner can track their own
   complaint. Admins see the student name unless `anonymous` is set, but the
   association exists in the database.
5. **Demo credentials are seeded** (`admin@campusshield.demo` / `student@campusshield.demo`).
   These must be removed or the seeding gated for any non-demo environment.
6. **No TLS termination or hardened CORS** in the compose file - it is a local
   development topology.

## Final Deliverable
Working CampusShield MVP with Docker Compose, a passing backend test suite, a
clean frontend lint/build, and CI.
