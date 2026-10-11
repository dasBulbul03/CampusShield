# 🛡️ CampusShield

**Your Safety. Your Voice. Your Campus.**

CampusShield is an AI-powered campus safety and grievance management platform built for the VIBE-A-THON. It enables students to safely report incidents, leverages Google Gemini AI for intelligent analysis and prioritization, and provides administrators with a complete workflow to investigate and resolve complaints transparently.

## Features

- **Safe Incident Reporting**: Students can report campus incidents with detailed descriptions, locations, dates, and evidence uploads
- **Anonymous Reporting**: Option to submit complaints anonymously while maintaining full tracking functionality
- **AI-Powered Analysis**: Gemini AI analyzes complaints to recommend category, severity, priority, department routing, risk factors, and next actions
- **Smart Fallback**: Deterministic keyword-based fallback classifier ensures the system works even if Gemini API is unavailable
- **Transparent Tracking**: Visual timeline showing complaint progress from submission to resolution
- **Role-Based Access Control**: Separate dashboards for students and administrators with JWT authentication
- **Admin Management**: Review AI recommendations, override decisions, assign departments, update status, and add investigation notes
- **Analytics Dashboard**: Visual insights into complaints by category, severity, and status
- **In-App Notifications**: Automatic notifications when complaint status changes
- **Post-Resolution Feedback**: Students can rate and provide feedback after complaints are resolved
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- React Router DOM
- Axios
- React Toastify
- Recharts
- Lucide React

### Backend
- Python 3.11 + FastAPI
- SQLAlchemy ORM
- Alembic (migrations - the app does **not** auto-create tables at startup)
- PostgreSQL
- Pydantic
- JWT Authentication
- Google Gemini API
- pytest (see `backend/tests/`)

### Frontend tooling
- ESLint (flat config) + `npm run lint`

### DevOps
- Docker & Docker Compose
- GitHub Actions (`.github/workflows/ci.yml`) - backend tests + frontend lint/build

## AI Architecture

CampusShield uses a safety-first AI approach:

- **System Prompt Guardrails**: Explicit instructions to never determine guilt, make legal judgments, or invent facts
- **Enum-Validated Output**: Returned `category` / `severity` / `priority` are checked against allow-lists; anything invalid triggers the fallback instead of a 500 or bad data
- **Human-in-the-Loop**: AI provides recommendations only; administrators have full override capability
- **Graceful Degradation**: Automatic fallback to rule-based classifier if AI is unavailable, returns garbage, or is misconfigured
- **Transparent Operation**: UI clearly indicates "AI Recommended" vs "Admin Decision" and whether fallback was used

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository
2. Navigate to the project directory
3. Create environment files

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

4. *(Optional)* Add your Gemini API key — see [Gemini API key](#gemini-api-key-optional) below.
   Skipping this is fine: the app starts and analysis uses the built-in fallback classifier.

5. Start all services:
```bash
docker compose up --build
```

6. Access the application:
- Frontend: http://localhost:8080
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health · readiness: http://localhost:8000/health/ready

### Gemini API key (optional)

**No key ships with this repository.** `GEMINI_API_KEY` is empty in every
`.env.example`, empty by default in `app/core/config.py`, and empty by default in
`docker-compose.yml`. Whoever deploys CampusShield supplies their own.

| | |
|---|---|
| **Key left empty** | App starts normally. Complaint analysis uses the deterministic keyword-based fallback classifier. The API logs a `WARNING` at startup so it is not silently ignored. |
| **Key set** | Analysis goes to Gemini, with enum validation and automatic fallback if Gemini returns anything invalid or unavailable. |

To enable Gemini:

1. Create a key at https://aistudio.google.com/apikey
2. Paste it into your local `.env` and/or `backend/.env`:

```bash
GEMINI_API_KEY=<your key>
GEMINI_MODEL=gemini-3.8-flash
```

> `.env` files are gitignored; `.env.example` files are not. **Never put a real
> key in an `.env.example`, a Dockerfile, docker-compose.yml, or any `VITE_*`
> variable** — Vite inlines `VITE_*` values into the public JS bundle, so a
> secret there would ship to every browser.

If you still have a placeholder `SECRET_KEY`, the API also warns at startup:
JWTs signed with a publicly known secret are forgeable.

### Local Development

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head      # create the schema (required - the app does not call create_all)
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Tests
```bash
# Backend (pytest runs against SQLite and applies the real migrations)
cd backend
pip install -r requirements-dev.txt
pytest

# Frontend
cd frontend
npm run lint
npm run build
```

> Schema changes are owned by Alembic. After editing a model, generate a revision
> with `alembic revision --autogenerate -m "..."` and review it before applying.

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Student | student@campusshield.demo | student123 |
| Admin | admin@campusshield.demo | admin123 |

## Demo Flow

1. Login as Student → Submit incident: "A senior student has repeatedly threatened me near the hostel gate after 8 PM. I am afraid to go there alone."
2. System generates complaint ID → Click "Let AI Analyze" → AI classifies as THREAT/HIGH with P2 priority, routes to Campus Security
3. Login as Admin → View complaint with AI analysis → Assign to Campus Security, override if needed → Update status through investigation timeline → Resolve
4. Student sees RESOLVED status → Can leave feedback (rating 1-5)

## Project Structure

```
CAMPUSSHIELD/
├── .github/workflows/      # CI (backend tests, frontend lint + build)
├── backend/
│   ├── app/
│   │   ├── api/v1/        # API routes (auth, complaints, admin, notifications)
│   │   ├── core/          # Config, constants, security
│   │   ├── db/            # Database setup, seed data
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # Business logic (AI service)
│   ├── alembic/           # Database migrations
│   ├── tests/             # pytest suite
│   ├── entrypoint.sh      # `alembic upgrade head` then uvicorn
│   ├── Dockerfile
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # Auth context
│   │   ├── pages/         # Page components (public, auth, student, admin)
│   │   ├── services/      # API service
│   │   └── styles/        # Global styles
│   ├── eslint.config.js
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── PLAN.md
└── README.md
```

## Key Principles

- **AI Assists, Humans Decide**: Never represented as confirmed facts - always "AI Recommended"
- **Safety First**: Explicit guardrails prevent harmful AI outputs
- **Privacy Conscious**: Anonymous reporting with proper data handling
- **Demo-Ready, Not Production-Claimed**: Polished enough to demo; see limitations below
- **Minimal & Focused**: Built specifically for hackathon time constraints

## Security Notes & Known Limitations

This is a demo/hackathon build. Before putting it in front of real users:

- **Seed the demo users are created on startup.** Remove or gate `app/db/init_db.py`
  seeding for any real environment.
- **No rate limiting, email verification, or password reset.** JWTs expire after
  30 minutes and cannot be revoked.
- **Uploaded evidence is stored on local disk** with extension and size checks only -
  no malware scanning. Files are served through an owner-or-admin endpoint, not
  as public statics, but this is not a substitute for object storage + scanning.
- **Complaint status transitions are not enforced** - an admin can jump straight to
  `RESOLVED`.
- **Anonymous reports still store the reporter's `student_id`** so they can track
  their own complaint; the association exists in the database.
- **`docker-compose.yml` is a local topology** - no TLS termination and CORS is
  limited to localhost origins.

Full notes live in `PLAN.md` under "Known Limitations".

## Future Enhancements

- Email/SMS notifications
- Advanced analytics with trends
- File type scanning
- Multi-language support
- Mobile app (React Native)

---

**Built with ❤️ for safer campuses**
