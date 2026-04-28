# Running Plimsoll

Two run modes:

- **Local dev (uv)** — fastest iteration. Run backend + worker + frontend on
  the host, point at the Docker Compose Postgres/Redis stack.
- **Docker Compose** — one command brings up the full stack. Slower rebuilds,
  but mirrors production wiring.

Both depend on a Supabase project (local CLI or hosted) for auth.

---

## 0. Prerequisites

| Tool | Why | Install |
|------|-----|---------|
| Docker Engine + Compose v2 | Postgres, Redis, optional backend/frontend | <https://docs.docker.com/engine/install/> |
| `uv` (Astral) | Python deps + venv for local dev | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Node 22 + bun (or npm) | Frontend | `https://nodejs.org`, `https://bun.sh` |
| Supabase CLI | Local auth + storage | `https://supabase.com/docs/guides/local-development` |

---

## 1. Bring up Supabase locally

The frontend uses `@supabase/supabase-js` and the backend verifies its JWTs,
so Supabase must be reachable before either starts.

```bash
supabase start
```

`supabase status` prints the URLs and the anon / service-role / JWT secret
values. Local CLI defaults are stable:

| Field | Value |
|-------|-------|
| API URL | `http://127.0.0.1:54321` |
| Studio | `http://127.0.0.1:54323` |
| DB | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| JWT secret | `super-secret-jwt-token-with-at-least-32-characters-long` |

Use `supabase stop` to tear everything down. `supabase db reset` re-applies
migrations from `./supabase/migrations/`.

> The Plimsoll stack ships its **own** Postgres+pgvector at `:15432` for the
> app data. Supabase's Postgres at `:54322` is auth + storage only. Do not
> point `DATABASE_URL` at the Supabase DB.

---

## 2. Configure environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Both files default to local Supabase URLs. Fill the keys you need (LLM keys
are optional; without them the agent endpoints return demo payloads).

The minimum overrides for a working local run:

```bash
# backend/.env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_JWT_SECRET=<paste from `supabase status`>

# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste from `supabase status`>
```

---

## 3. Run mode A — Docker Compose

The backend `Dockerfile` is uv-driven and reads `pyproject.toml + uv.lock`
from the repo root.

### Start the slim runtime (Postgres + Redis + backend + worker)

```bash
docker compose up --build
```

Endpoints:

| Service | URL |
|---------|-----|
| Backend API | <http://127.0.0.1:18000> |
| OpenAPI docs | <http://127.0.0.1:18000/docs> |
| Postgres (app DB) | `localhost:15432` (`plimsoll/plimsoll/plimsoll`) |
| PgBouncer | `localhost:16543` |
| Redis | `localhost:16379` |

### Add the frontend container

```bash
docker compose --profile frontend up --build
```

Frontend on <http://localhost:3000>. The frontend container runs `npm install`
on each boot; first start is slow (~60s).

### Build with the AI extra (CrewAI + Gemini)

The slim image skips CrewAI/langchain to keep cold-starts fast. To bring
them in:

```bash
docker compose build --build-arg INSTALL_AI=true backend worker
docker compose up
```

The same flag is honoured by the worker Dockerfile (same image).

### Tearing down

```bash
docker compose down            # stop + keep volumes
docker compose down -v         # ALSO drop postgres_data, redis_data, etc.
```

---

## 4. Run mode B — Local dev (uv)

```bash
# 1) Bring up just Postgres + Redis from compose
docker compose up -d postgres redis

# 2) Install Python deps (slim runtime)
uv sync                          # add `--extra ai --extra scripts --extra dev` for full
source .venv/bin/activate

# 3) Boot the backend
uv run uvicorn backend.main:app --host 127.0.0.1 --port 18000 --reload

# 4) Boot the worker (separate terminal)
uv run python -m worker.main      # cwd = ./backend

# 5) Boot the frontend (separate terminal)
cd frontend && bun install && bun run dev
```

Frontend dev server: <http://localhost:3000>. Backend: <http://127.0.0.1:18000>.

---

## 5. Health checks

```bash
curl http://127.0.0.1:18000/healthz
curl http://127.0.0.1:18000/readyz
curl http://127.0.0.1:18000/openapi.json | jq '.info'
```

`/readyz` opens a DB connection; if it 503s, Postgres is not reachable.

---

## 6. Common tasks

```bash
# Run backend tests
uv run pytest

# Lint
uv run ruff check backend

# Audit unauthenticated routes
uv run python backend/scripts/audit_unauthed_routes.py

# Reset local Postgres (drops all data)
docker compose down -v && docker compose up -d postgres redis
```

---

## 7. Troubleshooting

| Symptom | Cause / fix |
|---------|------|
| 500 `Failed to fetch auth keys` | `SUPABASE_URL` unreachable. `supabase start`, or set `SUPABASE_JWT_SECRET` for HS256 mode. |
| 401 `Unsupported JWT algorithm` | Frontend signed with a different key than backend trusts. Re-paste keys from `supabase status`. |
| `redis.exceptions.ConnectionError` | Redis is down. `docker compose up -d redis`. Rate limiter falls back to in-memory. |
| `Address already in use :8000` | Another uvicorn running; kill or use `PORT=8001`. |
| `compose ... env file not found` | `backend/.env` missing. `cp backend/.env.example backend/.env`. |
| Slow `docker compose build` for backend | Layer cache miss. Avoid editing `pyproject.toml` mid-build; uv re-resolves. |
| Frontend rewrites 502 | Backend not yet listening. Wait for `Application startup complete.` before hitting `/api/*`. |

---

## 8. Layout

```
.
├── docker-compose.yml          # postgres / pgbouncer / redis / backend / worker / frontend (profile)
├── pyproject.toml              # uv-managed deps; extras: ai, scripts, dev
├── uv.lock
├── backend/
│   ├── Dockerfile              # uv-based image, COPY pyproject + uv.lock first
│   ├── main.py                 # FastAPI entrypoint
│   ├── modules/                # maritime / financial / analytics / demo / orchestration
│   ├── shared/                 # config, auth (Supabase), database, llm, rate_limit, observability
│   ├── worker/                 # background worker entrypoint
│   └── scripts/                # ingest + smoke tests
├── frontend/
│   ├── app/                    # Next.js 16 app router
│   ├── services/               # API clients (axios + fetch)
│   └── views/                  # page-level components
├── supabase/migrations/        # SQL for Supabase project
└── docs/                       # this folder
```
