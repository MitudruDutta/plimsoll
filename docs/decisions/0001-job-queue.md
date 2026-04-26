# 0001: Job Queue Backend

## Status

Accepted for Plimsoll 1.0 bootstrap.

## Decision

Use `pgmq` as the default queue target for the 1.0 migration, with Redis present
in the local stack for caching, rate limiting, and an `arq` fallback if pgmq is
not available in a given deployment.

## Rationale

The PRD favors Supabase Postgres as the main operational substrate. Keeping the
default queue in Postgres reduces moving parts for the two-engineer team and
keeps job state close to tenant, document, and audit data. Redis is still part
of the stack because distributed rate limiting and hot-path cache use cases are
separate from durable job state.

## Consequences

- `QUEUE_BACKEND=pgmq` is the Docker Compose default.
- The worker container exists now, but job handlers are added incrementally.
- Local Postgres enables `pgmq` only when the image provides the extension.
- If a deployment cannot provide pgmq, switch to `QUEUE_BACKEND=arq` and use
  the Redis service already in compose.
