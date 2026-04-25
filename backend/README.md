# Sully Backend

FastAPI backend for the NaviGuard / Sully maritime risk, compliance, document, analytics, demo, and financial hedging APIs.

## Quick Start

From the repository root:

```bash
cd backend
source ~/python/bin/activate
DATABASE_URL=sqlite:///./data/sully.db python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

Open:

```text
http://127.0.0.1:8001/
```

Expected root response:

```json
{"message":"NaviGuard Maritime Risk Intelligence API","version":"0.1.0","status":"running"}
```

Port `8000` may already be in use on the local machine. Use `8001` or another free port when that happens.

## Environment

The currently used local Python environment is:

```bash
source ~/python/bin/activate
```

Required runtime settings can be supplied through environment variables or a `.env` file in `backend/`.

Common variables:

```bash
DATABASE_URL=sqlite:///./data/sully.db
CLERK_ISSUER_URL=https://<your-clerk-issuer>
ADMIN_WHITELIST=admin@example.com
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
OPENAI_API_KEY=<optional>
GOOGLE_API_KEY=<optional>
```

If `DATABASE_URL` is not set, the backend defaults to a local Postgres URL:

```text
postgresql://user:password@localhost:5432/dji_sales_mvp
```

That default requires a running Postgres instance. For local smoke testing, the SQLite override above is simpler.

## Install Notes

```bash
source ~/python/bin/activate
pip install -r requirements.txt
```

The previous `langchain==0.0.208` / `langchain-chroma==0.0.208` / `chromadb==0.3.24` pins were removed; the server now installs cleanly into a fresh Python 3.12 venv.

## Useful Commands

Compile-check Python files:

```bash
python -m compileall -q backend
```

Start backend on port `8001`:

```bash
cd backend
source ~/python/bin/activate
DATABASE_URL=sqlite:///./data/sully.db python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

Verify the server:

```bash
curl http://127.0.0.1:8001/
```

## API Areas

- `/api/maritime/*` - vessels, routes, document upload, compliance checks, reports
- `/api/demo/*` - demo autoplay and websocket flow
- `/api/market-sentinel/*` - market sentinel risk signals
- `/api/hedge/*` - financial hedging risk and strategy endpoints
- `/api/analytics/*` - dashboard analytics
- `/api/protected`, `/api/admin/*` - authenticated and admin-only surfaces

Most user data endpoints require a valid Clerk bearer token.

## Known Local Warnings

You may see warnings from `requests`, `torch`, or missing LLM keys during startup. They are not fatal for the basic API server. CrewAI/LLM-backed routes need `OPENAI_API_KEY` or `GOOGLE_API_KEY` to perform real agent work.
