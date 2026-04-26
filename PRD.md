# Plimsoll 1.0 — Product Requirements Document

**Status:** Draft (v1.0 — base release)
**Product name:** **Plimsoll** (long-form brand: **Plimsoll AI**)
**Owners:** Backend Engineer (you) + Frontend Engineer (teammate)
**Repo:** `plimsoll` (renamed from `Sully` codename)
**Last updated:** 2026-04-26

> A founding PRD. It documents the brutal truth about the current pre-1.0 prototype, sets the **base product** (Plimsoll **1.0**) tech direction, and ships a clean per-track task breakdown so two engineers can work in parallel without stepping on each other.
>
> **Versioning convention:** The current code (the "NaviGuard / Sully" prototype) is **pre-1.0**. The redefined product specified here is **Plimsoll 1.0** — the official base release. Future iterations land as 1.1, 1.2, … with a 2.0 reserved for a major architectural redirection later.

---

## Naming — why "Plimsoll"

The **Plimsoll line** (a.k.a. International Load Line) is the iconic maritime mark stamped on every commercial hull — it defines the legal safe-loading limit. It was named after Samuel Plimsoll, the 1876 reformer who lobbied it into international maritime law. The mark is the original maritime *compliance signal*, and compliance is our headline pillar.

The name is:

- **Uniquely maritime** — no metaphor needed; it is a real maritime artifact.
- **Compliance-native** — every regulator, P&I club, and PSC inspector knows it.
- **Distinctive** — no major B2B SaaS uses the name.
- **Short, memorable, pronounceable** — 8 letters, two syllables (`PLIM-sole`).
- **Story-friendly** — "the Plimsoll line is the visible mark of legal compliance on every ship — Plimsoll AI is its digital twin for the entire voyage."

**Brand surface:**
- Product name: **Plimsoll**
- Long-form: **Plimsoll AI**
- Domain (suggested): `plimsoll.app` (with `app.plimsoll.app` as the dashboard, `staging.plimsoll.app`, `pr-<n>.plimsoll.app`).
- Repo: rename `Sully` → `plimsoll` (or keep `Sully` as the internal codename and add `plimsoll` as the public-facing repo).
- Pythonic identifiers: `plimsoll` (package), `PLIMSOLL_*` (env vars).

**Alternates considered (in case you want to swap):**

| Name | Vibe | Why it's also good |
| --- | --- | --- |
| **Breakwater** | Protective harbor structure | Strong "we protect you from crisis" angle. Watch for some overlap with security companies. |
| **Lodestar** | Guiding star (navigation) | Decision-support framing. Used elsewhere as a metaphor, slightly less unique. |
| **Fathomline** | Depth-line | Original coinage; suggests "deep visibility into your fleet". |
| **Helmwise** | Wise at the helm | Original; slightly cute. |
| **Sextant** | Navigational instrument | Heritage feel; one-word, evocative. |

If you want any of these instead, say the word and I'll do a single replace pass.

---

## 0. TL;DR

Plimsoll is a maritime supply-chain risk + compliance + financial-hedging platform. The current build (previously branded "NaviGuard / Sully") is a hackathon-grade prototype: it works for a 1-user demo but cannot scale, has identity-leftovers from a previous "DJI sales" project, has TypeScript disabled across the entire frontend, runs SQLite as the default database, depends on Chroma Cloud + Clerk + multiple competing UI kits, and synchronously runs OCR + CrewAI agents inside HTTP request handlers.

**Plimsoll 1.0** is the base product that fixes that. We:

1. Replace **Clerk** with **Supabase Auth** (self-hostable via `supabase/docker`).
2. Replace **SQLite + ChromaDB Cloud** with **Postgres + pgvector** (single Supabase Postgres = primary DB **and** vector store).
3. Replace **local disk uploads** with **Supabase Storage** (S3-compatible, signed URLs, RLS).
4. Replace the **SPA-inside-a-Next-shell** with a real **Next.js 15 App Router** app: server components, server actions, streaming, RLS-aware data fetching.
5. Replace **synchronous CrewAI inside HTTP handlers** with a **job queue** (Postgres + `pgmq` / Supabase Queues, or Redis/Arq) so heavy work runs out-of-band.
6. Add **observability** (OpenTelemetry → Grafana Tempo/Loki, Sentry), **caching** (Redis), **rate limiting backed by Redis**, **Alembic migrations**, **CI**, and **Docker Compose** for the entire stack.

After 1.0 ships, the platform handles 10k+ concurrent users, every feature is multi-tenant via Postgres Row-Level-Security, and the two-dev team owns clean, separated surfaces.

---

## 1. Brutal Audit — What's Wrong Today

A blunt enumeration. Each item is something we will fix or delete.

### 1.1 Identity / dead code
- **Project leftover from "DJI sales MVP".** Default Postgres URL is `postgresql://user:password@localhost:5432/dji_sales_mvp`. `crew_orchestrator.py` is hardcoded for "DJI Matrice industrial drones". The `Customer / Conversation / Message / Handoff` tables and the `/api/chat` + `/api/handoff` + `/api/classify/...` endpoints are a customer-service chatbot from the prior project, unused by the maritime UI.
- **Two auth modules doing the same thing**: `shared/auth/clerk_auth.py` (uses `python-jose` + `httpx`) and `shared/auth/security.py` (uses `PyJWT` + `PyJWKClient`). One is dead.
- **Stale README**: backend README references a manual venv at `~/python/bin/activate`, frontend README is the unmodified Next.js boilerplate, the docs reference `frontend1` while the folder is `frontend`.
- **Mixed-encoding docstrings**: many Python files have empty/stripped Chinese docstrings (e.g. `""""""`) — leftovers from a translation pass that broke UTF-8.

### 1.2 Auth
- **Clerk** is wired in three places: backend JWKS verification (twice), frontend `<ClerkProvider>` + `useUser()` + `useAuth()`, and the `Customer.clerk_id` column. Cost scales with MAU; not self-hostable; vendor lock-in.
- The frontend stores Clerk's secret key in `.env.local`. **Even though `.env*` is gitignored, secret keys MUST be rotated on migration** because they were already on the developer machines.
- JWKS is cached forever (no key-rotation handling).
- `_require_admin` uses an env-var email whitelist — string-split, lowercased, no audit trail. There is no role table.

### 1.3 Database
- **SQLite by default** (`sqlite:///./data/sully.db`) for a product that "should handle a lot of users". A 122 KB SQLite file in `backend/data/` is the production-ish artifact today.
- `Base.metadata.create_all(bind=engine)` runs on every startup. Alembic is in `requirements.txt` but there is no `alembic/` directory or `alembic.ini`.
- No connection pool tuning, no read replica, no PgBouncer.
- Models mix Postgres-only types and SQLite-friendly types implicitly.
- `Customer.clerk_id` is a `String(100)` foreign-identity column with no index integrity.

### 1.4 Vector store / RAG
- **ChromaDB Cloud** with `langchain-chroma` (heavy abstraction layer) + a separate **CrossEncoder reranker** (`cross-encoder/ms-marco-MiniLM-L-6-v2`) downloaded at every cold start.
- The `MaritimeKnowledgeBase` initializes **6 separate Chroma collections** at boot (`imo_conventions`, `psc_requirements`, `port_regulations`, `regional_requirements`, `customs_documentation`, `user_documents`). All hit the network on import.
- **User document metadata** is stored in ChromaDB (not Postgres). This is wrong: we lose ACID, joins, RLS, and we leak ownership control to a vector DB.
- No hybrid search (vector + BM25) — the `bm25_indices` field exists but is unused.
- Embedding model is `gemini-embedding-001` with **768 dims** in some places and CrossEncoder reranking in another — no consistent retrieval contract.

### 1.5 LLM / agents
- **CrewAI 1.7.2** is heavy (drags LiteLLM, ~hundreds of transitive deps).
- `CrewAIOrchestrator` references `self.kb` and `self.fallback_detector`, neither of which is ever assigned in `__init__`. **It will `AttributeError` on first call.** The `_legacy_service_unavailable("Chat service")` path masks this in `/api/chat`.
- Three different Gemini model strings used: `gemini-3-flash-preview`, `gemini-2.0-flash`, `models/gemini-embedding-001`. No model registry.
- `crew_orchestrator.py`, `crew_stock_research.py`, `crew_document_agents.py`, `crew_missing_docs_workflow.py`, `crew_maritime_compliance.py` — five orchestrators, mostly overlapping.

### 1.6 OCR / uploads
- OCR is Gemini Vision over a hand-built REST POST in `ocr_service.py` (~370 lines) with regex fallbacks and a "MOCK" mode that returns hardcoded fake certificates.
- **Document upload runs OCR + classification + Chroma write synchronously inside the FastAPI request handler.** A 50 MB PDF blocks one worker for the duration.
- Files are saved to **local disk** (`./data/uploads/documents`) — incompatible with multi-replica deployment.
- No chunked upload, no resumable upload, no virus scan, no MIME sniff (only extension-based check).

### 1.7 Frontend
- **Next 16 App Router on the outside, full-SPA on the inside.** The whole app is a `dynamic(import('./ClientApp'), { ssr: false })` mounted in a catch-all `[...path]/page.tsx`. Inside, `react-router-dom` `<BrowserRouter>` does the routing. This pattern throws away SSR, ISR, server components, server actions, edge rendering, file-system routing, and Next's image/font optimization.
- **`// @ts-nocheck` on every TypeScript file** — TypeScript is essentially disabled across the frontend. Found in 70+ files.
- **Three competing UI kits**: `antd@5`, `@mui/material@7`, `@radix-ui/*` (shadcn-style) + `tailwind@4`. Pick one.
- **Two motion libraries**: `framer-motion@11` *and* `motion@12.23` — the latter is the new name for the same package. Two copies in the bundle.
- **Five mapping libraries**: `mapbox-gl`, `@deck.gl/*`, `react-globe.gl`, `react-simple-maps`, `three`. All loaded.
- `bun.lock` is committed but README and `package.json` scripts use `npm`. Mixed package managers.
- No code-splitting beyond a single `dynamic()` import. No route-level chunking.
- 1278-line `UsersHome.tsx`, 1068-line `DemoPage.tsx`, 768-line `DocumentUploadPage.tsx`, 747-line `CompliancePanel.tsx`. God-components.

### 1.8 Realtime / demo
- `active_sessions = {}` is an **in-memory dict** in `demo_routes.py`. Won't survive restart, won't survive a second replica, no TTL, no cleanup.
- `CrisisAutoPlayController.run_demo_sequence(websocket)` blocks for ~3 minutes per the test comment. No backpressure, no resumption.
- WebSocket URL is hardcoded `ws://localhost:8000/api/demo/ws` — won't work behind TLS or proxies.

### 1.9 Background jobs / async
- **No queue.** Every "agent" call is synchronous. CrewAI runs in the request thread.
- `BackgroundTasks` is used for one classifier task that itself just `logger.warning`s and returns.
- No retry, no DLQ, no idempotency.

### 1.10 Caching, rate-limiting, observability
- **No Redis**, no caching of any kind.
- `slowapi` is configured but uses in-memory storage by default — useless across replicas.
- No OpenTelemetry, no Prometheus, no Sentry, no structured logs.
- Custom debug log writes to `/tmp/naviguard_debug.log` from inside business logic — debugging artifact left in prod paths.

### 1.11 Tests / CI
- One test file: `backend/tests/test_demo.py` (74 lines, prints debug info as the body of the test).
- No frontend tests.
- No CI (no `.github/workflows`, no `Makefile`, no `pre-commit`).

### 1.12 Deployment
- One backend `Dockerfile`, no `docker-compose.yml`, no Helm chart, no Terraform.
- README's "Quick Start" requires the developer to manually `source ~/python/bin/activate` against a venv that lives outside the repo.
- No health-check endpoint with proper readiness/liveness split (`/api/maritime/health` exists but is shallow).

### 1.13 Security
- Clerk secret key in `.env.local` (not in git, but on disks; **rotate on migration**).
- File-upload allowlist is extension-based; we trust the browser-supplied MIME.
- No CSP headers, no HSTS, no rate-limiting tied to user identity.
- No tenant isolation at the DB layer — application-level checks only.

### 1.14 Headline pillars are mostly mock data
Two of the four "pillars" (§2) — **Hedging** and **Visual risk** — are demo-grade fabrications today, not data products:
- **Market data is `random.gauss()`.** `modules/financial/market_data_service.py` generates fuel prices, FX rates, freight rates, futures curves, options premiums, VaR, and volume figures via `random.gauss()` / `random.randint()` from base constants. Every "current regime", "crisis indicator", and VaR number is sampled noise.
- **"Market sentinel" is hardcoded scenarios.** `modules/financial/market_sentinel_routes.py` decides Red Sea crisis vs. LA congestion vs. normal by string-matching origin/destination port codes (`is_europe_route = origin in ["CNSHA","CNNGB","CNSZX","Shanghai"] and destination in ["NLRTM","DEHAM","BEANR","Rotterdam"]`). The "AI analysis" text is a static string per branch.
- **Visual-risk has a canned report.** `modules/analytics/visual_risk_service.py` defines `DEMO_SUEZ_BLOCKAGE_RESULT` as a 60-line hand-written narrative ("Detected large container vessel… ~85 vessels… 98% confidence"). Every error path (`429`, non-200, JSON parse failure, no API key, no image) silently returns this canned result. The user can't tell from the response whether real Gemini Vision ran.
- **No external integrations.** Nothing connects to Argus / Platts / OPIS (fuel), ECB / exchange feeds (FX), Baltic / Drewry (freight), Sentinel-2 / Planet (satellite), MarineTraffic / Spire (AIS), IMO GISIS / EQUASIS (regulatory), UKMTO / Lloyd's List (crisis intel).

This is not solved by Supabase, pgvector, or queues. It needs a dedicated data-integration track (see §5.4 and §B13).

### 1.15 Several routers have NO authentication at all
Not weak — literally no `Depends(get_current_user)`. Listed by file:

| Router | Endpoints | LLM/cost surface |
| --- | --- | --- |
| `modules/financial/hedge_routes.py` | `/api/hedge/assess-risk`, `/api/hedge/recommend`, `/api/hedge/crisis-activate`, `/api/hedge/market-data`, `/api/hedge/report`, `/api/hedge/health` | Calls `hedge_agent` + market service per request; will call LLM in the new design. |
| `modules/analytics/visual_risk_routes.py` | `/api/visual-risk/analyze` (10 MB upload + Gemini Vision), `/api/visual-risk/demo`, `/api/visual-risk/scenarios`, `/api/visual-risk/status` | Multimodal LLM. |
| `modules/financial/market_sentinel_routes.py` | `/api/market-sentinel/run`, `/api/market-sentinel/health`, `/api/market-sentinel/agents/status` | Currently mock; will be LLM in v1. |
| `modules/demo/demo_routes.py` | `POST /api/demo/start`, `WS /api/demo/ws` (only checks `demo_id` UUID — no signature, no session bind) | WebSocket session is hijackable by anyone with the URL. |

Anyone on the internet can drain the Gemini quota for free today.

### 1.16 Frontend fabricates UN/LOCODEs
`frontend/views/UsersHome.tsx` constructs port codes by string-slicing `MAJOR_PORTS`:
```ts
const countryCode = countryCodeMap[port.country] || port.country.substring(0,2).toUpperCase();
const portCode    = port.name.replace(/\s+/g,"").substring(0,3).toUpperCase();
un_locode: `${countryCode}${portCode}`
```
Rotterdam becomes `NLROT`. The real UN/LOCODE is `NLRTM`. Compliance checks then match against zero rows in the BE `ports` table and silently degrade to "no port-specific requirements found." The seeded `ports` table and the FE-constructed codes have never agreed.

### 1.17 Cross-tenant write bug on document upload
```ts
// frontend/views/UsersHome.tsx
const uploadResult = await documentAPI.uploadDocument({
  customer_id: customerId,
  vessel_id: vesselId || 1,        // <-- silent fallback to vessel id 1
  ...
});
```
If provisioning succeeded for the customer but failed for the vessel, the upload is bound to whichever vessel happens to have id `1` in the database — i.e., a different tenant's vessel. The BE `_vessel_for_user` check catches the cross-tenant case as a 403, but the FE-side semantics are wrong by design.

### 1.18 Tenant identity is a request parameter
A dozen endpoints accept `customer_id` as Form/Query and then call `_assert_customer_id(...)` to verify it matches the auth user. This means:
- Tenant identity is client-supplied; one forgotten assert on a future endpoint = full data exfiltration.
- The schema drives every response model (`customer_id: int = Query(..., description="Customer ID")`) instead of the auth context driving it.
- It will not survive a switch to RLS, where the JWT must be the only source of `tenant_id`.

### 1.19 Performance bombs
- **N+1 to ChromaDB on vessel list.** `maritime_routes.list_vessels` instantiates `DocumentService()` and calls `get_vessel_documents(v.id)` inside a `for v in vessels` loop. 50 vessels = 50 Chroma round-trips per dashboard load.
- **No pagination anywhere.** Every list endpoint does `.all()` (customers, conversations, handoffs, vessels, vessel routes, vessel documents, customer documents, ports). Targets 1k sustained / 10k peak; will fall over at ~100 docs/customer.
- **Synchronous full-file buffer.** `document_service.upload_document` does `content = await file.read()` to load the entire 50 MB into RAM before checking the size limit. With 4 uvicorn workers and 8 concurrent slow uploads, you Slowloris yourself.
- **Race in `provision_user`.** Query-by-`clerk_id` → query-by-`email` → insert is non-transactional; the unique-email constraint will throw 500 on simultaneous first logins.

### 1.20 Boot-time side effects
The container fails closed on transient infra blips:
- `Base.metadata.create_all(bind=engine)` runs at module import in `main.py:52`. Brief Postgres unavailability → process dies before `/healthz` serves.
- `crew_orchestrator = get_crew_orchestrator()` runs at module import in `main.py:193`, dragging `crewai`, `langchain`, `transformers`, `tokenizers`, `sentence-transformers` into the import graph whether or not anyone calls them. Cold start is brutal even when CrewAI works.
- `MaritimeKnowledgeBase.__init__` initializes 6 Chroma collections at boot; `CrossEncoder` model downloads on first run.

### 1.21 Domain-model holes
- **`Vessel.imo_number` is globally unique, but `Vessel.customer_id` is the only owner.** A vessel can only belong to one customer in the schema. Real maritime workflows have an owner + charterer + manager + P&I club, all on the same hull. PRD §4 lists "Charterer / freight forwarder" as a primary persona; the schema can't model them.
- **`MaritimeRegulation.required_documents`, `applicable_vessel_types`, `applicable_regions`, `applicable_flag_states` are all `Text` JSON blobs.** Querying "which regulations require IOPP?" is a full table scan + Python parse. These should be many-to-many tables.
- **Document classification by bidirectional substring.** `categorize_document` in `maritime_routes.py` does `if cargo_doc in doc_type_lower or doc_type_lower in cargo_doc` against two manual sets. False positives are easy (e.g., short tokens like `"b_l"`, `"isf"`, `"clc"`).
- **OCR field regexes are English-only.** Project rule (§F9.1) makes Chinese first-class, but `ocr_service.FIELD_PATTERNS` only matches `Issue/Issued/Date of Issue`, `Valid Until`, etc. Chinese certificates (`签发日期`, `有效期至`) extract zero structured fields → expiry-date checks default to "unknown" → compliance defaults to "incomplete."
- **No verdict ↔ evidence binding.** `compliance_checks.summary_report` and `compliance_score` are stored, but nothing pins each finding to the exact retrieved span. PRD §2 says "every output cited"; the data model can't honour that today.
- **No LLM cost ledger.** Per-tenant token budgets (see §B7.5) cannot be billed, audited, or debugged without a `llm_calls` ledger row per call.

### 1.22 Compliance gaps in a compliance product
- **No GDPR / Schrems II story.** Uploaded certificates contain crew names, IMO IDs, and sometimes passport numbers. They flow through Gemini (US-region by default) and Supabase Storage (region per project, not pinned). EU charterers and EU flag-state operators will refuse to onboard without an SCC/DPA + region-pinning + model zero-retention assertions. PRD has none of this today.
- **No deletion / right-to-be-forgotten.** No `DELETE /api/maritime/documents/{id}`, no tenant-purge job, no Chroma/pgvector evidence-removal flow. GDPR Article 17 + maritime crew-privacy laws require both.
- **PII drips into debug logs.** Search queries (vessel IMOs + crew names), file metadata, and stack-trace context flow into `/tmp/naviguard_debug.log` and any future Sentry capture. No allowlist, no redactor.
- **No audit-trail-grade replay.** The new `agent_traces` table (§B7.4) needs to store retrieved chunk IDs and prompt + response hashes so a regulator query "show me how you concluded vessel X passes Tokyo MOU" can be answered byte-for-byte.

### 1.23 UX, branding, dead routes
- **Dashboard shows fabricated usage numbers.** `UsersHome.tsx` hardcodes `totalTokens: 5_000_000`, `usedTokens: 1_245_800`, `lastSession: "2026-01-26 10:30"`. Users see a billing/usage widget that has no relationship to reality.
- **`/pay` route + `PaymentPage.tsx` (599 LOC) + `payment.css` (1077 LOC) — but no billing primitives in the schema.** No `subscriptions`, `plans`, `invoices`, `payment_methods`. Either drop `/pay` from v1 or commit to Stripe in this release.
- **Demo session is hijackable.** `demo_id` is a UUID4 in the URL with no HMAC, no session bind, no auth. Anyone with the link can `confirm` decisions in the controller's state machine.
- **Two AdminPage trees.** `frontend/views/AdminPage.tsx` and `frontend/views/admin/`. Half-finished migration.
- **Port mismatch across the codebase.** `main.py` defaults to `8000`, `start_server.py` uses `8001`, `frontend/.env.local` sets `8001`, `demo_routes.py` returns `ws://localhost:8000/...` to clients. The demo WS URL handed to the FE is the wrong port.
- **`frontend/package.json` is still `"name": "frontend1"`,** and the `MissingClerkKey` UI tells users to edit `frontend1/.env.local`. User-visible.
- **`/api/analytics/dashboard` is powered by `backend/data/virtual_users.json`** — a static JSON file masquerading as live admin analytics.
- **`backend/scripts/test_compliance_check.py` is dead** — references `port_result.psc_regime`, `port_result.is_eca`, `port_result.expiring_documents`, `result.narrative_report`. None exist on `PortComplianceResult`. The "one test we have" `AttributeError`s on first run.

---

## 2. Vision (Plimsoll 1.0)

A maritime risk and compliance cockpit that any shipping operator, charterer, or freight CFO can self-serve in under 2 minutes:

> "Connect your fleet, paste your route, drop your certificates, and get a regulator-grade compliance verdict, a vessel-by-vessel risk map, and a hedge plan — all in real time, all auditable."

**Pillars**

| Pillar | What "best in class" means |
| --- | --- |
| **Compliance** | Per-port + per-flag-state checks against IMO + PSC + ECA + customs, with citation-grade RAG. |
| **Visual risk** | Live satellite + canal blockage + port congestion + weather, fed by Gemini Vision with tile caching. |
| **Hedging** | Fuel + FX + freight VaR with crisis-mode strategy generation, replayable. |
| **Trust** | Multi-tenant by default (Postgres RLS), every output cited, every agent run replayable. |

---

## 3. Success Metrics

| Metric | Today | Target (90 days) |
| --- | --- | --- |
| p95 API latency (read) | unknown | < 250 ms |
| p95 doc-upload-to-OCR-done | sync, ~10–60 s blocking | async, < 30 s, request returns in < 500 ms |
| Concurrent users sustained | demo-grade (1) | 1k sustained / 10k peak |
| Compliance check accuracy on labeled set | unmeasured | ≥ 92% top-1 |
| Frontend Lighthouse Perf (mobile) | ~30 (estimated) | ≥ 85 |
| Test coverage (backend) | ~0% | ≥ 60% on `modules/*` |
| Type errors (frontend) | TS disabled | 0 with strict TS |
| MTTR (paged incident) | n/a | < 30 min |
| Cold start (backend container) | ~30 s+ (CrossEncoder dl) | < 8 s |

---

## 4. Target Users & Top Use Cases

| Persona | Key use cases |
| --- | --- |
| Vessel ops manager | Upload certificates, validate route compliance, see expiring docs |
| Charterer / freight forwarder | Compare risk across multiple routes, get hedge recommendations |
| Maritime compliance officer | Generate audit-ready compliance reports per voyage |
| CFO / treasury | Set hedge ratios, view crisis-mode protocols, replay events |
| Internal admin | Monitor tenants, usage, agent runs, costs |

---

## 5. New Tech Stack — Decisions & Rationale

> Rule: pick the **smallest** stack that hits the goals. Every dependency must justify itself.

### 5.1 Stack-level decisions

| Concern | Today (pre-1.0 prototype) | Plimsoll 1.0 | Why |
| --- | --- | --- | --- |
| Auth + identity | Clerk (SaaS) | **Supabase Auth** (self-host via `supabase/docker`) | Self-hostable, free at MAU scale, integrates with Postgres RLS so the database itself enforces tenancy. |
| Primary DB | SQLite default + Postgres optional | **Supabase Postgres 15** + **PgBouncer** | One ACID source of truth. RLS policies replace ad-hoc Python checks. |
| Vector store | ChromaDB Cloud | **pgvector + pgvectorscale** (in the same Postgres) | One DB, one backup, JOINs across vectors and metadata, RLS-aware retrieval, no Chroma vendor cost. |
| Hybrid search | unused BM25 | **`pgvector` + Postgres `tsvector` (BM25)** with a re-ranker | True hybrid search in SQL. Keeps the cross-encoder as a re-rank step, not a per-query cost on the hot path. |
| Object storage | local disk | **Supabase Storage** (S3-compatible, signed URLs, RLS) | Multi-replica safe, pre-signed direct browser uploads. |
| Realtime | bespoke WebSocket | **Supabase Realtime** (Postgres CDC) for state, **WebSockets** only for the demo replay | Backed by Postgres logical replication. No in-memory state for normal product features. |
| Job queue | none | **`pgmq` (Supabase Queues)** OR **Redis + Arq/RQ** | Heavy work (OCR, CrewAI, report generation) runs out-of-band, retries, idempotency, DLQ. Default = `pgmq` to keep the stack simple; Redis tier added when QPS requires it. |
| Cache + rate limit | none / in-mem | **Redis (Dragonfly OK)** | Distributed cache for KB lookups, market data; SlowAPI's Redis backend. |
| API framework | FastAPI 0.115 | **FastAPI 0.115** (kept) + `httpx` only (drop `requests`) | Already good. Just remove the dual HTTP clients. |
| LLM router | direct OpenAI / Gemini calls + CrewAI | **LiteLLM** (model router) + **a thin in-house Agent class** | Replace CrewAI for the compliance and document workflows with plain Python + LiteLLM. Keep a single `crewai` integration only where multi-agent reasoning genuinely helps (route compliance debate). |
| OCR | hand-rolled Gemini REST | **Gemini 2.5 Flash via LiteLLM** + a **PaddleOCR / docTR fallback** | One canonical multimodal call; deterministic fallback when Gemini quota is hit. |
| Migrations | `create_all` | **Alembic** with autogenerate + a `make db-upgrade` target | Real schema evolution. |
| Frontend framework | Next 16 SPA-shell | **Next.js 15 App Router (proper)** + Server Components + Server Actions + streaming | Use what we're paying for. RLS-aware data fetching directly in RSC via Supabase server client. |
| UI kit | antd + MUI + Radix + Tailwind | **shadcn/ui (Radix + Tailwind)** only | One system. Delete antd + MUI. |
| Map | mapbox-gl + deck.gl + react-globe.gl + react-simple-maps + three | **MapLibre GL JS** + **deck.gl** (only) | Open-source MapLibre instead of Mapbox (no token cost / lock-in). deck.gl on top. Drop the rest. |
| State | scattered hooks | **TanStack Query** for server state + **Zustand** for client UI state | Cancellable, cached, deduped, suspense-friendly. |
| Animation | framer-motion + motion (dup) | **motion** only | Same library, just one. |
| Testing | none | **pytest + pytest-asyncio + httpx-test + factoryboy** (BE), **Vitest + React Testing Library + Playwright** (FE) | Realistic coverage targets. |
| Observability | none | **OpenTelemetry → Grafana stack** + **Sentry** + **structlog** | Traces, logs, metrics, errors. |
| Container orchestration | one Dockerfile | **`docker compose`** for dev, **Fly.io / Railway / GKE Autopilot** for prod | One-command local stack. |
| CI | none | **GitHub Actions**: lint + typecheck + tests + build + container scan + Trivy + Alembic check | Required for two-dev safety. |

### 5.2 Why Supabase specifically (and what we use vs. don't)

| Supabase capability | Use it? | Notes |
| --- | --- | --- |
| Supabase Auth (GoTrue) | **Yes** | Email/OAuth/magic-link/SSO. Issues JWTs we verify in FastAPI via JWKS. |
| Supabase Postgres | **Yes** | Single source of truth. |
| `pgvector` | **Yes** | Replaces Chroma. Stored alongside owned-by foreign keys → RLS enforces tenant scoping on retrieval. |
| Supabase Storage | **Yes** | Replaces local disk. Pre-signed direct uploads from the browser, then a webhook → backend creates the DB row + enqueues OCR. |
| Supabase Realtime | **Yes** | Live "compliance check progress", "doc OCR'd", "hedge alert". CDC on Postgres tables; we stream events to the FE without a custom WS layer. |
| Supabase Edge Functions (Deno) | **No (default)** | We keep heavy logic in FastAPI. Edge Functions only for tiny webhooks (e.g., storage upload events) where Deno is convenient. |
| Supabase Studio | **Yes (dev)** | Free dashboarding for schema, RLS, auth users. |
| Supabase Queues (`pgmq`) | **Yes** | Default queue for OCR/CrewAI/reports. |

### 5.3 Library-level swaps (concrete)

| Drop | Add | Reason |
| --- | --- | --- |
| `@clerk/clerk-react`, backend `clerk_auth.py`, `security.py` | `@supabase/ssr`, `@supabase/supabase-js`, backend `supabase_auth.py` (verifies Supabase JWT via JWKS) | Single auth source, RLS-friendly. |
| `chromadb`, `langchain-chroma` | `pgvector` (`sqlalchemy-pgvector` or raw SQL) | One DB. |
| `langchain`, `langchain-google-genai` | `litellm` (+ `google-generativeai` only where Gemini-specific features needed) | Less abstraction, one router. |
| `crewai` (in 4 of 5 places) | Plain `Agent` class + LiteLLM tool-calls. Keep CrewAI only for the multi-agent compliance debate. | Lighter, debuggable. |
| `psycopg2-binary` | `psycopg[binary,pool]` (psycopg 3) | Async-friendly, modern. |
| `requests` | `httpx` only | One HTTP client. |
| `python-jose` | `pyjwt[crypto]` only | Active maintenance. |
| `mapbox-gl` | `maplibre-gl` | Open-source, no token. |
| `react-globe.gl`, `react-simple-maps`, raw `three` (where map only) | `deck.gl` 3D layers on `maplibre-gl` | One renderer. |
| `antd`, `@mui/material`, `@ant-design/charts`, `@ant-design/icons` | `shadcn/ui` + `recharts` (already there) + `lucide-react` (already there) | One UI system. |
| `framer-motion` | `motion` only | Same lib. |
| `react-router-dom` | Next App Router (file-system routing) | Native to Next. |
| `axios` | `fetch` (server) + `@tanstack/react-query` (client) | Smaller bundle. |
| `slowapi` (default mem) | `slowapi[redis]` or `fastapi-limiter` | Multi-replica safe. |

### 5.4 External data integrations (the missing pillars)

The current build mocks every market signal it claims to provide. Plimsoll 1.0 must wire each pillar to a primary source. We pick **one default + one fallback** per category to keep negotiating leverage and avoid single-vendor risk.

| Pillar | Signal | Default provider | Fallback | Cadence | Notes |
| --- | --- | --- | --- | --- | --- |
| Hedging | Bunker fuel (VLSFO/HSFO/MGO) | **Argus Marine Fuels** or **OPIS** | Platts | Daily settlement | Singapore MOPS + Rotterdam barges minimum. |
| Hedging | Brent / WTI / Gas oil futures | **ICE / CME** market-data feed | Refinitiv | Real-time (delayed OK in v1) | Needed for cross-hedge basis. |
| Hedging | FX (USD/EUR/CNY/JPY/SGD) | **ECB reference rates** + **OANDA** | exchangerate.host (dev) | Daily + intraday | EU-domiciled source preferred. |
| Hedging | Freight (Capesize/Panamax/Supramax/Handysize) | **Baltic Exchange** indices | **Drewry** WCI for containers | Daily | License negotiation needed; mock until signed. |
| Visual risk | Satellite imagery | **Sentinel-2 via Copernicus DataSpace** (free, EU-hosted) | **Planet Labs** SkySat (commercial, higher cadence) | Per request, tile cache | Tile cache in Supabase Storage. |
| Visual risk | AIS vessel tracking | **Spire Maritime** | **MarineTraffic** | 1–5 min | Required for "where is the queue?" queries. |
| Visual risk | Port congestion | **portcast.io** or **Sea-Intelligence** | derived from AIS | Hourly | Vendor-priced; v1 may derive from AIS. |
| Compliance | IMO conventions text + amendments | **IMO GISIS** | scraped + curated PDFs | Quarterly | Must store provenance hash. |
| Compliance | Vessel particulars / detentions | **EQUASIS** | **Lloyd's List Intelligence** | Daily | Detentions = high-signal compliance feature. |
| Compliance | Port State Control records | **Paris MOU**, **Tokyo MOU**, **USCG PSIX** | scraped | Weekly | Per-MOU adapters; normalize to one schema. |
| Crisis intel | Maritime security advisories | **UKMTO** + **MSCHOA** RSS | manual curation | Real-time push | Critical for Red Sea / Gulf of Aden / Singapore Strait. |
| Crisis intel | Sanctions + entity screening | **OFAC SDN**, **EU consolidated list**, **UK OFSI** | OpenSanctions | Daily | Required before charterer/CFO persona is real. |
| Weather | Marine weather + tropical advisories | **NOAA** + **ECMWF** | **StormGeo** | 6-hourly | For ETA and ECA-zone routing. |

**Rules of engagement:**
- Every external signal lands in Postgres via a typed adapter under `backend/integrations/<provider>/`. No business logic talks to a vendor SDK directly.
- Every adapter records `provenance(source, fetched_at, source_record_id, hash)` — for citations and replay.
- Every signal has a **mock mode** behind `INTEGRATION_<NAME>_MODE=live|mock`, with deterministic fixtures in `data/fixtures/<provider>/` so dev/CI never hits a paid API.
- Cost guards (per-provider monthly budgets) enforced via Redis counters.
- Vendor selection is captured per integration in `docs/decisions/0010-fuel-data-provider.md`, `0011-ais-provider.md`, etc. (ADRs).

> **Until §5.4 ships, the Hedging and Visual-risk pillars stay flagged "demo" in-product (banner + API field `mode: "demo"`).** The product story changes from "we have hedging" to "hedging is a roadmap pillar with a working demo." That's honest; the current state isn't.

---

## 6. New Architecture (one diagram, one paragraph)

```
                  ┌─────────────────────────────────────────────┐
                  │              Browser (Next.js 15)           │
                  │  RSC + Server Actions + TanStack Query      │
                  └─────────┬──────────────────┬────────────────┘
                            │ HTTPS            │ wss (Realtime)
                            ▼                  ▼
  ┌──────────────────────────────┐    ┌────────────────────────────┐
  │  FastAPI (Python 3.12)       │    │  Supabase Realtime         │
  │  /api/* (compliance, hedge,  │◄───┤  (Postgres CDC → WS)       │
  │  visual-risk, demo, admin)   │    └────────────────────────────┘
  └──────┬───────────┬───────────┘
         │           │
         │           │ enqueue (OCR / CrewAI / Reports)
         │           ▼
         │   ┌──────────────────────────────┐
         │   │   Worker pool (Arq / RQ)     │
         │   │   - OCR (Gemini Vision)      │
         │   │   - Compliance crew          │
         │   │   - Hedge report             │
         │   │   - Visual-risk batches      │
         │   └────────────┬─────────────────┘
         │                │
         ▼                ▼
  ┌────────────────────────────────────────────────────────────┐
  │  Supabase (single backend service)                         │
  │  ├── Postgres 15  (tenants, vessels, routes, docs metadata)│
  │  ├── pgvector     (RAG embeddings + per-tenant RLS)        │
  │  ├── pgmq         (job queue mirror, optional)             │
  │  ├── Storage (S3) (uploaded certificates, signed URLs)     │
  │  ├── Auth (GoTrue)(JWT, OAuth, magic-link)                 │
  │  └── Realtime     (CDC streamed to browser)                │
  └────────────────────────────────────────────────────────────┘
                       ▲
                       │ pgvector reads
                       │
  ┌────────────────────────────────────────────────────────────┐
  │  External LLMs/services (via LiteLLM)                      │
  │  Gemini 2.5 / GPT-4o / Claude / Mistral / OpenRouter      │
  └────────────────────────────────────────────────────────────┘

  ┌────────── Cross-cutting ──────────┐
  │ Redis (cache + rate limit)        │
  │ OpenTelemetry → Grafana / Tempo   │
  │ Sentry                            │
  │ Trivy / Renovate / pre-commit     │
  └───────────────────────────────────┘
```

**One-paragraph version:** the browser talks to Next.js (server components for reads, server actions/RPC for writes), Next.js talks to FastAPI for all heavy/business logic, FastAPI talks to Supabase Postgres (which is also our vector DB and our queue), and any work over ~500 ms (OCR, CrewAI, report generation, satellite analysis) is enqueued to a worker pool. RLS in Postgres is the single source of authorization — Python code never trusts request-supplied tenant IDs.

---

## 7. Team Split & Working Agreement

We are 2 engineers. We work on **disjoint surfaces** so neither blocks the other.

### 7.1 Track A — **Backend (You)**
**Owns:**
- Everything under `backend/` (FastAPI, workers, migrations, scripts).
- Supabase project: schema, RLS policies, Edge Functions, storage buckets, auth providers config.
- The Supabase JWT verification module the FE uses on the server side (we publish the public JWKS URL + a tiny `validate_jwt()` helper).
- `docker-compose.yml` for the entire local stack (FE included as a service).
- CI for backend (Python tests, Alembic check, container scan).
- All AI/agent code, vector store schema and ingestion scripts.

**Doesn't touch:**
- `frontend/` source files.
- `.next/`, `package.json`, npm scripts.

### 7.2 Track B — **Frontend (Teammate)**
**Owns:**
- Everything under `frontend/` (App Router, components, design system migration, TanStack Query layer, Realtime subscriptions, server actions that call FastAPI).
- The Supabase client wrappers (`@supabase/ssr` server + browser client).
- Next.js middleware for auth / locale / cookies.
- CI for frontend (lint, typecheck, vitest, Playwright).
- Storybook (optional, recommended).

**Doesn't touch:**
- `backend/` source files.
- Supabase schema / RLS / Edge Functions.

### 7.3 Contract between tracks (single source of truth)

These are the only artifacts the two tracks share. **Changes to any of them require a PR with both reviewers approving.**

1. **`/openapi.json`** — generated by FastAPI. The frontend types come from this via `openapi-typescript`. No manual hand-typing of API responses on the FE.
2. **`docs/contracts/auth.md`** — Supabase JWT format, where it's stored, how it's refreshed, what claims FastAPI requires.
3. **`docs/contracts/realtime.md`** — channel names, event payloads (e.g., `tenant:{tenant_id}:doc.ocr.completed`).
4. **`docs/contracts/storage.md`** — bucket names, path conventions (`tenant_id/vessel_id/yyyy/mm/uuid.pdf`), upload-policy SQL.
5. **`docs/contracts/db.md`** — public-schema table contracts that the FE may read directly via Supabase client (others must go through FastAPI).
6. **`packages/shared-types/`** (optional) — a tiny TS package generated from OpenAPI + Supabase typegen, consumed by FE.

> Rule: **the FE never imports anything from `backend/`** and the BE never imports from `frontend/`. The only crossings are HTTP, Realtime, and the OpenAPI-derived types.

---

## 8. Backend Track — Detailed Tasks

> Each milestone has an explicit **definition-of-done** and a list of files. Each task is sized so it can be PR'd in 0.5–2 days.

### B0 — Repo cleanup & ground rules (Day 0–1)

| ID | Task | DoD |
| --- | --- | --- |
| B0.1 | Delete dead "DJI sales" code paths | Remove `crew_orchestrator.py` (or rewrite for maritime), the `/api/chat` + `/api/handoff` + `/api/classify/*` + `/api/customers` + `/api/conversations` + `/api/messages/human` endpoints, the unused `Conversation/Message/Handoff/KBDocument` tables. Tag them deprecated for one release first if desired. |
| B0.2 | One auth module | Delete `shared/auth/security.py`. Keep one. |
| B0.3 | One HTTP client | Remove `requests`; use `httpx` everywhere. |
| B0.4 | Remove `_debug_log` calls + `/tmp/naviguard_debug.log` (legacy) writes from request paths | Replace with `structlog` debug-level logs. |
| B0.5 | Add `pyproject.toml` + `uv` (or `poetry`) | Replaces freeform `requirements.txt`; pin and lock. |
| B0.6 | Add `pre-commit`: `ruff`, `ruff format`, `mypy --strict-equality`, `bandit`, `detect-secrets` | Hooks run on every commit. |
| B0.7 | **Audit + close every unauthenticated route.** | Add `Depends(get_current_user)` to every router under `modules/financial/`, `modules/analytics/visual_risk_routes.py`, `modules/demo/demo_routes.py`. CI gate: `scripts/audit_unauthed_routes.py` walks the FastAPI app, fails if any route outside an explicit allowlist (`/healthz`, `/readyz`, `/openapi.json`, `/docs`, `/redoc`) has no auth dependency. Per-tenant rate limits applied on top. |
| B0.8 | **Rename frontend package + paths.** | `frontend/package.json` `name` → `plimsoll-web`. Replace `frontend1/` strings in user-visible UI (e.g., `MissingClerkKey`). Optional: rename folder to `web/`. |
| B0.9 | **Fix port mismatch.** | Settle on `8000` for backend in dev. Update `start_server.py`, `frontend/.env.local.example`, `demo_routes.py` `ws://` URL builder to use a config-derived host. |
| B0.10 | **Delete or fix `scripts/test_compliance_check.py`.** | Either move under `tests/integration/` as a real pytest with correct attributes, or delete. The current file references non-existent `port_result.psc_regime`, `is_eca`, `expiring_documents`, `result.narrative_report` and crashes on first run. |

### B1 — Supabase bootstrap (Week 1)

| ID | Task | DoD |
| --- | --- | --- |
| B1.1 | Add `supabase` CLI + `supabase/` folder to repo | `supabase start` brings up Postgres, Studio, Auth, Storage, Realtime locally. |
| B1.2 | Provision local `docker-compose.yml` that includes Supabase, FastAPI, worker, Redis, frontend | `docker compose up` is the only command needed for a new dev. |
| B1.3 | Choose Supabase deployment target | Document: "self-host via `supabase/docker` for prod" or "managed Supabase". (Default: managed in prod, self-host in dev.) |
| B1.4 | Configure auth providers in Supabase (email + Google + GitHub OAuth) | Login works locally. |
| B1.5 | Generate JWT signing keys + publish JWKS URL | FastAPI can verify tokens. |

**Deliverables:** `supabase/`, `docker-compose.yml`, `.env.example` (no secrets).

### B2 — Auth migration (Clerk → Supabase) (Week 1–2)

| ID | Task | DoD |
| --- | --- | --- |
| B2.1 | New `shared/auth/supabase_auth.py` | Verifies Supabase HS256/RS256 JWTs via JWKS, returns a `User(id, email, role, tenant_id, claims)` model. |
| B2.2 | Replace `Depends(get_current_user)` everywhere | All routes use the new dep. Same `User` shape. |
| B2.3 | Schema: `tenants`, `tenant_members(role)`, `auth.users` link | Tenant model added. Each user can belong to ≥1 tenant. |
| B2.4 | Backfill script `scripts/migrate_clerk_to_supabase.py` | Idempotent. Maps `Customer.clerk_id` → `auth.users.id`. We replace `clerk_id` with `auth_user_id` (UUID FK to `auth.users.id`). |
| B2.5 | Delete `@clerk/*` references from BE code & docs | `rg -i clerk backend/` returns nothing. |
| B2.6 | Update `.agent/rules/API.md` & READMEs | Reference Supabase only. |

### B3 — Postgres + pgvector + RLS (Week 2)

| ID | Task | DoD |
| --- | --- | --- |
| B3.1 | Stand up Postgres 15 + extensions: `pgvector`, `pg_trgm`, `pg_stat_statements`, `pgcrypto`, `pgmq`, `vector` | Migration applies cleanly. |
| B3.2 | Initial Alembic migration | Drops legacy DJI tables. Adds: `tenants`, `vessels`, `vessel_routes`, `ports`, `port_regulations`, `documents` (metadata), `document_chunks` (with `embedding vector(768)`), `compliance_runs`, `agent_traces`, `hedge_assessments`, `audit_log`. |
| B3.3 | RLS policies | Every tenant-scoped table has `USING (tenant_id = auth.jwt() ->> 'tenant_id')` (or via `tenant_members`). FastAPI sets `set_config('request.jwt.claim.sub', ...)` per request. |
| B3.4 | `psycopg[binary,pool]` + connection pool tuning | `pool_size=20`, `max_overflow=10`, `pool_pre_ping=True`. Async engine via `asyncpg` for read paths. |
| B3.5 | PgBouncer in `docker-compose` | Transaction-pooling on port 6543. |
| B3.6 | **Domain refactor: vessels are not owned by one customer.** | Replace `Vessel.customer_id` with `vessel_memberships(vessel_id, tenant_id, role: owner\|charterer\|manager\|operator\|p_and_i, valid_from, valid_to)`. `Vessel` becomes globally unique by IMO with no owner FK. RLS uses membership join. Migration backfills existing rows as `role='owner'`. |
| B3.7 | **UN/LOCODE seed.** | One-shot ingestion of the UNECE UN/LOCODE dataset (~106k codes) into `ports`. Source `data/seed/unlocode/` checked-in CSV with provenance. FE pulls codes from BE only — no client-side construction. |
| B3.8 | **Many-to-many tables for regulation applicability.** | Replace JSON columns on `MaritimeRegulation` (`applicable_vessel_types`, `applicable_regions`, `applicable_flag_states`, `required_documents`) with proper join tables. Indexed lookups for "which regs apply to bulk carrier under PA flag in EU?" |
| B3.9 | **Tenant identity from JWT only.** | Remove every `customer_id` Form/Query param from request schemas. Auth dependency injects `tenant_id`; route handlers cannot read it from the request body. CI grep gate: `rg "customer_id.*Form\|customer_id.*Query" backend/modules` returns nothing. |

### B4 — Vector store migration (Chroma → pgvector) (Week 2–3)

| ID | Task | DoD |
| --- | --- | --- |
| B4.1 | New `modules/maritime/kb_pgvector.py` | Replaces `MaritimeKnowledgeBase`. One table per "collection" via a `kind` enum column. Embeddings stored as `vector(768)`. |
| B4.2 | Hybrid retrieval | One SQL function `kb_search(query_text, tenant_id, kind, top_k)` that does (a) `tsvector` BM25 + (b) `<=>` cosine + (c) RRF merge. |
| B4.3 | Optional cross-encoder rerank | Disabled by default; enabled via env flag. Loaded as a worker-side service, **not** at API cold start. |
| B4.4 | Ingestion scripts ported | `scripts/ingest_maritime_data.py`, `load_port_data.py`, `load_maritime_regulations.py` write to pgvector. Idempotent (`ON CONFLICT DO NOTHING` on a content hash). |
| B4.5 | Drop `chromadb`, `langchain-chroma` | Removed from deps. `cross-encoder/ms-marco-MiniLM-L-6-v2` no longer downloaded at boot. |
| B4.6 | Embedding model registry | One config entry: `EMBEDDING_MODEL=gemini-embedding-001` (or a swap to `text-embedding-3-large`). |
| B4.7 | Backfill from existing `vectordb/` if any data exists | One-shot script. |
| B4.8 | **Embedding model versioning.** | Every `document_chunks` row carries `embedding_model_id` (e.g., `gemini-embedding-001`) + `embedding_model_version` (provider revision string) + `embedding_dim`. `kb_search` filters by the *current* cohort. Model swap = enqueue re-embed job per tenant; old + new coexist while transitioning. ADR `docs/decisions/0002-embedding-versioning.md`. |
| B4.9 | **Bind every retrieval result to its evidence.** | `kb_search` returns `(chunk_id, source_document_id, char_offset_start, char_offset_end, snippet, score)`. Compliance/agent outputs persist `evidence_chunk_ids[]` so any verdict can be replayed and cited. |

### B5 — Storage + uploads pipeline (Week 3)

| ID | Task | DoD |
| --- | --- | --- |
| B5.1 | Create Supabase Storage buckets: `documents`, `satellite-cache`, `reports` | RLS policies in place. |
| B5.2 | New upload flow: FE asks BE for a signed upload URL → FE PUTs file to Storage → Storage webhook → BE creates `documents` row → enqueues OCR job | `/api/maritime/documents/upload` endpoint becomes a thin "create + enqueue" handler returning `{document_id, job_id}`. Old multipart endpoint kept behind `?compat=1` for one release. |
| B5.3 | Storage webhook handler (Edge Function or FastAPI endpoint w/ HMAC) | Verified, idempotent. |
| B5.4 | Migrate any existing files in `backend/data/uploads/` | Batched copy script. |
| B5.5 | **Streaming, sized uploads.** | Upload size enforced **before** the bytes hit the FastAPI worker: pre-signed URL puts files directly into Storage with a per-tenant cumulative cap (Redis counter). For the legacy `?compat=1` path, switch to chunked `await file.stream()` with a running byte counter that aborts at the limit. **No `await file.read()` of an unbounded stream.** |
| B5.6 | **OCR pipeline runs in worker, not request.** | `documents` row created with `status='queued'`; `ocr_document` job emits Realtime event on completion; FE subscribes and updates state. Request handler returns ≤ 200 ms. |
| B5.7 | **Chinese OCR + field extraction.** | Add Chinese regex set (`签发日期`, `有效期至`, `船舶识别号`, etc.) to `FIELD_PATTERNS`. Detect language (langdetect or Gemini hint) and pick rule set. Test with at least 5 Chinese certificate fixtures committed under `tests/fixtures/ocr/zh/`. Acceptance: ≥80% field-extraction recall on the fixture set. |

### B6 — Job queue + worker (Week 3–4)

| ID | Task | DoD |
| --- | --- | --- |
| B6.1 | Pick `pgmq` (default) or `arq + redis` | Decision recorded in `docs/decisions/0001-job-queue.md` (ADR). |
| B6.2 | Define jobs: `ocr_document`, `run_compliance_crew`, `generate_compliance_report`, `analyze_satellite_image`, `recompute_hedge_assessment` | Each has a typed payload + return shape. |
| B6.3 | Worker container | `python -m worker.main` consumes the queue, runs jobs, emits Realtime events on completion. |
| B6.4 | Idempotency + retry policy | Each job has an idempotency key (= deterministic hash of inputs); max 5 retries with exponential backoff; DLQ table. |

### B7 — LLM/agents refactor (Week 4)

| ID | Task | DoD |
| --- | --- | --- |
| B7.1 | Introduce `litellm` as the single LLM gateway | One `llm_call()` helper. Provider selectable via env. |
| B7.2 | Replace `crew_orchestrator.py` (the dead DJI one) | Delete or rewrite for maritime general-purpose RAG. |
| B7.3 | Replace `crew_document_agents.py`, `crew_missing_docs_workflow.py`, `crew_stock_research.py` with **plain Python `Agent` classes** that use LiteLLM tool-calling | CrewAI dependency reduced to **one** workflow (compliance debate), or removed entirely. |
| B7.4 | Persist every agent run | New `agent_traces` table: prompt, tools called, tokens, latency, cost. |
| B7.5 | Add cost guard | Per-tenant daily token budget; refuse over budget with 402-style response. |
| B7.6 | **LLM cost ledger.** | New `llm_calls` table: `(id, tenant_id, agent_traces_id, provider, model, prompt_tokens, completion_tokens, total_tokens, usd_cost, latency_ms, created_at, request_hash, response_hash)`. Every `llm_call()` writes one row. Aggregation views per tenant per day per model. Used by §B7.5 budget, §F2.6 dashboard, and any future billing. |
| B7.7 | **Provenance/citations on every agent output.** | Every agent response includes a structured `citations: [{kind: "regulation"\|"document", id, span, snippet, source_url}]`. Empty citations array → response is rejected and logged as a quality regression. |
| B7.8 | **Replace `crew_orchestrator.chat()` `AttributeError` bugs.** | `self.kb` and `self.fallback_detector` are read inside `chat()` but never assigned in `__init__`. Either delete this method (preferred — DJI legacy) or wire them properly with the new pgvector KB. |

### B8 — Demo / WebSocket refactor (Week 4)

| ID | Task | DoD |
| --- | --- | --- |
| B8.1 | Move demo state to Postgres (`demo_sessions` table) | No more `active_sessions = {}`. Multi-replica safe. |
| B8.2 | Use Supabase Realtime for demo events instead of bespoke WebSocket | If we keep WS, ensure it goes through a sticky-session-friendly proxy and sends pings. |
| B8.3 | Make `run_demo_sequence` cooperative (yields events, doesn't block) | A 3-min demo no longer blocks a worker for 3 minutes. |
| B8.4 | **Sign demo session tokens.** | `demo_id` becomes a JWT (or HMAC token) bound to either an authenticated user or a short-lived public viewer session. WS handshake verifies signature + nonce. No more "anyone with the URL can step the demo." |
| B8.5 | **Label demo content as demo.** | Every WebSocket event payload carries `mode: "demo"\|"live"`. FE shows a persistent "DEMO" banner. The hardcoded `CRISIS_TIMELINE` and `COT_DATA` move to `data/fixtures/demo/` and are loaded explicitly — they are never returned from a `mode: "live"` endpoint. |

### B9 — Observability + ops (Week 4–5)

| ID | Task | DoD |
| --- | --- | --- |
| B9.1 | OpenTelemetry traces + metrics | Auto-instrument FastAPI, SQLAlchemy, httpx; export OTLP. |
| B9.2 | Structured logs via `structlog` | JSON in prod, pretty in dev. |
| B9.3 | Sentry SDK | Errors, perf, release tagging via git SHA. |
| B9.4 | Healthchecks split | `/healthz` (liveness), `/readyz` (DB+Redis+Storage). |
| B9.5 | Rate-limit via SlowAPI + Redis | Per-tenant + per-IP buckets. |

### B10 — Security hardening (Week 5)

| ID | Task | DoD |
| --- | --- | --- |
| B10.1 | Strict file validation | `python-magic` MIME sniff, max 50 MB enforced server-side, antivirus optional (`clamav`). |
| B10.2 | Add CSP, HSTS, frame-ancestors | Set via FastAPI middleware. |
| B10.3 | Audit log table | Every admin action + every doc access. |
| B10.4 | Secret management | All env via Supabase Vault or Doppler/1Password connect. **Rotate Clerk + Gemini + Mapbox keys** as part of migration. |
| B10.5 | Threat-model doc | `docs/security/threat-model.md`. |
| B10.6 | **PII redactor for logs + Sentry.** | Central `redact()` covers IMO numbers, crew names, passport numbers, email addresses, JWTs, file paths under `uploads/`, prompts/responses. Applied as a `structlog` processor and a Sentry `before_send` hook. Test with golden samples. |
| B10.7 | **Right-to-be-forgotten / tenant purge.** | `DELETE /api/admin/tenants/{id}` schedules a job that hard-deletes Postgres rows (cascade), Storage objects, pgvector chunks, `llm_calls`, `agent_traces`, and Realtime channels. Soft-delete window of 30 days with restore; hard-delete after. Audit-logged. |
| B10.8 | **Per-document deletion API.** | `DELETE /api/maritime/documents/{id}` removes Storage object + DB row + all `document_chunks` referencing it + any `compliance_runs.evidence_chunk_ids` references. Tenant-scoped, audit-logged. |
| B10.9 | **Sanctions/entity screening.** | Before any "vessel created / charter assigned / port-of-call set" mutation, screen the IMO + the registered owner against OFAC SDN + EU + UK lists. Block + alert on a hit. (Powered by §5.4.) |

### B11 — Testing + CI (Week 5)

| ID | Task | DoD |
| --- | --- | --- |
| B11.1 | `pytest` test pyramid | Unit tests for `compliance_service`, `document_service`, `kb_pgvector`, `hedge_agent`; integration tests with a disposable Postgres via `testcontainers`. |
| B11.2 | Coverage gate ≥ 60% | CI fails below threshold. |
| B11.3 | Contract tests | Snapshot `/openapi.json`; fail if a breaking change is introduced without a migration. |
| B11.4 | GitHub Actions | `lint → typecheck → test → build → trivy → push image`. |
| B11.5 | **Compliance evaluation harness (gates the 92% target).** | Build a curated eval set under `data/eval/`: `compliance_top1.jsonl` (≥200 cases of `{vessel_profile, port_call, expected_finding_ids}`), `kb_retrieval.jsonl` (≥300 query→relevant-chunk-ids), `ocr_extraction.jsonl` (≥50 docs with golden field values, EN + ZH). `scripts/eval_compliance.py`, `scripts/eval_retrieval.py`, `scripts/eval_ocr.py` run in CI on every PR touching `modules/maritime/` or `modules/orchestration/`. Top-1 ≥ 92%, retrieval recall@5 ≥ 90%, OCR recall ≥ 80%. Below threshold = CI red. |
| B11.6 | **Property + load tests for hot paths.** | `hypothesis` for compliance-rule evaluation; `locust` scenario for "200 concurrent vessel-detail loads", "20 concurrent 50 MB uploads", "100 concurrent KB searches". Pass/fail thresholds documented. |

### B12 — Deploy (Week 6)

| ID | Task | DoD |
| --- | --- | --- |
| B12.1 | Production target | Pick: Fly.io (recommended for cost+simplicity) / Railway / GCP Cloud Run + Cloud SQL. |
| B12.2 | Self-host Supabase via `supabase/docker` (or managed Supabase Pro) | Backups, PITR, monitoring. |
| B12.3 | Blue/green or rolling deploy | Verified via smoke-test workflow. |

### B13 — External data integrations (Week 5–8, parallel) — see §5.4

> Owner: backend lead + 1 dedicated integration engineer. Runs in parallel with B7–B11. **Until this milestone ships, hedging + visual-risk + market-sentinel surfaces are flagged `mode: "demo"` in-product.**

| ID | Task | DoD |
| --- | --- | --- |
| B13.1 | Integrations skeleton | `backend/integrations/<provider>/` package per source. Common interface: `fetch(query) -> records`, `record_provenance(record)`, mock mode via `INTEGRATION_<NAME>_MODE`. ADR per provider in `docs/decisions/`. |
| B13.2 | **Bunker fuel** (Argus or OPIS, fallback Platts) | Daily prices for VLSFO/HSFO/MGO at Singapore + Rotterdam minimum. Stored in `market_prices(provider, instrument, region, date, value, currency, hash)`. |
| B13.3 | **FX** (ECB + OANDA) | USD/EUR/CNY/JPY/SGD daily + hourly. Same table. |
| B13.4 | **Freight** (Baltic Exchange + Drewry WCI) | Capesize/Panamax/Supramax/Handysize + container indices. License gate; mock until signed. |
| B13.5 | **AIS** (Spire + MarineTraffic fallback) | `ais_positions(imo, mmsi, ts, lat, lon, sog, cog, nav_status, source)`. 1–5 min polling for fleet of interest. |
| B13.6 | **Satellite imagery** (Sentinel-2 via Copernicus + Planet) | Tile fetch + cache in `satellite-cache` Storage bucket. Used by visual-risk pipeline as the primary input. |
| B13.7 | **Regulatory data** (IMO GISIS, EQUASIS, Paris/Tokyo/USCG MOUs) | Per-source adapter normalizing into `regulations`, `vessel_detentions`, `psc_inspections`. |
| B13.8 | **Crisis intel** (UKMTO, MSCHOA RSS, OpenSanctions) | Real-time push into `crisis_advisories`; feeds market-sentinel + sanctions screening. |
| B13.9 | **Vendor cost guards** | Per-provider monthly budget enforced via Redis counters; dashboard at `/admin/integrations`. |
| B13.10 | **Replace mock services** | `market_data_service.py`, `market_sentinel_routes.py`, `visual_risk_service.py` consume `integrations/*`. Random-number paths deleted. Banner flips from `mode: "demo"` → `mode: "live"` per pillar as each B13 sub-task ships. |
| B13.11 | **Integration health page** | `/api/integrations/health` reports last successful fetch + lag per provider; fed to `/readyz` weighted health. |

---

## 9. Frontend Track — Detailed Tasks

> The teammate owns these. The list is the contract.

### F0 — Repo cleanup (Day 0–1)

| ID | Task | DoD |
| --- | --- | --- |
| F0.1 | Decide package manager: **bun** (already has `bun.lock`) | README + scripts + CI all use `bun`. Remove npm references. |
| F0.2 | Remove all `// @ts-nocheck` comments and turn TS on | `tsconfig` has `"strict": true`, `"noUncheckedIndexedAccess": true`. CI typecheck passes. |
| F0.3 | Single UI kit: **shadcn/ui + Tailwind** | Remove `antd`, `@mui/material`, `@ant-design/charts`, `@ant-design/icons`, `@emotion/*`, `@popperjs/core`, `react-popper`. Replace antd's `<ConfigProvider locale={enUS}>` with native i18n config. |
| F0.4 | Single map renderer: **MapLibre GL + deck.gl** | Remove `mapbox-gl`, `react-globe.gl`, `react-simple-maps`, raw `three` (unless still needed for a 3D globe — if so, keep and isolate behind `dynamic()`). |
| F0.5 | Single motion library: **`motion`** | Remove `framer-motion`. |
| F0.6 | Drop `react-router-dom` | All routing via App Router. |
| F0.7 | Drop `axios` | Use `fetch` (server) + TanStack Query (client). |
| F0.8 | **Rebrand package + remove `frontend1` strings.** | `package.json` `name: "plimsoll-web"`. `rg "frontend1" frontend/` → 0 matches (currently the `MissingClerkKey` UI references it). |
| F0.9 | **Pull port codes from BE.** | All UN/LOCODE values come from `/api/maritime/ports?...`. Delete client-side `countryCodeMap` + `port.name.substring(0,3)` construction in `UsersHome.tsx`. |
| F0.10 | **Two AdminPage trees → one.** | Pick `frontend/views/admin/` (the modular one). Delete the legacy monolith `frontend/views/AdminPage.tsx`. |

### F1 — App Router rebuild (Week 1–2)

| ID | Task | DoD |
| --- | --- | --- |
| F1.1 | Delete the SPA shell | Remove `app/ClientApp.tsx`, `app/ClientOnlyApp.tsx`, `app/[...path]/page.tsx`. |
| F1.2 | File-system routes | `app/(public)/page.tsx` (landing), `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`, `app/(app)/layout.tsx` (auth-gated), `app/(app)/dashboard/page.tsx`, `app/(app)/vessels/[id]/page.tsx`, `app/(app)/routes/page.tsx`, `app/(app)/documents/page.tsx`, `app/(app)/compliance/page.tsx`, `app/(app)/hedging/page.tsx`, `app/(app)/admin/...`, `app/(app)/demo/page.tsx`. |
| F1.3 | Auth gate via `middleware.ts` | Reads Supabase cookie; redirects to `/sign-in` for protected routes. |
| F1.4 | Layouts split | Marketing layout vs. app layout vs. admin layout. |
| F1.5 | Streaming + Suspense | Heavy components (maps, charts) wrapped in `<Suspense>` boundaries. |
| F1.6 | Error & loading UIs | Per-route `error.tsx` + `loading.tsx`. |

### F2 — Auth migration (Clerk → Supabase) (Week 2)

| ID | Task | DoD |
| --- | --- | --- |
| F2.1 | Add `@supabase/ssr` + `@supabase/supabase-js` | Two clients exported: `createBrowserClient`, `createServerClient`. |
| F2.2 | New `/sign-in` and `/sign-up` pages using `supabase.auth.signInWithPassword` + OAuth buttons | Flow works end-to-end. |
| F2.3 | Replace `useUser()` / `useAuth()` / `<SignedIn>` / `<RedirectToSignIn>` with Supabase equivalents | grep `clerk` returns 0 matches. |
| F2.4 | Cookie-based session in middleware | Authenticated server components fetch user without manual token plumbing. |
| F2.5 | Remove Clerk deps + env vars | `package.json` has no `@clerk/*`. `.env.local` documents Supabase vars only. |
| F2.6 | **Replace fabricated usage metrics with real data.** | The `UsersHome` "tokens / usage / last session" widget either (a) reads from `/api/usage/me` (sum over `llm_calls` per §B7.6), or (b) is removed entirely from v1 if billing is deferred. **Hardcoded `totalTokens: 5_000_000` + `usedTokens: 1_245_800` deleted.** |
| F2.7 | **Remove `vesselId \|\| 1` fallback.** | Document upload requires a non-null `vesselId`; if missing, UI blocks upload + surfaces "select a vessel first". The `\|\| 1` fallback is a cross-tenant write hazard and must die. |
| F2.8 | **Drop `/pay` from v1 (or commit to Stripe).** | Default: remove `views/PaymentPage.tsx` (599 LOC) + `payment.css` (1077 LOC) + `/pay` route. If billing stays in v1 scope, B7.6 LLM ledger + Stripe customer/portal integration must ship together. |
| F2.9 | **`mode: "demo"` banner on demo-backed surfaces.** | Hedging dashboard, Visual-risk panel, and Market-sentinel widgets render a persistent "Demo data — wired to live feeds in v1.x" banner whenever the BE response carries `mode: "demo"`. Removed pillar-by-pillar as B13 ships. |
| F2.10 | **Demo session token in URL.** | `/demo/[token]` reads a signed token (B8.4) instead of a bare UUID. WS connection sends the token in the handshake. |

### F3 — Data layer (Week 2–3)

| ID | Task | DoD |
| --- | --- | --- |
| F3.1 | Generate types from FastAPI OpenAPI | `bunx openapi-typescript http://localhost:8001/openapi.json -o src/types/api.ts`. Re-run in CI. |
| F3.2 | Generate Supabase types | `bunx supabase gen types typescript --project-id ... > src/types/supabase.ts`. |
| F3.3 | TanStack Query setup | `<QueryClientProvider>` in app layout, hydration support for SSR. |
| F3.4 | Typed API client (`src/lib/api.ts`) | Uses `fetch` + the OpenAPI types. No `any`. |
| F3.5 | RLS-aware reads via Supabase client (where allowed) | Vessel list, doc list, port list — direct Supabase reads in RSC. Compliance-run / hedge / agent endpoints stay on FastAPI. (See `docs/contracts/db.md`.) |

### F4 — Component & design system (Week 3)

| ID | Task | DoD |
| --- | --- | --- |
| F4.1 | shadcn/ui scaffold | `bunx shadcn@latest init`. Pull in `button`, `dialog`, `input`, `card`, `tabs`, `tooltip`, `select`, `dropdown`, `toast`, `sheet`, `command`. |
| F4.2 | Migrate existing components to shadcn equivalents | God-files (`UsersHome.tsx`, `DemoPage.tsx`, `DocumentUploadPage.tsx`, `CompliancePanel.tsx`) split into ≤ 200 LOC components. |
| F4.3 | Theming | One `tailwind.config.ts`; dark/light tokens; one `globals.css`. Delete `payment.css` (1900 LOC), `demo.css`, `map.css`, etc. — re-author as Tailwind. |
| F4.4 | Storybook (optional) | Each design-system primitive has at least one story. |

### F5 — Realtime & uploads (Week 3–4)

| ID | Task | DoD |
| --- | --- | --- |
| F5.1 | Supabase Realtime subscription hook (`useTenantChannel`) | Subscribes to `tenant:{tenant_id}` channel; updates query cache via TanStack Query. |
| F5.2 | Direct-to-Storage upload | UI gets a signed URL from BE → uploads via `fetch(PUT)` with progress → BE notified via webhook → realtime event marks doc as "queued for OCR" → another event marks "OCR complete". |
| F5.3 | Replace `services/websocket.ts` for the demo flow | Use Supabase Realtime channel or one strict `useEventSource` hook. |

### F6 — Maps & visualizations (Week 4)

| ID | Task | DoD |
| --- | --- | --- |
| F6.1 | Single map component built on MapLibre + deck.gl | Replaces `GlobalMap2D`, `GlobalMap2DDeck`, `GlobalMap3D`, `Globe3D`. |
| F6.2 | Map tiles via free provider | MapTiler / Stadia / Protomaps PMTiles (self-host PMTiles in Supabase Storage). |
| F6.3 | Deck.gl layers | Routes (PathLayer), risk-heat (HexagonLayer / H3HexagonLayer), vessels (IconLayer), ports (ScatterplotLayer). |
| F6.4 | Lazy-load maps | `dynamic(() => import('@/components/map/Map'), { ssr: false })`. |

### F7 — Performance & a11y (Week 4–5)

| ID | Task | DoD |
| --- | --- | --- |
| F7.1 | Lighthouse mobile ≥ 85 (perf, a11y, best-practices) | CI runs `lhci`. |
| F7.2 | Bundle budget | Per-route JS ≤ 200 KB gzip; main app ≤ 250 KB. Enforced via `@next/bundle-analyzer` + size-limit. |
| F7.3 | Image / font optimization | `next/image`, self-hosted fonts. |
| F7.4 | Keyboard + screen-reader audit | All forms and dialogs pass axe-core. |

### F8 — Testing + CI (Week 5)

| ID | Task | DoD |
| --- | --- | --- |
| F8.1 | Vitest + React Testing Library | Unit tests for non-trivial hooks + components. |
| F8.2 | Playwright E2E | Smoke flow: sign-in, upload doc, see realtime "OCR complete", run compliance, view report. |
| F8.3 | GitHub Actions | `lint → typecheck → vitest → playwright (preview deploy) → build`. |

### F9 — Internationalization (Week 5–6)

| ID | Task | DoD |
| --- | --- | --- |
| F9.1 | `next-intl` (or built-in i18n) with English + Chinese locales | Replaces antd `enUS` config. Per the project rule (`.agent/rules/project-rules.md`), Chinese must be supported first-class. |
| F9.2 | Locale-aware dates / numbers | `Intl.*` everywhere. |

---

## 10. Migration Strategy — Don't Break Anything

We migrate **module-by-module** behind feature flags. The current product stays bootable at every step.

### 10.1 Phasing
1. **Phase 0 (parallel infra, week 1):** Bring up Supabase + Postgres locally. Old SQLite + Clerk keep working.
2. **Phase 1 (auth, week 1–2):** Add Supabase auth alongside Clerk. New users sign up via Supabase. Existing Clerk users prompted to "link" once. Once linked rate ≥ 95%, drop Clerk in a separate release.
3. **Phase 2 (data, week 2–3):** Run a one-shot migration `clerk_id → auth_user_id`, copy SQLite tenant data to Postgres, ingest KB into pgvector. Both systems readable behind a feature flag (`KB_BACKEND=chroma|pgvector`). Cut over per route.
4. **Phase 3 (storage + workers, week 3–4):** New uploads go to Supabase Storage and are processed by the worker. Old uploads remain readable via legacy path until backfilled.
5. **Phase 4 (FE rebuild, week 1–5 in parallel):** Frontend teammate builds the new App Router UI under the `/next/*` route prefix. When at parity, promote `/next` to `/` (and remove the prefix). The legacy SPA serves `/` until cutover.
6. **Phase 5 (cleanup, week 6):** Delete Clerk, Chroma, antd, MUI, react-router-dom, the SPA shell. Final docs pass. **Tag `v1.0.0`.**

### 10.2 Feature flags
- `AUTH_BACKEND` ∈ `{ clerk, supabase, dual }` (default during migration: `dual`)
- `KB_BACKEND` ∈ `{ chroma, pgvector, dual }`
- `UPLOAD_BACKEND` ∈ `{ disk, supabase_storage }`
- `UI_BUILD` ∈ `{ legacy, next }` — `legacy` = the existing SPA shell, `next` = the new App Router UI that becomes Plimsoll 1.0. (Note: this flag is the UI-rebuild gate, not the product version number.)

### 10.3 Rollback plan
Each phase has a single-command rollback (flip env flag + redeploy). Database migrations are forward-only **except** for additive changes; destructive drops happen only after the matching phase has been stable for 7 days.

---

## 11. Deployment & Environments

| Env | URL | Hosted on | Purpose |
| --- | --- | --- | --- |
| `local` | `localhost` | `docker compose` | Dev. |
| `preview` | `pr-<n>.plimsoll.app` | Fly Machines or Vercel preview | Per-PR. |
| `staging` | `staging.plimsoll.app` | Fly.io / GCP Cloud Run | Pre-prod, shared. |
| `prod` | `app.plimsoll.app` | Fly.io / GCP Cloud Run + Cloud SQL or self-hosted Supabase | Real traffic. |

**Backend container:** `python:3.12-slim`, multi-stage, `uv sync --no-dev`, non-root user, OpenTelemetry env, healthchecks wired.
**Frontend:** Next.js standalone build; either Vercel or a Node container behind Caddy/NGINX.

---

## 12. Quality Gates

Every PR must pass:

- **Backend:** `ruff check`, `ruff format --check`, `mypy`, `pytest -q`, coverage ≥ 60%, `alembic check`, `pip-audit`/`uv pip audit`, `trivy image`.
- **Frontend:** `bunx tsc --noEmit`, `bunx eslint`, `bunx vitest --run`, `bunx playwright test --reporter=line` (smoke), `lhci`, `size-limit`.
- **Both:** `gitleaks` scan, `semgrep` minimal ruleset, dependabot/Renovate up-to-date.

Branch protection on `main`: 1 reviewer (the other engineer) + all checks green.

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Supabase self-host learning curve | Med | Med | Use **managed Supabase** in prod for v1; only self-host in dev. Switch to self-host when cost > value. |
| pgvector retrieval quality regression vs. Chroma | Low | Med | Hybrid retrieval (BM25+vector+RRF) + offline eval set with golden answers, gate on ≥ 92% top-1. |
| Migration data loss | Low | High | Forward-only migrations + nightly logical backups + PITR + dry-run on staging copy. |
| CrewAI removal breaks compliance debate quality | Med | Med | Keep CrewAI for the **one** workflow that benefits; A/B against the plain-Python Agent on a held-out set. |
| Frontend rebuild slows feature delivery | High | Med | Build the new UI under `/next/*` so the existing SPA keeps serving `/`. Cut over per route, then promote `/next` → `/`. |
| Rotating exposed Clerk keys breaks sessions | High | Low | Coordinated cutover: invalidate Clerk session, force re-login on Supabase. |
| Two-dev coordination drift | Med | High | Shared OpenAPI + Supabase types + Realtime contract, weekly contract review, Conventional Commits. |
| **Hedging + visual-risk pillars stay mocked at v1 launch** (vendor contracts not signed) | High | High | Flag `mode: "demo"` end-to-end + persistent UI banner. Tie B13 vendor decisions to a deadline in week 1; if no signed Argus/OPIS by week 3, scope-cut hedging out of v1.0 → push to v1.1. Don't ship live hedging numbers from `random.gauss()`. |
| **Unauthenticated routers exploited** before B0.7 lands | Med | High | B0.7 is a Day-1 task with a CI gate; no other task is allowed to merge before it. |
| **Frontend UN/LOCODE mismatch silently breaks compliance** | High (already happening) | High | B3.7 (UNECE seed) + F0.9 (BE-only codes) ship together; integration test asserts that `getPort("Rotterdam").un_locode == "NLRTM"`. |
| **Schrems II / GDPR refusal from EU charterers** | Med | High | §13.5 + DPAs + region-pinning ship in v1; sales playbook updated; one EU customer reference design-partner sign-off before GA. |
| **PII leak via debug log / Sentry** | Med | High | B0.4 + B10.6 redactor with golden-sample tests; Sentry `before_send` hook applied; tabletop exercise reviewed in week 5. |
| **Vendor data costs blow the budget** (AIS + satellite + Lloyd's) | Med | Med | B13.9 per-provider cost guards + monthly review; tile-cache and AIS-decimation for non-fleet positions; default to free Sentinel-2/Copernicus over Planet for v1. |
| **Cross-tenant write via `vesselId \|\| 1` fallback** | High (currently latent) | High | F2.7 removes the fallback; BE re-asserts ownership inside the transaction; integration test simulates a missing vesselId and asserts 4xx. |
| **Domain refactor (vessels↔memberships) breaks v0 reads** | Med | Med | Ship behind a view that preserves the old `Vessel.customer_id` shape during transition; cut over per-route. |
| **CrewAI 1.7.x dependency drag** (transformers + sentence-transformers + tokenizers all pulled at boot) | High | Med | B7.3 plain-Python agents replace CrewAI for everything except the compliance debate; CrewAI lazy-imported inside the worker only; cold-start under 2 s on the API container. |

### 13.5 Data handling & residency

Maritime data carries crew PII, certificate documents, and commercially sensitive route/charter information. EU and Chinese customers will not onboard without explicit guarantees. Plimsoll 1.0 must answer the following before GA, not after.

**Residency**
- Supabase project pinned to **EU (Frankfurt) by default**. Optional **APAC (Singapore)** project for Chinese / SEA tenants. ADR `docs/decisions/0003-data-residency.md`.
- `tenants.region` column drives routing; cross-region joins disallowed.
- Storage buckets and Postgres are co-located per region. No replication across regions without explicit opt-in.

**Sub-processors / DPAs**
- Maintain `docs/legal/sub-processors.md` listing every external service that touches customer data (Supabase, Sentry, Gemini/OpenAI, LiteLLM, Mapbox/MapLibre tiles vendor, Spire, Argus, etc.).
- Signed DPAs on file before any production tenant; updated when sub-processors change with 30-day notice clause.
- Standard Contractual Clauses (SCCs) for any US transfer.

**Model retention**
- All LLM providers configured with **zero retention** where supported (Gemini "no data used for training" + OpenAI Enterprise / DPA). Verified via vendor DPA references stored in `docs/legal/`.
- Prompts logged in `agent_traces` are stored in-region and subject to redaction (B10.6). Raw prompts and responses are never sent to third-party log aggregators.
- Embedding requests carry no document text beyond the chunk being embedded; metadata such as IMO numbers redacted before send unless the vendor is bound by DPA.

**PII handling**
- Define a project-wide PII matrix (`docs/security/pii-matrix.md`): each field labelled (`identity`, `contact`, `document`, `location`, `commercial`) with retention period, access role, encryption-at-rest assertion.
- B10.6 redactor processor mandatory in every log path (FastAPI, worker, Sentry, dev console).
- Crew personal data (names, passport numbers from certificates) flagged at OCR time with a `pii: true` chunk attribute; access requires elevated role and is audit-logged.

**Encryption**
- At rest: Postgres + Storage encryption via Supabase defaults (AES-256). pgvector embeddings counted as "derived data" but covered.
- In transit: TLS 1.2+ everywhere; HSTS on all domains.
- Key management: Supabase Vault for app secrets; KMS-backed for any future BYO-key tenants.

**Deletion / right to be forgotten**
- B10.7 + B10.8 deliver per-tenant and per-document deletion APIs.
- Soft-delete window: 30 days. Hard-delete cascades through Postgres rows, Storage objects, pgvector chunks, `agent_traces`, `llm_calls`, and Realtime channels.
- Retention defaults: documents kept while tenant is active; deleted 90 days after tenant termination unless legal hold flagged. Configurable per tenant.
- All deletion events written to `audit_log`.

**Access logging**
- Every document access (read, download, share, delete) writes to `audit_log` with `actor_user_id`, `tenant_id`, `document_id`, `ip`, `ua`, `result`. Admin UI surfaces a per-document trail.

**Customer-facing artefacts**
- `/legal/privacy` — public privacy notice describing categories, sub-processors, retention, region.
- `/legal/dpa` — downloadable DPA template with SCCs.
- `/legal/security` — security overview: encryption, audit log, deletion API, region map, sub-processors.
- All three pages live in the FE repo and are part of the v1 release checklist.

---

## 14. Roadmap (6-week sprint plan)

| Week | Backend (you) | Frontend (teammate) | Joint |
| --- | --- | --- | --- |
| 1 | **B0 cleanup including B0.7 unauth audit + B0.10 dead test fix**, B1 Supabase bootstrap, B2.1–B2.3 auth | F0 cleanup (incl. F0.8 rebrand, F0.9 BE port codes, F0.10 admin merge), F1.1–F1.3 App Router scaffold, F2.1–F2.2 Supabase auth | Sign contracts (`docs/contracts/*`). Stand up `docker compose`. **Make vendor decisions for B13 (Argus/OPIS, Spire, Sentinel-2, EQUASIS).** |
| 2 | B2.4–B2.6, **B3 schema + RLS incl. B3.6 vessel-membership refactor + B3.7 UN/LOCODE seed + B3.9 tenant-from-JWT**, B4.1–B4.2 pgvector | F1.4–F1.6, F2.3–F2.5 finish auth, **F2.7 remove `vesselId\|\|1`**, F3 data layer | Generate OpenAPI + Supabase types, wire CI. **B11.5 eval skeleton on CI (red baseline ok).** |
| 3 | B4.3–B4.9 KB ingestion (incl. **B4.8 embedding versioning + B4.9 evidence binding**), **B5 storage pipeline incl. B5.5 streaming uploads + B5.6 worker OCR + B5.7 Chinese OCR** | F4 design system, F5 realtime + uploads, **F2.6 real usage metrics or removal**, **F2.8 drop `/pay` from v1** | Cut compliance read path to pgvector behind flag. **B13.1–B13.4 (integrations skeleton + fuel + FX + freight) start in parallel.** |
| 4 | B6 jobs, **B7 LLM refactor incl. B7.6 cost ledger + B7.7 citations + B7.8 fix orchestrator AttributeError**, **B8 demo incl. B8.4 signed tokens + B8.5 demo labels** | F6 maps, F7 perf, **F2.9 `mode: "demo"` banners**, **F2.10 demo token UI** | First end-to-end "upload → OCR → realtime → compliance" demo on `/next`. **B13.5–B13.6 (AIS + satellite) feed real visual-risk path.** |
| 5 | B9 observability, **B10 security incl. B10.6 PII redactor + B10.7 RTBF + B10.8 doc deletion + B10.9 sanctions screening**, B11 tests (**incl. B11.5 compliance eval gate ≥ 92% + B11.6 load tests**) | F8 tests, F9 i18n, **legal pages `/legal/privacy`, `/legal/dpa`, `/legal/security`** | A/B legacy vs `/next`; ship `/next` to staging. **B13.7–B13.8 (regulatory + crisis intel) replace mock market-sentinel.** |
| 6 | B12 deploy, **B13.9–B13.11 (cost guards + integration health + flip `mode: "live"` per pillar)**, cleanup | Cleanup, hand-off | Promote `/next` → `/`; delete Clerk + Chroma + antd + MUI; archive legacy SPA; **tag `v1.0.0` and ship Plimsoll 1.0**. **Hedging + visual-risk surfaces ship `mode: "live"` if vendor contracts cleared, otherwise `mode: "demo"` with banner.** |
| 7–8 (post-1.0) | Remaining B13 sub-tasks if vendor contracts slipped; second-region (APAC) Supabase project; per-tenant region pinning. | Locale polish, advanced map layers (port congestion, AIS heatmap). | **v1.1 cut: lift demo banners off pillars whose live data is now wired.** |

---

## 15. Appendix A — Concrete file/folder layout (target)

```
.
├─ backend/
│  ├─ pyproject.toml
│  ├─ alembic/
│  │  └─ versions/
│  ├─ app/
│  │  ├─ main.py                   # FastAPI app (slim, ≤ 200 LOC)
│  │  ├─ deps.py                   # dependency-injection helpers
│  │  ├─ middleware/
│  │  └─ routers/                  # was modules/*/_routes.py
│  │     ├─ maritime.py
│  │     ├─ documents.py
│  │     ├─ hedge.py
│  │     ├─ visual_risk.py
│  │     ├─ demo.py
│  │     └─ admin.py
│  ├─ domain/
│  │  ├─ maritime/
│  │  │  ├─ compliance_service.py
│  │  │  ├─ kb_pgvector.py
│  │  │  └─ ...
│  │  ├─ documents/
│  │  ├─ financial/
│  │  └─ analytics/
│  ├─ infra/
│  │  ├─ db.py                     # async engine + session
│  │  ├─ storage.py                # Supabase Storage client
│  │  ├─ queue.py                  # pgmq / arq
│  │  ├─ cache.py                  # redis
│  │  ├─ llm.py                    # litellm wrapper
│  │  └─ telemetry.py
│  ├─ workers/
│  │  ├─ main.py
│  │  └─ tasks/
│  │     ├─ ocr.py
│  │     ├─ compliance.py
│  │     └─ ...
│  ├─ scripts/                     # one-shot ingestion / migration
│  └─ tests/
├─ frontend/
│  ├─ package.json (bun)
│  ├─ tsconfig.json (strict)
│  ├─ next.config.ts
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ (public)/page.tsx
│  │  │  ├─ (auth)/sign-in/page.tsx
│  │  │  ├─ (auth)/sign-up/page.tsx
│  │  │  ├─ (app)/layout.tsx
│  │  │  ├─ (app)/dashboard/page.tsx
│  │  │  ├─ (app)/vessels/[id]/page.tsx
│  │  │  ├─ (app)/documents/page.tsx
│  │  │  ├─ (app)/compliance/page.tsx
│  │  │  ├─ (app)/hedging/page.tsx
│  │  │  ├─ (app)/demo/page.tsx
│  │  │  └─ (app)/admin/page.tsx
│  │  ├─ components/
│  │  │  ├─ ui/                    # shadcn primitives
│  │  │  ├─ map/Map.tsx            # MapLibre + deck.gl
│  │  │  ├─ documents/
│  │  │  └─ compliance/
│  │  ├─ lib/
│  │  │  ├─ supabase/server.ts
│  │  │  ├─ supabase/browser.ts
│  │  │  ├─ api.ts
│  │  │  └─ realtime.ts
│  │  ├─ hooks/
│  │  ├─ types/api.ts              # generated from OpenAPI
│  │  ├─ types/supabase.ts         # generated from Supabase
│  │  └─ middleware.ts
│  └─ tests/
├─ supabase/                        # Supabase CLI assets
│  ├─ migrations/
│  ├─ functions/                    # Edge Functions (storage webhook)
│  └─ seed.sql
├─ docs/
│  ├─ contracts/
│  │  ├─ auth.md
│  │  ├─ realtime.md
│  │  ├─ storage.md
│  │  └─ db.md
│  ├─ decisions/                    # ADRs
│  └─ runbooks/
├─ docker-compose.yml
├─ .github/workflows/
│  ├─ backend.yml
│  ├─ frontend.yml
│  └─ migration-check.yml
├─ Makefile
├─ PRD.md
└─ README.md
```

---

## 16. Appendix B — Concrete env vars (target)

`backend/.env`:
```
# Database
DATABASE_URL=postgresql+psycopg://postgres:postgres@db:5432/postgres

# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
SUPABASE_JWKS_URL=http://localhost:54321/auth/v1/keys

# LLM
LITELLM_PROVIDER_DEFAULT=gemini/gemini-2.5-flash
GEMINI_API_KEY=...
OPENAI_API_KEY=...   # optional fallback

# Vector / KB
EMBEDDING_MODEL=models/gemini-embedding-001
KB_BACKEND=pgvector

# Queue / cache
QUEUE_BACKEND=pgmq                 # or "arq"
REDIS_URL=redis://redis:6379/0

# Storage
STORAGE_BUCKET_DOCS=documents
STORAGE_BUCKET_REPORTS=reports

# Ops
LOG_LEVEL=INFO
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
CORS_ORIGINS=http://localhost:3000
```

`frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api
```

> **Action item:** As part of the Clerk decommission, **rotate** the existing Clerk publishable + secret keys that were placed in `frontend/.env.local`. Even though `.env*` is gitignored, treat them as compromised because they were committed to local disks.

---

## 17. Appendix C — Definition of Done for Plimsoll 1.0 (base release)

Plimsoll 1.0 ships when **all** of the following are true on `prod`:

**Cleanup gates**
- [ ] `rg -i clerk` returns 0 matches in `backend/` and `frontend/` source.
- [ ] `rg -i chromadb` returns 0 matches in `backend/` source.
- [ ] `rg "@ts-nocheck"` returns 0 matches.
- [ ] `rg "react-router-dom"` returns 0 matches.
- [ ] `rg "frontend1"` returns 0 matches.
- [ ] `rg "random\.(gauss|randint)" backend/modules/financial backend/modules/analytics` returns 0 matches (no synthetic data left in pillar code paths).
- [ ] One UI kit (shadcn/ui), one map renderer (MapLibre+deck.gl), one motion lib (`motion`).

**Auth gates**
- [ ] `scripts/audit_unauthed_routes.py` passes — every route except the documented allowlist (`/healthz`, `/readyz`, `/openapi.json`, `/docs`, `/redoc`) carries `Depends(get_current_user)`.
- [ ] `rg "customer_id.*(Form|Query)" backend/modules` returns 0 matches — tenant identity comes from JWT only.
- [ ] RLS denies cross-tenant reads **and writes** in an automated test (incl. the historical `vesselId=1` cross-tenant scenario).

**Data + retrieval gates**
- [ ] Postgres is the only DB; pgvector holds all embeddings; Supabase Storage holds all uploaded files.
- [ ] UN/LOCODE seed loaded; `getPort("Rotterdam").un_locode == "NLRTM"` integration test passes.
- [ ] Every `document_chunks` row carries `embedding_model_id` + `embedding_model_version`; KB search filters by the current cohort.
- [ ] Every agent response carries non-empty `citations[]` bound to retrieved chunk IDs.
- [ ] Compliance eval: top-1 ≥ 92% on `data/eval/compliance_top1.jsonl` (≥ 200 cases). KB retrieval recall@5 ≥ 90%. OCR field recall ≥ 80% (EN + ZH fixtures). All gated in CI.

**Async + perf gates**
- [ ] All long-running work runs in the worker, not in HTTP handlers.
- [ ] Upload bytes never traverse the FastAPI worker for the default path (pre-signed URL → Storage → webhook).
- [ ] Backend p95 < 250 ms on `/api/maritime/vessels`, `/api/maritime/ports`, `/api/maritime/documents/list`.
- [ ] No N+1 to Chroma/pgvector on `list_vessels` (query plan reviewed; documents joined in one query).
- [ ] Cold start of API container < 2 s on the deploy target (CrewAI lazy-loaded).
- [ ] OpenAPI is published; FE types are generated from it; CI fails on drift.

**Security + privacy gates**
- [ ] PII redactor applied to `structlog` + Sentry `before_send`; golden-sample tests pass.
- [ ] `DELETE /api/admin/tenants/{id}` and `DELETE /api/maritime/documents/{id}` work, audit-logged, with cascade across Postgres + Storage + pgvector.
- [ ] Sanctions screening blocks vessel-create / charter-assign for OFAC/EU/UK list hits.
- [ ] All secrets rotated; no test/dev keys in any prod config; Clerk + Gemini + Mapbox keys re-issued.
- [ ] DPA, sub-processor list, region-pinning verified; `/legal/privacy`, `/legal/dpa`, `/legal/security` published.
- [ ] No real PII in `/tmp/naviguard_debug.log` (file removed from request paths).

**LLM + cost gates**
- [ ] Every LLM call writes one row to `llm_calls`; per-tenant daily budget enforced.
- [ ] No FE widget shows fabricated usage numbers; usage is sourced from `/api/usage/me` or removed.
- [ ] `/pay` route either backed by Stripe + `subscriptions/plans/invoices/payment_methods` tables, or removed from v1 with `payment.css` deleted.

**Honesty gates** (no demo content shipped as live)
- [ ] Hedging, visual-risk, market-sentinel API responses include `mode: "demo" | "live"`; FE renders a banner whenever `mode == "demo"`.
- [ ] No code path returns `DEMO_SUEZ_BLOCKAGE_RESULT` (or any other canned narrative) on a `mode: "live"` endpoint.
- [ ] Demo WebSocket sessions require a signed token; `demo_id` UUIDs alone are rejected.

**Ops + testing gates**
- [ ] Lighthouse mobile ≥ 85 on `/dashboard`, `/compliance`, `/hedging`.
- [ ] Test coverage ≥ 60% on backend `domain/*`.
- [ ] Locust scenarios pass agreed thresholds (200 concurrent vessel-detail loads, 20 concurrent 50 MB uploads, 100 concurrent KB searches).
- [ ] Sentry receives errors from prod; OpenTelemetry traces visible; `/readyz` reflects integration health.
- [ ] Runbooks exist for: auth incident, DB failover, queue stuck, KB ingestion replay, integration outage (per provider), tenant deletion / RTBF request.

---

**End of PRD.**
