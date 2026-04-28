# Gemini for Maps + Vision

Plimsoll uses Gemini for two surfaces:

1. **Visual risk** — analyse a satellite/news/camera image and return a
   structured `VisualRiskResult` (risk_type, severity, recommendations).
2. **Maps imagery** — fetch a Google Static Maps tile, then feed the bytes
   into Gemini Vision for the same analysis pipeline.

Both share `backend/modules/analytics/visual_risk_service.py` and only need
**one** API key (`GOOGLE_API_KEY`) by default; Static Maps optionally takes a
separate key (`GOOGLE_MAPS_API_KEY`).

---

## 1. Get the keys

You can use the same Google Cloud project for both products.

### `GOOGLE_API_KEY` (Gemini)

1. <https://aistudio.google.com/app/apikey> → **Create API key**.
2. Pick the GCP project (or let it create one).
3. Copy the key. Format: `AIzaSy...` (39 chars).

> Free tier: ~60 RPM on `gemini-2.0-flash`; enough for dev. Bill-on-key
> mistakes happen — restrict the key to the **Generative Language API** in
> the GCP console once you start sharing the project.

### `GOOGLE_MAPS_API_KEY` (Static Maps)

1. <https://console.cloud.google.com/apis/credentials> → **Create
   credentials** → **API key**.
2. Enable the **Maps Static API** in **APIs & Services → Library**.
3. Restrict the key:
   - **Application restrictions**: HTTP referrers (web sites) for the
     frontend domain *or* IP addresses for the backend host.
   - **API restrictions**: limit to `Maps Static API`.
4. Copy the key.

If you only set `GOOGLE_API_KEY`, the visual risk service uses it for *both*
Gemini and Static Maps (the same key works against both APIs when
unrestricted). For prod always split them.

---

## 2. Wire the env

```bash
# backend/.env
GOOGLE_API_KEY=AIzaSy...        # Gemini
GOOGLE_MAPS_API_KEY=AIzaSy...   # Static Maps (optional; falls back to GOOGLE_API_KEY)
```

Restart the backend (`docker compose restart backend` or the local
`uvicorn`). The `/api/visual-risk/status` endpoint reflects the live config:

```bash
curl -H "Authorization: Bearer $SUPABASE_JWT" \
     http://127.0.0.1:18000/api/visual-risk/status
```

```json
{
  "status": "operational",
  "service": "visual_risk_analyzer",
  "model": "gemini-2.0-flash",
  "api_configured": true,
  "static_maps_reachable": true,
  "mode": "live"
}
```

`api_configured: false` → key missing. `static_maps_reachable: false` → key
present but Static Maps API not enabled or HTTP referrer check failed.

---

## 3. Endpoints

All routes live under `/api/visual-risk/*` and require a Supabase access
token (`Authorization: Bearer ...`). Rate-limited to 10/min/user via
`shared.rate_limit.limiter`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/visual-risk/status` | Health + live/demo flag |
| `GET`  | `/api/visual-risk/scenarios` | Static demo scenario catalogue |
| `GET`  | `/api/visual-risk/demo?scenario=suez_blockage` | Mock result, no API hit |
| `POST` | `/api/visual-risk/analyze` | Multipart upload → Gemini Vision |

### Analysing an image

```bash
curl -H "Authorization: Bearer $TOKEN" \
     -F "file=@suez.jpg" \
     -F "source_type=satellite" \
     http://127.0.0.1:18000/api/visual-risk/analyze
```

```json
{
  "success": true,
  "filename": "suez.jpg",
  "analysis": {
    "risk_type": "canal_blockage",
    "severity": 0.92,
    "description": "Container vessel grounded across the channel...",
    "affected_routes": ["Asia-Europe via Suez"],
    "affected_ports": ["Port Said", "Suez"],
    "confidence": 0.88,
    "recommendations": ["Reroute via Cape of Good Hope", "..."],
    "source_type": "satellite",
    "timestamp": "2026-04-28T10:12:34+00:00"
  },
  "mode": "live"
}
```

If Gemini errors, the service returns a demo result with `fallback: true`
and HTTP 200. The frontend uses `mode != "live"` to render a "demo data"
banner.

### Pulling a Static Maps tile

`visual_risk_service.download_satellite_image(lat, lng, zoom=14, size="640x640")`
hits Static Maps and returns image bytes. Use it as the input to the same
`analyze_image` pipeline:

```python
from modules.analytics.visual_risk_service import get_visual_risk_analyzer

analyzer = get_visual_risk_analyzer()
img = await analyzer.download_satellite_image(30.5, 32.3, zoom=12)
result = await analyzer.analyze_image(img, mime_type="image/png")
```

---

## 4. Models

Default: `gemini-2.0-flash` (fastest + cheapest multimodal model).

Switch via `EMBEDDING_MODEL` (for embeddings) and the model string inside
`visual_risk_service._call_gemini_vision` (for vision). When you upgrade,
update `_PRICING_USD_PER_M_TOKENS` in `shared/observability/llm_ledger.py`
or `LLM_PRICING_OVERRIDES_JSON` so cost tracking stays accurate.

Vision costs roughly **input tokens ≈ 258 per image tile** at
`gemini-2.0-flash`. With the default `640x640` Static Maps tile that's ≈
$0.00003 per call — very cheap, but multiply by the planned QPS.

---

## 5. Token-cost guardrails

The visual-risk service is the cheapest LLM surface, but it still hits paid
APIs. Conventions in this repo:

- All Gemini calls flow through `shared.llm.factory.get_default_llm()`
  (CrewAI) or directly via `_call_gemini_vision` (vision). One process =
  one connectivity ping; subsequent calls reuse the cached client.
- All calls should be wrapped in `shared.observability.llm_ledger.ledger_span`
  so the `llm_calls` table records tokens + latency.
- Demo mode (`mode: "demo"` in the response) **never** calls the API. Set
  `GOOGLE_API_KEY=""` to force demo mode in CI.
- Rate limiter caps `/api/visual-risk/analyze` at 10/min/user; tweak in
  `backend/modules/analytics/visual_risk_routes.py`.

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|---------|------|
| `Gemini health check failed: ResourceExhausted` | Free-tier RPM hit. Wait or upgrade key. |
| `static_maps_reachable: false` | Maps Static API not enabled, or HTTP referrer restriction blocking server-side calls. |
| `403 REQUEST_DENIED` from Static Maps | Key restricted to wrong API or referrer. Open the key in GCP Console → API restrictions. |
| `mode: "demo"` despite key set | Backend cannot read the env var. Check `docker compose config` and `/api/visual-risk/status`. |
| Vision returns generic text | Image too small/blurry. Static Maps `zoom=12+` works better than `zoom=8`. |
| Cost spiking | Inspect `llm_calls` table grouped by `surface=visual_risk`. Tighten the route limiter. |
