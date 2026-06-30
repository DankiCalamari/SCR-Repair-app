# Sunset Country Repairs — Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Nginx (Reverse Proxy)                            │
│                      Port 80 → Public Site / RMS / Backend               │
├──────────────────┬───────────────────────┬───────────────────────────────┤
│                  │                       │                               │
│  Public Site     │  RMS App              │  FastAPI Backend              │
│  (React + Vite)  │  (React + Vite)       │  (Python)                     │
│  Port 3000       │  Port 3001            │  Port 8000                    │
│                  │                       │                               │
│  Marketing pages │  Auth, Portal, Admin  │  API + Business Logic         │
│  No auth         │  Full auth required   │                               │
│                  │                       │                               │
├──────────────────┴───────────────────────┴───────────────────────────────┤
│                        PostgreSQL (Port 5432)                             │
└──────────────────────────────────────────────────────────────────────────┘
```

## Two Frontend Apps

### Public Site (`public-site/`)
- **Port:** 3000
- **Purpose:** Marketing pages only — no auth, no portal, no admin
- **Pages:** Home, Services, Service Areas, About, Contact, Privacy, Terms, Warranty
- **Dependencies:** React, React Router, Tailwind CSS (light theme only)
- **No:** axios, zustand, react-query

### RMS App (`rms/`)
- **Port:** 3001
- **Purpose:** Everything behind authentication
- **Pages:** Login/Register, Customer Portal, Admin Dashboard
- **Dependencies:** Full stack — axios, zustand, react-query, light + dark themes
- **Document workflow:** Users upload their own quotes/invoices/PDFs; the app sends them out (email/SMS). No document generation.

## Folder Structure

```
sunset-country-repairs/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── ARCHITECTURE.md
│
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── logging_config.py
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── customer.py
│   │   ├── device.py
│   │   ├── repair.py
│   │   ├── photo.py
│   │   ├── document.py
│   │   ├── quote.py
│   │   ├── invoice.py
│   │   ├── sms.py
│   │   ├── email.py
│   │   ├── warranty.py
│   │   ├── lead.py
│   │   └── audit_log.py
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── customer.py
│   │   ├── device.py
│   │   ├── repair.py
│   │   ├── photo.py
│   │   ├── document.py
│   │   ├── quote.py
│   │   ├── invoice.py
│   │   ├── sms.py
│   │   ├── email.py
│   │   ├── warranty.py
│   │   ├── lead.py
│   │   └── audit_log.py
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── customers.py
│   │   │   ├── devices.py
│   │   │   ├── repairs.py
│   │   │   ├── photos.py
│   │   │   ├── documents.py
│   │   │   ├── quotes.py
│   │   │   ├── invoices.py
│   │   │   ├── sms.py
│   │   │   ├── email.py
│   │   │   ├── warranty.py
│   │   │   ├── leads.py
│   │   │   ├── dashboard.py
│   │   │   ├── system_health.py
│   │   │   └── admin.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── customer_service.py
│   │   ├── repair_service.py
│   │   ├── quote_service.py
│   │   ├── invoice_service.py
│   │   ├── sms_service.py
│   │   ├── email_service.py
│   │   ├── document_service.py
│   │   ├── photo_service.py
│   │   ├── warranty_service.py
│   │   ├── lead_service.py
│   │   ├── audit_service.py
│   │   └── storage_service.py
│   │
│   ├── integrations/
│   │   ├── __init__.py
│   │   ├── sms_gate.py
│   │   ├── smtp_client.py
│   │   └── imap_client.py
│   │
│   ├── migrations/
│   │   ├── env.py
│   │   └── versions/
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_customers.py
│   │   ├── test_repairs.py
│   │   ├── test_quotes.py
│   │   └── test_invoices.py
│   │
│   └── seed/
│       └── seed_data.py
│
├── public-site/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   │
│   ├── public/
│   │   ├── favicon.svg
│   │   └── logo.svg
│   │
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       │
│       ├── lib/
│       │   ├── utils.ts
│       │   └── constants.ts
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── PublicNavbar.tsx
│       │   │   └── PublicFooter.tsx
│       │   └── ui/
│       │       └── Modal.tsx
│       │
│       └── pages/public/
│           ├── HomePage.tsx
│           ├── ServicesPage.tsx
│           ├── ServiceAreasPage.tsx
│           ├── AboutPage.tsx
│           ├── ContactPage.tsx
│           ├── PrivacyPage.tsx
│           ├── TermsPage.tsx
│           └── WarrantyPage.tsx
│
└── rms/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    │
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        │
        ├── api/
        │   ├── client.ts
        │   ├── auth.ts
        │   ├── customers.ts
        │   ├── repairs.ts
        │   ├── quotes.ts
        │   ├── invoices.ts
        │   ├── documents.ts
        │   ├── photos.ts
        │   ├── sms.ts
        │   ├── email.ts
        │   ├── warranty.ts
        │   ├── leads.ts
        │   └── dashboard.ts
        │
        ├── components/
        │   ├── layout/
        │   │   └── AdminSidebar.tsx
        │   ├── ui/
        │   │   └── Modal.tsx
        │   ├── photos/
        │   │   ├── PhotoGallery.tsx
        │   │   └── PhotoUploader.tsx
        │   └── admin/
        │       ├── QuoteDetailModal.tsx
        │       ├── InvoiceDetailModal.tsx
        │       └── NewQuoteModal.tsx
        │       └── NewInvoiceModal.tsx
        │
        ├── pages/
        │   ├── auth/
        │   │   ├── LoginPage.tsx
        │   │   └── RegisterPage.tsx
        │   │
        │   ├── portal/
        │   │   ├── PortalDashboardPage.tsx
        │   │   ├── PortalRepairDetailPage.tsx
        │   │   └── PortalProfilePage.tsx
        │   │
        │   └── admin/
        │       ├── AdminDashboardPage.tsx
        │       ├── AdminRepairsPage.tsx
        │       ├── AdminCustomersPage.tsx
        │       ├── AdminQuotesPage.tsx
        │       ├── AdminInvoicesPage.tsx
        │       ├── AdminSmsPage.tsx
        │       ├── AdminEmailPage.tsx
        │       ├── AdminWarrantyPage.tsx
        │       ├── AdminLeadsPage.tsx
        │       ├── AdminSystemHealthPage.tsx
        │       ├── AdminRepairDetailPage.tsx
        │       ├── AdminCustomerDetailPage.tsx
        │       └── AdminSettingsPage.tsx
        │
        ├── hooks/
        │   ├── use-favicon.ts
        │   └── ...
        │
        ├── lib/
        │   ├── utils.ts
        │   └── constants.ts
        │
        ├── store/
        │   └── auth-store.ts
        │
        └── types/
            └── index.ts
```

## API Routes

```
/api/v1/
├── /auth
│   ├── POST   /login
│   ├── POST   /register
│   ├── POST   /refresh
│   ├── POST   /logout
│   └── GET    /me
│
├── /customers
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── DELETE /:id
│   ├── GET    /:id/repairs
│   ├── GET    /:id/timeline
│   └── GET    /:id/devices
│
├── /devices
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   └── DELETE /:id
│
├── /repairs
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── PATCH  /:id/status
│   ├── GET    /:id/timeline
│   ├── GET    /:id/photos
│   ├── POST   /:id/photos
│   ├── GET    /:id/documents
│   ├── GET    /:id/communications
│   └── DELETE /:id
│
├── /quotes
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── POST   /:id/approve
│   ├── POST   /:id/decline
│   ├── POST   /:id/send
│   └── POST   /:id/upload-pdf
│
├── /invoices
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── POST   /:id/send
│   ├── POST   /:id/mark-paid
│   └── POST   /:id/upload-pdf
│
├── /documents
│   ├── GET    /
│   ├── POST   /upload
│   └── GET    /:id/download
│
├── /sms
│   ├── GET    /
│   ├── POST   /send
│   ├── POST   /webhook
│   ├── GET    /gateway-status
│   ├── POST   /test
│   └── GET    /templates
│
├── /email
│   ├── GET    /
│   ├── POST   /send
│   ├── POST   /test
│   ├── GET    /status
│   └── POST   /sync
│
├── /warranty
│   ├── GET    /
│   ├── GET    /:id
│   ├── POST   /:id/claim
│   └── GET    /:id/validate
│
├── /leads
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── POST   /:id/convert
│   └── DELETE /:id
│
├── /dashboard
│   ├── GET    /widgets
│   ├── GET    /stats
│   └── GET    /recent-activity
│
├── /system-health
│   ├── GET    /
│   ├── GET    /database
│   ├── GET    /sms-gateway
│   ├── GET    /smtp
│   ├── GET    /imap
│   └── GET    /webhooks
│
└── /admin
    ├── GET    /users
    ├── POST   /users
    ├── PUT    /users/:id
    ├── DELETE /users/:id
    ├── GET    /audit-logs
    └── PUT    /settings
```

## Frontend Routes

### Public Site (port 3000)
```
/               → Home
/services       → Services
/service-areas  → Service Areas
/about          → About
/contact        → Contact
/privacy        → Privacy Policy
/terms          → Terms
/warranty       → Warranty Info
```

### RMS App (port 3001)
```
/login                  → Login
/register               → Register

/portal                 → Customer Dashboard
/portal/repairs/:id     → Repair Detail
/portal/profile         → Profile

/admin                  → Admin Dashboard
/admin/repairs          → Repair Management
/admin/customers        → Customer Management
/admin/quotes           → Quote Management
/admin/invoices         → Invoice Management
/admin/sms              → SMS Management
/admin/email            → Email Management
/admin/warranty         → Warranty Management
/admin/leads            → Lead Management
/admin/system-health    → System Health
/admin/settings         → Settings
```

## Database Schema (Tables)

```
users
customers
devices
repairs
repair_status_history
photos
documents
quotes
quote_approvals
invoices
invoice_items
sms_messages
emails
warranty_records
warranty_claims
audit_logs
leads
system_settings
repair_photos (junction)
repair_documents (junction)
```

## Authentication Flow

```
1. User logs in with email + password
2. Server returns access_token (JWT, 15min) + refresh_token (7 days)
3. Access token sent in Authorization header
4. On 401, client uses refresh token to get new access token
5. Refresh tokens stored in httpOnly cookies
6. Role-based access: admin, staff, customer
```

## Repair Workflow

```
Lead → Device Received → Diagnosing → Waiting For Customer
    → Waiting For Parts → In Progress → Repaired
    → Ready For Collection → Completed

Any active status → Cancelled
```

## Document Workflow

Quotes and invoices are **uploaded by the user** (not generated by the app). The app provides:
- Upload PDF for quotes and invoices
- Upload general documents to repairs
- Send quotes/invoices via email or SMS
- Download documents for viewing
