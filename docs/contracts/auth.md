# Auth Contract

## Current State

`AUTH_BACKEND=clerk` remains the default while the backend is still using the
legacy Clerk verifier.

## Plimsoll 1.0 Target

`AUTH_BACKEND=supabase` will verify Supabase Auth JWTs and expose a backend
user shape:

```json
{
  "id": "auth-user-id",
  "email": "user@example.com",
  "role": "user",
  "tenant_id": "tenant-uuid",
  "claims": {}
}
```

## Migration Flags

- `AUTH_BACKEND=clerk`: existing behavior.
- `AUTH_BACKEND=supabase`: Supabase-only verification.
- `AUTH_BACKEND=dual`: migration mode where Clerk and Supabase tokens can be
  accepted while tenant data is backfilled.

Tenant identity must come from JWT claims, not request body/query parameters.
