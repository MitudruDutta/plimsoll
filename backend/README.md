# Sully / NaviGuard Backend

FastAPI backend for the NaviGuard / Sully maritime risk, compliance, document,
analytics, demo and financial hedging APIs.

---

## 1. Prerequisites

- **Python 3.10 – 3.12** (3.12 recommended; tested on 3.12.13)
- **pip** and **venv** (bundled with Python)
- **git**
- A few hundred MB of disk space for the `chromadb` / `torch` /
  `sentence-transformers` wheels
- Linux, macOS, or WSL. On native Windows the `uvloop` line in
  `requirements.txt` is skipped automatically (it has `platform_system !=
  "Windows"`).

Optional but recommended:

- `curl` for quick smoke tests
- A running `ollama` daemon if you want local LLMs (default `LLM_PROVIDER`)
- One of `OPENAI_API_KEY` or `GOOGLE_API_KEY` for CrewAI / agent endpoints

---

## 2. One-time setup

From the repository root:

```bash
cd backend

# Create and activate a local virtualenv (any path works; this is an example)
python3 -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate

# Install pinned dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create your environment file and edit the values you need
cp .env.example .env
```

> The install pulls `torch`, `chromadb`, `sentence-transformers` and
> `crewai`, so the first run can take several minutes and ~1–2 GB on disk.

### Environment variables

Everything the app reads at runtime is documented in [`.env.example`](./.env.example).
The ones you almost always want to set for local dev are:

| Variable           | Purpose                                      | Default                             |
|--------------------|----------------------------------------------|-------------------------------------|
| `DATABASE_URL`     | SQLAlchemy URL                               | `sqlite:///./data/sully.db`         |
| `CORS_ORIGINS`     | Comma-separated browser origins              | `http://localhost:3000,http://127.0.0.1:3000` |
| `CLERK_ISSUER_URL` | Clerk issuer for JWT verification            | *(unset — auth endpoints will 500)* |
| `ADMIN_WHITELIST`  | Comma-separated emails forced to `role=admin`| *(empty)*                           |
| `GOOGLE_API_KEY`   | Gemini key for CrewAI                        | *(unset)*                           |
| `OPENAI_API_KEY`   | OpenAI key for CrewAI                        | *(unset)*                           |
| `HOST` / `PORT`    | Used by `start_server.py` / `python main.py` | `127.0.0.1` / `8001`                |

If `DATABASE_URL` is not set, the backend defaults to the bundled SQLite file
at `./data/sully.db` (already created on first run). Point it at Postgres for
production, e.g. `postgresql://user:password@host:5432/sully`.

---

## 3. Run the server

### Option A — uvicorn directly (recommended for development)

```bash
cd backend
source .venv/bin/activate
python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

### Option B — the convenience launcher

```bash
cd backend
source .venv/bin/activate
python start_server.py
```

`start_server.py` loads `.env` automatically and respects `HOST`, `PORT`,
`RELOAD`, and `LOG_LEVEL` environment variables (defaults: `127.0.0.1:8001`,
reload off, `info`).

### Verify it is up

```bash
curl http://127.0.0.1:8001/
```

Expected response:

```json
{"message":"NaviGuard Maritime Risk Intelligence API","version":"0.1.0","status":"running"}
```

Interactive docs: <http://127.0.0.1:8001/docs>

---

## 4. API surface

- `GET  /` — health / version probe (no auth)
- `GET  /api/protected` — auth probe, returns current Clerk user
- `/api/maritime/*` — vessels, routes, document upload, compliance checks, reports
- `/api/demo/*` — demo autoplay and websocket flow
- `/api/market-sentinel/*` — market sentinel risk signals
- `/api/hedge/*` — financial hedging risk and strategy endpoints
- `/api/analytics/*` — dashboard analytics
- `/api/admin/*` — admin-only surfaces (requires `role=admin` via `ADMIN_WHITELIST` or Clerk metadata)

Most user-data endpoints require a valid Clerk bearer token. Setting
`CLERK_ISSUER_URL` is therefore required before calling them; `/` and
`/docs` work without auth.

---

## 5. Troubleshooting

**`ModuleNotFoundError: No module named 'fastapi'` (or similar)**
You forgot to activate the venv, or `pip install -r requirements.txt` failed
halfway. Re-activate and re-install.

**`[Errno 98] Address already in use` / port 8000 busy**
Another process is on that port (often a previous uvicorn). Use a different
one: `--port 8001` (or set `PORT=8001`).

**`sqlalchemy.exc.OperationalError: could not connect to server` on startup**
You exported a Postgres `DATABASE_URL` but Postgres is not running. Either
start Postgres or unset `DATABASE_URL` to fall back to SQLite.

**`Auth configuration error` / 500 on `/api/*` routes**
`CLERK_ISSUER_URL` is not set. Either set it, or hit the unauthenticated
routes (`/`, `/docs`, `/openapi.json`) to smoke test.

**`No LLM API key configured (GOOGLE_API_KEY or OPENAI_API_KEY)` warning**
Informational. The server still boots; only CrewAI / agent endpoints that
need an LLM will fail when called. Set one of the keys in `.env` to enable
them.

**`unable to open database file` on first run**
The `./data` directory is missing. Create it: `mkdir -p data`.

**Slow/stuck `pip install`**
`torch` and `chromadb` are large. Use a mirror (`pip install -i
https://pypi.org/simple ...`) or pre-seed a cache. A fresh install of
`requirements.txt` on a clean machine is typically 3–10 minutes.

---

## 6. Useful commands

Compile-check every Python file in the backend:

```bash
python -m compileall -q .
```

Run the included test:

```bash
pytest tests/
```

Smoke-test the server is importable (no network, no DB needed beyond SQLite):

```bash
python -c "import main; print('import OK')"
```

Run in Docker:

```bash
docker build -t sully-backend .
docker run --rm -p 8000:8000 --env-file .env sully-backend
```

---

## 7. Layout

```
backend/
├── main.py                   # FastAPI app entrypoint
├── start_server.py           # uvicorn launcher that reads .env + HOST/PORT
├── requirements.txt
├── Dockerfile
├── .env.example              # copy to .env and edit
├── data/                     # SQLite DB, vector stores, uploads (gitignored)
├── shared/                   # config, DB models, auth
├── modules/
│   ├── maritime/             # compliance, documents, vessels, routes
│   ├── financial/            # hedging, market sentinel
│   ├── analytics/            # dashboards, OCR, visual risk
│   ├── demo/                 # autoplay / scripted demo flows
│   └── orchestration/        # CrewAI agents
├── scripts/                  # one-off data loaders & smoke tests
└── tests/
```
