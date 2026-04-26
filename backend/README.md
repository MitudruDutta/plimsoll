# Plimsoll Backend

FastAPI backend for Plimsoll maritime risk, compliance, document analysis,
visual risk, demo, and financial hedging APIs.

## Prerequisites

- Python 3.12 recommended
- `uv` for local installs (`pip install uv` if needed)
- Docker + Docker Compose for the full local stack
- Optional: `GOOGLE_API_KEY`, `OPENAI_API_KEY`, or a local Ollama daemon for
  agent/LLM paths

## Local Stack

From the repository root:

```bash
docker compose up --build
```

This starts Postgres 15 with pgvector, PgBouncer, Redis, the FastAPI backend,
and the worker container. Add the frontend profile when needed:

```bash
docker compose --profile frontend up --build
```

Default ports:

| Service | URL / Port |
| --- | --- |
| Backend | <http://127.0.0.1:18000> |
| Backend docs | <http://127.0.0.1:18000/docs> |
| Postgres | `localhost:15432` |
| PgBouncer | `localhost:16543` |
| Redis | `localhost:16379` |

The backend container listens on `8000` inside Docker. Override host ports with
`BACKEND_PORT`, `POSTGRES_PORT`, `PGBOUNCER_PORT`, or `REDIS_PORT`.

## Local Backend Only

The user workspace already uses `~/python/bin/activate`. From the repo root:

```bash
source ~/python/bin/activate
uv pip install -r pyproject.toml --extra ai
cp backend/.env.example backend/.env
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

For a lean install without CrewAI/Chroma/sentence-transformers:

```bash
source ~/python/bin/activate
uv pip install -r pyproject.toml
```

## Configuration

Runtime settings are documented in [`.env.example`](./.env.example).

Important defaults:

| Variable | Purpose | Local default |
| --- | --- | --- |
| `DATABASE_URL` | SQLAlchemy database URL | SQLite for bare local dev; Compose overrides to Postgres |
| `AUTH_BACKEND` | Auth mode | `supabase` |
| `SUPABASE_URL` / `SUPABASE_JWKS_URL` / `SUPABASE_JWT_SECRET` | JWT verification | required outside local smoke tests |
| `REDIS_URL` | Queue/cache/rate-limit Redis | `redis://redis:6379/0` in Compose |
| `RATE_LIMIT_STORAGE_URL` | SlowAPI distributed storage | falls back to `REDIS_URL` when set |
| `KB_BACKEND` | Knowledge-base backend flag | `chroma`, `pgvector`, `dual`, or `disabled` |
| `QUEUE_BACKEND` | Worker queue flag | `none`, `pgmq`, or `arq` |
| `PUBLIC_WS_BASE_URL` | Demo WebSocket base URL | set by Compose |

Production must set `ENVIRONMENT=production`, a real
`DEMO_SESSION_SECRET`, and Supabase JWT verification settings.

## Health Checks

```bash
curl http://127.0.0.1:8000/healthz
curl http://127.0.0.1:8000/readyz
```

`/healthz` is liveness only. `/readyz` checks database connectivity.

## API Surface

- `GET /` — version probe
- `GET /healthz` — liveness
- `GET /readyz` — readiness
- `GET /api/protected` — authenticated identity probe
- `/api/maritime/*` — vessels, routes, documents, compliance
- `/api/demo/*` — signed demo session + WebSocket replay
- `/api/market-sentinel/*` — market sentinel risk signals
- `/api/hedge/*` — financial hedging risk and strategy endpoints
- `/api/analytics/*` — dashboard analytics and visual risk

Every non-allowlisted route is checked by `scripts/audit_unauthed_routes.py`.

## Verification

From the repository root:

```bash
source ~/python/bin/activate
ruff check backend --config pyproject.toml
python -m compileall -q backend
pytest backend/tests -q
python backend/scripts/audit_unauthed_routes.py
PYTHONPATH=backend python -c "import main; print('main import ok')"
docker compose config
```

## Docker Image

The Dockerfile uses `uv` and the repo-level `pyproject.toml`.

```bash
docker build -f backend/Dockerfile -t plimsoll-backend .
```

The default image installs the lean runtime dependencies. Build with the AI
extra when you want CrewAI/Chroma/sentence-transformers inside the image:

```bash
docker build -f backend/Dockerfile --build-arg INSTALL_AI=true -t plimsoll-backend:ai .
```

## Layout

```text
backend/
├── main.py
├── Dockerfile
├── .env.example
├── worker/
├── shared/
├── modules/
├── scripts/
└── tests/
```
