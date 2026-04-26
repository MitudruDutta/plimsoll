# Supabase Bootstrap

This folder is reserved for the Plimsoll 1.0 Supabase migration assets:

- Auth provider configuration notes
- Storage bucket and RLS policies
- Realtime channel contracts
- Postgres migrations once Alembic/Supabase ownership is finalized

The current local Docker stack uses plain Postgres with pgvector plus Redis so
backend development can move off SQLite first. Full Supabase Auth, Storage, and
Realtime are tracked in PRD milestones B1, B2, and B5.
