# Realtime Contract

## Target Channels

Realtime events are emitted per tenant:

```text
tenant:{tenant_id}:documents
tenant:{tenant_id}:compliance
tenant:{tenant_id}:reports
tenant:{tenant_id}:hedging
```

## Event Shape

```json
{
  "event": "doc.ocr.completed",
  "tenant_id": "tenant-uuid",
  "resource_id": "document-id",
  "status": "completed",
  "created_at": "2026-04-26T00:00:00Z",
  "payload": {}
}
```

## Notes

The current demo WebSocket is separate. Product workflow updates should move to
Supabase Realtime as storage, OCR, compliance, and report jobs move into the
worker.
