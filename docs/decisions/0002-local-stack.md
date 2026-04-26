# 0002: Local Docker Stack

## Status

Accepted for the Plimsoll 1.0 backend upgrade path.

## Decision

Use Docker Compose for local development with:

- FastAPI backend on `localhost:18000` by default
- Worker container from the same backend image
- Postgres 15 with pgvector on `localhost:15432` by default
- PgBouncer on `localhost:16543` by default
- Redis on `localhost:16379` by default
- Frontend as an optional `frontend` profile on `localhost:3000`

## Rationale

The PRD calls for a one-command dev stack while the product migrates away from
SQLite, Chroma Cloud, local uploads, and synchronous agent work. Compose gives
the backend track a realistic database/cache/worker substrate before the full
Supabase Auth and Storage migration is complete.

## Notes

This is not a full self-hosted Supabase distribution yet. Auth, Storage, and
Realtime are represented by config placeholders and contracts to be implemented
in the B1/B2/B5 milestones.

The backend Docker image uses `requirements.docker.txt` by default to avoid
pulling CUDA-heavy ML dependencies into the day-one local stack. Full AI images
can opt into `requirements.txt` with the `BACKEND_REQUIREMENTS` build argument.
