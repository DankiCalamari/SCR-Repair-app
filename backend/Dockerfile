FROM python:3.12-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    libpangoft2-1.0-0 \
    libxml2 \
    libxslt1.1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN mkdir -p /app/uploads/photos /app/uploads/documents /app/uploads/invoices /app/uploads/warranties

# ── Build frontends ─────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

# Build public-site
WORKDIR /build/public-site
COPY public-site/package.json public-site/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY public-site/ ./
RUN npm run build

# Build RMS
WORKDIR /build/rms
COPY rms/package.json rms/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY rms/ ./
RUN npm run build

# ── Final image ─────────────────────────────────────────────────────────
FROM base AS final

COPY --from=frontend-build /build/public-site/dist /app/public-site/dist
COPY --from=frontend-build /build/rms/dist /app/rms/dist

EXPOSE 8000

# Use asyncio loop explicitly to avoid IPv6-only binding issues on macOS
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--loop", "asyncio"]
