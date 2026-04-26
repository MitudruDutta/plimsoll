# Storage Contract

## Buckets

- `documents`: uploaded vessel certificates and supporting documents.
- `satellite-cache`: fetched or generated imagery tiles.
- `reports`: generated compliance and hedge reports.

## Object Paths

Document objects should use:

```text
{tenant_id}/{vessel_id}/{yyyy}/{mm}/{uuid}.{ext}
```

## Migration Flags

- `UPLOAD_BACKEND=disk`: current prototype behavior.
- `UPLOAD_BACKEND=supabase_storage`: browser uploads via signed URL, followed by
  a verified webhook that creates a `documents` row and enqueues OCR.

FastAPI should not receive default-path document bytes once
`UPLOAD_BACKEND=supabase_storage` is enabled.
