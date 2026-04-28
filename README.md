# Plimsoll / Supply Chain Maritime Intelligence

Plimsoll is a supply chain and maritime intelligence platform built to support risk analysis, compliance checks, document understanding, financial hedging, and route visualization for maritime operations.

This repository contains:
- `backend/` — FastAPI service, worker, data ingestion scripts, analytics, compliance, and knowledge-base integrations.
- `frontend/` — Next.js UI for interactive risk dashboards, route exploration, document review, and demo workflows.
- `docker-compose.yml` — local development stack with Postgres, Redis, PgBouncer, backend, worker, and optional frontend.

## Key capabilities

- Maritime route analytics and risk scoring
- Compliance reporting and document analysis
- Market risk and hedging strategy endpoints
- Knowledge base search with vector embeddings
- Demo session and WebSocket replay support
- Modular backend services for API, worker, and ingestion pipelines

## Repository layout

```text
.
├── backend/               # FastAPI service, worker, scripts, tests, shared modules
├── frontend/              # Next.js app and client-side UI components
├── docker-compose.yml     # Local development stack with database, cache, backend, worker, frontend
├── pyproject.toml         # Python dependencies and tooling config
├── README.md              # Project overview and local setup
└── stop.sh                # Helper script to stop local compose services
```

## Prerequisites

- Linux / macOS (development tested)
- Python 3.12+ for backend development
- Docker and Docker Compose for the full local stack
- Node.js + npm for frontend-only development
- Optional API keys for LLM features:
  - `OPENAI_API_KEY`
  - `GOOGLE_API_KEY`
  - Local Ollama daemon if using custom LLM backend

## Local development with Docker Compose

From the repository root:

```bash
docker compose up --build
```

This starts:
- `postgres` with `pgvector`
- `pgbouncer`
- `redis`
- `backend`
- `worker`

To also start the frontend UI:

```bash
docker compose --profile frontend up --build
```

Default ports:

| Service | URL / Port |
| --- | --- |
| Backend | http://127.0.0.1:18000 |
| Backend docs | http://127.0.0.1:18000/docs |
| Postgres | localhost:15432 |
| PgBouncer | localhost:16543 |
| Redis | localhost:16379 |
| Frontend | http://127.0.0.1:3000 |

### Override ports

Set environment variables before starting compose:
- `BACKEND_PORT`
- `POSTGRES_PORT`
- `PGBOUNCER_PORT`
- `REDIS_PORT`

## Backend-only local setup

From the repository root:

```bash
cd backend
source .venv/bin/activate
uv pip install -r ../pyproject.toml --extra ai
cp .env.example .env
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

To install just the core backend dependencies without optional agent packages:

```bash
uv pip install -r ../pyproject.toml
```

## Frontend-only local setup

From the `frontend/` directory:

```bash
npm install
npm run dev -- --hostname 0.0.0.0
```

The frontend expects the backend API at `NEXT_PUBLIC_API_BASE_URL`.

## Configuration

Backend runtime settings are managed through `backend/.env.example` and environment variables.

Important variables:

| Variable | Purpose | Local default / note |
| --- | --- | --- |
| `DATABASE_URL` | SQLAlchemy database connection | SQLite locally; Compose uses Postgres |
| `REDIS_URL` | Redis queue/cache storage | `redis://redis:6379/0` in Compose |
| `RATE_LIMIT_STORAGE_URL` | Rate limit store | falls back to `REDIS_URL` if unset |
| `QUEUE_BACKEND` | Worker queue backend | `none`, `pgmq`, or `arq` |
| `KB_BACKEND` | Knowledge base backend | `pgvector` or `disabled` |
| `UPLOAD_BACKEND` | Upload storage backend | `disk` |
| `AUTO_CREATE_TABLES` | Auto-create DB schema | `true` in Compose |
| `DOCUMENT_ANALYSIS_USE_CREWAI` | Document analysis provider toggle | `false` by default |
| `PUBLIC_WS_BASE_URL` | WebSocket base URL for demos | `ws://localhost:18000` in Compose |

> For production, set `ENVIRONMENT=production`, a strong `DEMO_SESSION_SECRET`, and valid Supabase JWT verification values.

## Health checks

Verify the backend is running:

```bash
curl http://127.0.0.1:8000/healthz
curl http://127.0.0.1:8000/readyz
```

- `/healthz` is a basic liveness probe
- `/readyz` verifies database connectivity and readiness

## API surface

Core endpoints include:
- `GET /` — version and probe
- `GET /healthz` — liveness
- `GET /readyz` — readiness
- `GET /api/protected` — authenticated identity probe
- `/api/maritime/*` — vessel, route, document, compliance APIs
- `/api/demo/*` — demo session and WebSocket replay endpoints
- `/api/market-sentinel/*` — market risk signal APIs
- `/api/hedge/*` — financial hedging strategy APIs
- `/api/analytics/*` — dashboard and visual risk analytics

## Testing and verification

From the repository root:

```bash
cd backend
source .venv/bin/activate
ruff check backend --config ../pyproject.toml
python -m compileall -q backend
pytest backend/tests -q
python backend/scripts/audit_unauthed_routes.py
PYTHONPATH=backend python -c "import main; print('main import ok')"
docker compose config
```

## Docker image builds

Build the backend image:

```bash
docker build -f backend/Dockerfile -t plimsoll-backend .
```

To include optional AI dependencies in the image:

```bash
docker build -f backend/Dockerfile --build-arg INSTALL_AI=true -t plimsoll-backend:ai .
```

## Useful scripts

- `backend/scripts/audit_unauthed_routes.py` — checks routes requiring authentication
- `backend/scripts/load_knowledge_base.py` — load and index documents into the knowledge base
- `backend/scripts/seed_port_data.py` — seed maritime port data
- `backend/scripts/test_compliance_check.py` — run compliance validation tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run backend tests and lints
4. Open a pull request with a clear description of your changes

## Notes

- The backend is implemented in FastAPI with SQLAlchemy, Redis, and PGVector support.
- The frontend is a Next.js application for interactive maritime risk visualization.
- Docker Compose provides a reproducible local development experience with database and cache services.
