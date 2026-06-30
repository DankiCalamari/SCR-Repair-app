# Sunset Country Repairs

A full-stack repair shop management application for **Sunset Country Repairs**, a device repair business based in Mildura, Victoria. It provides a public marketing site, a customer portal for tracking repairs, and an admin dashboard for managing repairs, customers, quotes, invoices, SMS/email, warranties, and leads.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker)](#quick-start-docker)
- [Manual Setup (Development)](#manual-setup-development)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [License](#license)

---

## Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Nginx   │────▶│ Frontend │     │ Backend  │
│  :80/443 │     │  :3000   │     │  :8000   │
│          │────▶│          │────▶│          │
│          │     └──────────┘     └────┬─────┘
└──────────┘                           │
                                  ┌────▼─────┐
                                  │PostgreSQL│
                                  │  :5432   │
                                  └──────────┘
```

- **Nginx** — Reverse proxy, serves static frontend, routes `/api/*` to backend
- **Frontend** — React SPA (Vite + Tailwind CSS), customer portal + admin dashboard
- **Backend** — FastAPI (Python), async REST API with JWT auth
- **Database** — PostgreSQL 16 with SQLAlchemy (async via `asyncpg`)

---

## Tech Stack

| Layer        | Technology                                          |
|--------------|-----------------------------------------------------|
| Frontend     | React 18, TypeScript, Vite, Tailwind CSS            |
| State Mgmt   | Zustand (auth), TanStack Query (server state)       |
| Backend      | Python 3.12, FastAPI, SQLAlchemy 2.0 (async)        |
| Database     | PostgreSQL 16, Alembic (migrations)                 |
| Auth         | JWT (access + refresh tokens), bcrypt               |
| SMS          | External SMS gateway integration                    |
| Email        | SMTP (send) + IMAP (receive) via `aiosmtplib`/`aioimaplib` |
| PDF Gen      | WeasyPrint, ReportLab                               |
| Containers   | Docker, Docker Compose                              |
| Reverse Proxy| Nginx                                               |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) — for containerised setup
- [Node.js](https://nodejs.org/) 20+ & npm — for frontend development
- [Python](https://www.python.org/) 3.12+ & pip — for backend development

---

## Quick Start (Docker)

The fastest way to run the entire stack locally.

### 1. Clone the repository

```bash
git clone https://github.com/DankiCalamari/scr-app-final/
cd sunset-country-repairs
```

### 2. Create the environment file

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
POSTGRES_PASSWORD=your-secure-password
APP_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
```

### 3. Build and start all services

```bash
docker compose up --build -d
```

This starts four containers:

| Service    | Port  | Description                        |
|------------|-------|------------------------------------|
| `nginx`    | 80    | Reverse proxy (main entry point)   |
| `frontend` | 3000  | React SPA (internal)               |
| `backend`  | 8000  | FastAPI (internal)                 |
| `db`       | 5432  | PostgreSQL 16                      |

### 4. Access the application

- **Public site:** <http://localhost>
- **Customer portal:** <http://localhost/portal>
- **Admin dashboard:** <http://localhost/admin>
- **API docs (Swagger):** <http://localhost/api/docs> *(only when `APP_DEBUG=true`)*

### 5. Useful Docker commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop all services
docker compose down

# Stop and remove volumes (⚠ deletes database data)
docker compose down -v

# Rebuild after code changes
docker compose up --build -d backend
```

---

## Manual Setup (Development)

For active development you may want to run the backend and frontend outside Docker.

### Backend

#### 1. Create a virtual environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows
```

#### 2. Install dependencies

```bash
pip install -r requirements.txt
```

#### 3. Set up PostgreSQL

Ensure PostgreSQL is running locally (or use the Docker database):

```bash
docker compose up -d db
```

Create a `.env` file in the project root (see [Environment Variables](#environment-variables)).

#### 4. Run database migrations

```bash
cd backend
alembic upgrade head
```

#### 5. Start the development server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at <http://localhost:8000>.

### Frontend

#### 1. Install dependencies

```bash
cd frontend
npm install
```

#### 2. Start the dev server

```bash
npm run dev
```

The frontend will be available at <http://localhost:3000> with hot module replacement. API requests to `/api/*` are proxied to the backend on port 8000.

#### 3. Build for production

```bash
npm run build
```

Output goes to `frontend/dist/`.

#### 4. Preview production build locally

```bash
npm run preview
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

### Required

| Variable              | Description                          | Example                    |
|-----------------------|--------------------------------------|----------------------------|
| `POSTGRES_HOST`       | Database host                        | `db` (Docker) / `localhost`|
| `POSTGRES_PORT`       | Database port                        | `5432`                     |
| `POSTGRES_DB`         | Database name                        | `sunset_repairs`           |
| `POSTGRES_USER`       | Database user                        | `sunset_user`              |
| `POSTGRES_PASSWORD`   | Database password                    | *(choose a strong one)*    |
| `APP_SECRET_KEY`      | General app secret (64+ chars)       | *(generate randomly)*      |
| `JWT_SECRET_KEY`      | JWT signing secret                   | *(generate randomly)*      |

### Optional — Email (SMTP/IMAP)

| Variable          | Description              | Default |
|-------------------|--------------------------|---------|
| `SMTP_HOST`       | SMTP server hostname     | `smtp.gmail.com` |
| `SMTP_PORT`       | SMTP port                | `587`   |
| `SMTP_USER`       | SMTP username            | —       |
| `SMTP_PASSWORD`   | SMTP password            | —       |
| `SMTP_FROM_EMAIL` | Sender email address     | `repairs@sunsetcountry.com.au` |
| `SMTP_FROM_NAME`  | Sender display name      | `Sunset Country Repairs` |
| `IMAP_HOST`       | IMAP server hostname     | `imap.gmail.com` |
| `IMAP_PORT`       | IMAP port                | `993`   |
| `IMAP_USER`       | IMAP username            | —       |
| `IMAP_PASSWORD`   | IMAP password            | —       |

### Optional — SMS Gateway

| Variable             | Description                   | Default |
|----------------------|-------------------------------|---------|
| `SMS_GATEWAY_URL`    | SMS gateway API endpoint      | —       |
| `SMS_DEVICE_ID`      | Gateway device ID             | —       |
| `SMS_API_KEY`        | Gateway API key               | —       |
| `SMS_WEBHOOK_SECRET` | Webhook verification secret   | —       |

### Optional — AWS S3 Storage

| Variable                 | Description        | Default |
|--------------------------|--------------------|---------|
| `STORAGE_TYPE`           | `local` or `s3`   | `local` |
| `AWS_ACCESS_KEY_ID`      | AWS access key     | —       |
| `AWS_SECRET_ACCESS_KEY`  | AWS secret key     | —       |
| `AWS_S3_BUCKET`          | S3 bucket name     | —       |
| `AWS_S3_REGION`          | AWS region         | —       |

### Application Settings

| Variable                          | Description                    | Default |
|-----------------------------------|--------------------------------|---------|
| `APP_NAME`                        | Application name               | `Sunset Country Repairs` |
| `APP_ENV`                         | `development` or `production`  | `production` |
| `APP_DEBUG`                       | Enable debug mode / API docs   | `false` |
| `APP_URL`                         | Public application URL         | `http://localhost` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime          | `15`    |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS`   | Refresh token lifetime         | `7`     |
| `LOG_LEVEL`                       | Logging level                  | `INFO`  |

---

## Database Migrations

Migrations are managed with [Alembic](https://alembic.sqlalchemy.org/).

```bash
# After model changes, auto-generate a migration
alembic revision --autogenerate -m "description of changes"

# Apply all pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# View current revision
alembic current

# View migration history
alembic history --verbose
```

---

## Project Structure

```
sunset-country-repairs/
├── .env.example              # Environment variable template
├── .gitignore
├── docker-compose.yml        # Docker orchestration
├── ARCHITECTURE.md           # Detailed architecture docs
│
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── config.py             # Pydantic settings (loads .env)
│   ├── database.py           # SQLAlchemy engine & session factory
│   ├── logging_config.py     # Structured logging (structlog)
│   ├── requirements.txt      # Python dependencies
│   ├── Dockerfile
│   ├── alembic.ini           # Alembic configuration
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py           # FastAPI dependencies (auth, DB)
│   │   └── v1/               # API version 1 routers
│   │       ├── __init__.py
│   │       ├── auth.py
│   │       ├── customers.py
│   │       ├── repairs.py
│   │       ├── quotes.py
│   │       ├── invoices.py
│   │       ├── sms.py
│   │       ├── email.py
│   │       ├── warranty.py
│   │       ├── leads.py
│   │       ├── dashboard.py
│   │       └── ...
│   ├── models/               # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── customer.py
│   │   ├── device.py
│   │   ├── repair.py
│   │   ├── quote.py
│   │   ├── invoice.py
│   │   ├── sms.py
│   │   ├── email.py
│   │   ├── warranty.py
│   │   ├── lead.py
│   │   └── ...
│   └── migrations/           # Alembic migration scripts
│       └── versions/
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx          # React entry point
│   │   ├── App.tsx           # Router & route guards
│   │   ├── api/              # API client functions (axios)
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── repairs.ts
│   │   │   └── ...
│   │   ├── store/            # Zustand stores
│   │   │   └── auth-store.ts
│   │   ├── types/            # TypeScript type definitions
│   │   │   └── index.ts
│   │   ├── lib/              # Utilities & constants
│   │   │   ├── utils.ts
│   │   │   └── constants.ts
│   │   └── pages/
│   │       ├── public/       # Public marketing pages
│   │       │   ├── HomePage.tsx
│   │       │   ├── ServicesPage.tsx
│   │       │   ├── ServiceAreasPage.tsx
│   │       │   ├── AboutPage.tsx
│   │       │   ├── ContactPage.tsx
│   │       │   ├── PrivacyPage.tsx
│   │       │   ├── TermsPage.tsx
│   │       │   └── WarrantyPage.tsx
│   │       ├── auth/         # Login & registration
│   │       │   ├── LoginPage.tsx
│   │       │   └── RegisterPage.tsx
│   │       ├── portal/       # Customer portal
│   │       │   ├── PortalDashboardPage.tsx
│   │       │   ├── PortalRepairDetailPage.tsx
│   │       │   └── PortalProfilePage.tsx
│   │       └── admin/        # Admin dashboard
│   │           ├── AdminDashboardPage.tsx
│   │           ├── AdminRepairsPage.tsx
│   │           ├── AdminCustomersPage.tsx
│   │           ├── AdminQuotesPage.tsx
│   │           ├── AdminInvoicesPage.tsx
│   │           ├── AdminSmsPage.tsx
│   │           ├── AdminEmailPage.tsx
│   │           ├── AdminWarrantyPage.tsx
│   │           ├── AdminLeadsPage.tsx
│   │           ├── AdminSystemHealthPage.tsx
│   │           └── AdminSettingsPage.tsx
│   ├── package.json
│   ├── vite.config.ts        # Vite config + API proxy
│   ├── tsconfig.json
│   └── Dockerfile
│
└── nginx/
    ├── nginx.conf            # Production reverse proxy config
    └── Dockerfile
```

---

## API Documentation

When `APP_DEBUG=true`, interactive API documentation is available at:

- **Swagger UI:** <http://localhost/api/docs>
- **ReDoc:** <http://localhost/api/redoc>

### Auth

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are obtained via `POST /api/v1/auth/login` and refreshed via `POST /api/v1/auth/refresh`.

### Key Endpoints

| Method   | Endpoint                          | Description                    | Auth       |
|----------|-----------------------------------|--------------------------------|------------|
| `POST`   | `/api/v1/auth/login`              | Login (email + password)       | Public     |
| `POST`   | `/api/v1/auth/register`           | Register new customer account  | Public     |
| `GET`    | `/api/v1/auth/me`                 | Get current user profile       | Any        |
| `GET`    | `/api/v1/repairs`                 | List repairs (paginated)       | Staff+     |
| `POST`   | `/api/v1/repairs`                 | Create a repair                | Staff+     |
| `GET`    | `/api/v1/repairs/{id}`            | Get repair details             | Staff+     |
| `PATCH`  | `/api/v1/repairs/{id}/status`     | Update repair status           | Staff+     |
| `GET`    | `/api/v1/customers`               | List customers (paginated)     | Staff+     |
| `GET`    | `/api/v1/customers/{id}`          | Get customer with repairs      | Staff+     |
| `GET`    | `/api/v1/quotes`                  | List quotes (paginated)        | Staff+     |
| `POST`   | `/api/v1/quotes/{id}/approve`     | Approve a quote                | Customer   |
| `POST`   | `/api/v1/quotes/{id}/decline`     | Decline a quote                | Customer   |
| `GET`    | `/api/v1/invoices`                | List invoices (paginated)      | Staff+     |
| `POST`   | `/api/v1/invoices/{id}/pay`       | Mark invoice as paid           | Staff+     |
| `GET`    | `/api/v1/sms`                     | List SMS messages              | Staff+     |
| `POST`   | `/api/v1/sms`                     | Send an SMS                    | Staff+     |
| `GET`    | `/api/v1/email`                   | List email messages            | Staff+     |
| `POST`   | `/api/v1/email`                   | Send an email                  | Staff+     |
| `GET`    | `/api/v1/warranties`              | List warranties                | Staff+     |
| `GET`    | `/api/v1/warranties/validate/{n}` | Validate a warranty number     | Public     |
| `GET`    | `/api/v1/leads`                   | List leads (paginated)         | Staff+     |
| `POST`   | `/api/v1/leads/{id}/convert`      | Convert lead to repair         | Staff+     |
| `GET`    | `/api/v1/dashboard/stats`         | Dashboard statistics           | Staff+     |
| `GET`    | `/health`                         | Health check                   | Public     |

---

## Deployment

### Docker (recommended)

1. Clone the repo on your server.
2. Copy `.env.example` to `.env` and configure production values.
3. Run `docker compose up --build -d`.
4. Nginx exposes port 80 — point your domain's DNS to the server.

### Production Checklist

- [ ] Change all default passwords and secrets in `.env`
- [ ] Set `APP_ENV=production` and `APP_DEBUG=false`
- [ ] Configure SMTP credentials for email notifications
- [ ] Configure SMS gateway credentials
- [ ] Set up SSL/TLS certificates (Let's Encrypt via Certbot)
- [ ] Configure regular database backups
- [ ] Set up log rotation for Docker container logs
- [ ] Restrict CORS origins in `backend/main.py` (replace `allow_origins=["*"]`)

### GitHub Actions CI (suggested)

Add a workflow to run tests and type checks on push:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r backend/requirements.txt
      - run: cd backend && python -m pytest

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: cd frontend && npm ci
      - run: cd frontend && npx tsc --noEmit
      - run: cd frontend && npm run build
```

---

## License

This project is proprietary software for Sunset Country Repairs. All rights reserved.
