# Database Contract

## Current State

The prototype still has legacy `customers`, `vessels`, and Chroma-backed user
documents. Docker Compose now provides Postgres 15 with pgvector extensions so
the backend can migrate away from SQLite incrementally.

## Target Public Tables

The frontend may eventually read these tenant-scoped tables directly through
Supabase RLS:

- `tenants`
- `tenant_members`
- `vessels`
- `vessel_memberships`
- `vessel_routes`
- `ports`
- `documents`
- `compliance_runs`
- `reports`

All other tables should be treated as backend-owned unless explicitly added to
this contract.

## Rule

Tenant identity comes from JWT claims and RLS. New backend endpoints must not
accept `customer_id`/`tenant_id` as client-supplied authority.
