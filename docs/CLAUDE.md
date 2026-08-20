# CLAUDE.md

This file gives Claude Code the context and rules for working on the LSLP (Lead Service Line Inventory Platform) project. Read this first before doing anything.

---

## 1. Who I Am and How I Work

I'm Hamza, a **solo developer** building this platform alone. I'm not a junior or a beginner, but I'm not a senior either — I learn by doing. Treat me as a partner, not a student.

**My working style:**
- One file at a time. I want to understand each change before moving to the next.
- Explain *why* a decision is being made, not just *what* code to write.
- When something breaks, walk through the debug — don't just hand me the fix.
- I prefer being shown the smallest possible change that solves a problem over a sweeping rewrite.
- I will copy-paste code into my files. Format snippets so they paste cleanly.

**My environment:**
- OS: Windows 11
- Editor: VS Code with PowerShell terminal
- Python: 3.13.7 in a venv at `C:\lslp\backend\venv`
- Node: latest LTS, npm
- Database: PostgreSQL 17 running locally
- Database name: `lslp`
- Database user: `postgres`
- Database password: stored in `.env` (never paste it in chat)

---

## 2. Project Context — What This Is

LSLP is a custom platform to replace a fragmented 5-tool compliance workflow used by the Mount Vernon water utility:
- **Springbrook** → utility billing, regulatory system of record (we keep this, but feed it automatically)
- **Excel + VBA** → workflow engine (replaced entirely)
- **OneNote** → photo storage (replaced entirely)
- **Brightly** → work orders (kept, but auto-triggered via API)
- **Plumsail** → customer form (replaced entirely)

The platform exists for **EPA lead service line inventory compliance**. Field crews inspect water service lines, classify them as Lead / Copper / Galvanized / Unknown, and the data must be auditable for regulators.

---

## 3. Tech Stack — Use These, Don't Suggest Alternatives

| Layer | Tool | Why |
|---|---|---|
| Backend | Python 3.13 + FastAPI | Async-native, auto-generates Swagger docs, same language as future ML phase |
| ORM | SQLAlchemy 2.x + Alembic | Standard. Alembic for migrations — never edit tables manually outside Alembic once it's set up. |
| Database | PostgreSQL 17 (local now, Railway later) | Open source, free, robust for 10K+ records |
| Frontend | React 18 + Vite + Tailwind v4 | One repo for dashboard, PWA, customer portal |
| Field app | PWA via vite-plugin-pwa | Not React Native — never suggest React Native |
| Offline | Dexie.js (IndexedDB wrapper) | Field crews work offline; sync on reconnect |
| Auth | Firebase Auth (free tier) | Free forever, decent SDK |
| File storage | Local filesystem (interim) → Firebase Storage when paid plan unlocks | Storage service is abstracted so this is a one-line swap |
| Reporting | Metabase (free, self-hosted) | Phase 3, not now |
| Scheduling | APScheduler inside FastAPI | No separate worker service to maintain |
| Deployment | Railway or Render (Phase 3) | Free tier, Docker-ready |

**Hard rules:**
- No new dependencies without explicit approval.
- No microservices. One backend, one frontend, one database.
- No serverless functions. APScheduler runs inside the FastAPI process.
- No ORM lock-in we can't migrate. Keep SQLAlchemy models clean.

---

## 4. Folder Structure

```
C:\lslp\
├── backend\
│   ├── venv\                  ← never touch
│   ├── data\                  ← raw CSV imports (kept for re-import if needed)
│   ├── uploads\               ← local photo storage
│   │   ├── field\
│   │   └── customer\
│   ├── app\
│   │   ├── __init__.py
│   │   ├── database.py        ← engine, SessionLocal, Base, get_db()
│   │   ├── api\               ← route handlers, one file per resource
│   │   │   ├── properties.py
│   │   │   ├── visits.py
│   │   │   └── outreach.py
│   │   ├── models\            ← SQLAlchemy table definitions
│   │   │   ├── property.py
│   │   │   ├── visit.py
│   │   │   ├── outreach.py
│   │   │   └── user.py
│   │   ├── schemas\           ← Pydantic request/response shapes
│   │   │   ├── property.py
│   │   │   ├── visit.py
│   │   │   └── outreach.py
│   │   └── services\
│   │       ├── storage.py     ← photo upload service (local → Firebase later)
│   │       └── auth.py        ← Firebase JWT verification + require_role factory
│   ├── main.py                ← FastAPI app entry, CORS, router registration
│   ├── .env                   ← DB creds + Firebase keys (NEVER commit)
│   ├── import_data.py         ← one-time CSV import script
│   └── requirements.txt
└── frontend\
    ├── node_modules\          ← never touch
    ├── public\
    └── src\
        ├── pages\
        │   ├── Dashboard\     ← office staff web UI
        │   │   ├── PropertiesList.jsx
        │   │   ├── PropertyDetail.jsx
        │   │   ├── NewVisit.jsx
        │   │   └── NewOutreach.jsx
        │   ├── Login.jsx      ← public sign-in page (outside RequireAuth)
        │   ├── FieldApp\      ← PWA for iPads (Phase 2, not built yet)
        │   └── Portal\        ← customer self-submit (Phase 2, not built yet)
        ├── components\
        │   ├── Navbar.jsx
        │   └── RequireAuth.jsx  ← auth gate, wraps all dashboard routes
        ├── lib\
        │   ├── api.js         ← axios client + all endpoint wrappers + Bearer interceptor
        │   └── firebase.js    ← Firebase app init, exports auth
        ├── App.jsx            ← React Router setup
        ├── main.jsx
        └── index.css          ← Tailwind v4 entry: @import "tailwindcss"
```

---

## 5. Database Schema — Source of Truth

Six tables, all in PostgreSQL, all created and populated. Do not redesign these without discussion.

### `properties` (10,475 rows)
Master list. `account_number` is the primary key, formatted like `"003518-000"`. Everything else links here.
```
account_number (PK), service_file_number, acct_status, address, zip,
hs_service, ss_service, ub_private_side, ub_utility_side, ub_sl_category,
ub_account_type, ub_mapped_private_method, ub_mapped_public_method,
hs_verification_method, ss_verification_method, ss_previously_lead,
verified_status (DEFAULT 'Pending'), springbrook_synced_at,
created_at, updated_at
```

### `visits` (168 rows)
One row per field inspection. **`visited_at` is set server-side — never accept it from the client.** **`initials` comes from the performer's profile. `created_by_uid` is the performer; `entered_by_uid` is the person who typed the record. Never accept `entered_by_uid` from the client.**
```
id (PK SERIAL), account_number (FK), initials (from performer's profile),
created_by_uid (VARCHAR(128), nullable — performer's firebase_uid),
entered_by_uid (VARCHAR(128), nullable — enterer's firebase_uid),
visited_at (server-set),
access_granted (String, NOT Boolean — values include "Yes", "No",
"No Answer", "Scheduled", "No (Refused)"), verification_outcome,
property_type, notes, photo_urls (JSONB), gps_coordinates (JSONB),
work_order_id, follow_up_date (DATE, nullable), created_at
```

### `outreach_log` (9,485 rows)
One row per attempt. **Converted from wide format (4 columns) to long format (1 row per attempt).** Never reintroduce the wide format. `attempt_number` is auto-calculated on POST — never accepted from client. **Type mismatch warning:** `outreach_date` is DATE while `visits.visited_at` is TIMESTAMP WITH TIME ZONE. Anywhere visits and outreach are merged or sorted together, promote the DATE to a timezone-aware datetime first (midnight UTC) — Python's `datetime` and `date` types are not comparable.
```
id (PK SERIAL), account_number (FK), attempt_number (server-set),
outreach_date (DATE not DATETIME), method, outcome, initials, notes,
is_customer_initiated (Boolean), customer_initiated_notes,
follow_up_date (DATE, nullable), created_at
```

### `customer_submissions` (empty, ready for Phase 2)
```
id (PK SERIAL), account_number (FK), submitted_at, submitter_name,
contact_info, year_constructed, prior_line_work, prior_line_notes,
photo_urls (JSONB), review_status (DEFAULT 'Pending'),
reviewed_by, reviewed_at
```

### `users`
```
id (PK SERIAL), firebase_uid (UNIQUE), name, email (UNIQUE),
initials (VARCHAR(5), nullable), role (DEFAULT 'field_crew'),
is_active (DEFAULT TRUE), created_at
```
Roles: `field_crew`, `office_staff`, `supervisor`, `admin`.

### `audit_log` (empty, populated by triggers later)
Append-only. Never DELETE from this table.
```
id (PK SERIAL), table_name, record_id, field_changed,
old_value, new_value, changed_by, changed_at
```

---

## 6. API Conventions

- All routes prefixed `/api/<resource>/`
- Pagination via `skip` and `limit` query params (default `limit=100`)
- Filtering via explicit query params, not generic `where` clauses
- POST uses `multipart/form-data` when files are involved, JSON otherwise
- Responses use Pydantic `*Response` schemas — never return raw SQLAlchemy objects
- 404 for missing resources, 422 for validation errors, 500 only for unhandled bugs
- CORS allows `http://localhost:5173` (Vite dev server) for now

**Auth convention:**
- Token verification uses JWKS (`PyJWKClient` against Firebase's public key endpoint). Only `FIREBASE_PROJECT_ID` is needed in `.env`.
- Never switch this to the Firebase Admin SDK service account key approach — org policy blocks service account key creation and this approach is confirmed working.
- `GET /api/auth/me` returns the authenticated user's `email`, `name`, `role`, and `initials`. The frontend caches this in `UserContext` and uses it for route gating and Navbar filtering.

**Role-to-route access matrix (reference for any new route):**

| Route / Endpoint | field_crew | office_staff | supervisor | admin |
|---|---|---|---|---|
| `/field` + `POST /api/visits/` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/auth/me` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/properties/` (search/typeahead) | ✅ | ✅ | ✅ | ✅ |
| `GET /api/properties/{id}` | ✅ | ✅ | ✅ | ✅ |
| `/` (Overview) + `GET /api/dashboard/summary` | ❌ | ✅ | ✅ | ✅ |
| `/properties` (list page) | ❌ | ✅ | ✅ | ✅ |
| `/properties/:id` (detail page) | ❌ | ✅ | ✅ | ✅ |
| `/visits/new` (office form) | ❌ | ✅ | ✅ | ✅ |
| `GET /api/visits/` and `GET /api/visits/{id}` | ❌ | ✅ | ✅ | ✅ |
| `/outreach/new` + all outreach endpoints | ❌ | ✅ | ✅ | ✅ |
| `/submissions` + all internal submission endpoints | ❌ | ✅ | ✅ | ✅ |
| `PATCH /api/properties/{id}` | ❌ | ✅ | ✅ | ✅ |

Frontend restriction is convenience (redirect to `/field`); backend `require_role` is the real enforcement boundary. Both must agree for every route.

**Server-side enforced fields (never trust client):**
- `visited_at` on visits
- `initials` on visits (set from the performer's profile, never from form input)
- `created_by_uid` on visits (performer — set from `performed_by_uid` if supplied and validated, otherwise the authenticated user)
- `entered_by_uid` on visits (always the authenticated user — never accepted from the client)
- `attempt_number` on outreach
- `created_at`, `updated_at` everywhere
- `verified_status` on properties (only updated via specific PATCH logic)

**Visit identity model:**
Visits record two identities: `created_by_uid` is who performed the inspection (physically at the property), `entered_by_uid` is who entered the record into the system. On the field form these are the same person. On the office form the logged-in user is the enterer and the performer is selected explicitly. Never conflate them, and never accept `entered_by_uid` from the client.

**Field app access:**
`office_staff` may enter visits on behalf of inspection staff (via `/visits/new`) but may not reach the field app (`/field`). Access restrictions are enforced server-side where a dedicated endpoint exists, and via `RequireAuth` with `allowedRoles` on frontend-only routes. Hiding a route in the navbar is not a restriction — `RequireAuth` actively redirects unauthorized roles. The field form and office form share `POST /api/visits/` because both need it; the form-level restriction on `/field` is the correct enforcement boundary.

---

## 7. Frontend Conventions

- React functional components only, no class components
- Hooks for state — `useState`, `useEffect`, `useNavigate`, `useParams`, `useLocation`
- Tailwind v4 via `@import "tailwindcss"` — no custom CSS files
- All API calls go through `src/lib/api.js` — never call `axios` directly from components
- Pages live in `src/pages/<Section>/<PageName>.jsx`
- Shared UI lives in `src/components/`
- No state management library (no Redux, no Zustand) — local component state is fine for now
- Router setup is in `App.jsx` — add new routes there

**File extension rule:** any file with JSX must be `.jsx`, not `.js`. Vite is strict about this.

---

## 8. Visual System

Surfaces fall into three tiers. Each gets a specific CSS treatment, and the tiers must not be mixed.

**Arrival surfaces** (Login, customer portal header) — the only places where someone arrives rather than works. These get real atmospheric depth: a radial light bloom over the navy gradient, plus a 48px engineering survey grid in white at 6% opacity. Use the `.arrival-surface` class or replicate its layered background. The grid evokes survey/infrastructure mapping at a scale that reads as texture, not decoration.

**Canvas surfaces** (every working screen's page background) — a barely-perceptible treatment replacing flat `#F8FAFC`. A 48px engineering survey grid in `rgba(26, 86, 160, 0.03)` over a subtle directional gradient (`#F8FAFC` → `#F1F5F9` → `#F8FAFC`). Use the `.canvas-surface` class. The grid is intentionally near-invisible — it should register as "not flat" without being consciously noticed.

**Data surfaces** (cards, tables, form panels) — flat, near-white, no gradients, no patterns, no texture. These exist to present information with zero visual competition. Never add background treatments to data containers.

The survey grid spacing (48px) was chosen because it references engineering graph paper and survey plats — appropriate for municipal water infrastructure software handling EPA compliance data.

**Page-load reveals:** Each route gets a single choreographed entrance on mount using the `PageReveal` + `RevealItem` components. Stagger interval is 40ms, spring physics (`stiffness: 380, damping: 30`), total sequence under 400ms. Do not add incidental motion elsewhere (hover-scale on cards, animated icons, gratuitous transitions). Do not stagger individual table rows — the table container reveals as one unit.

**Route transitions:** Live in the app shell (`App.jsx` → `ShellRoutes`), never per-page. `AnimatePresence mode="wait"` wraps the `<Routes>` component, keyed on `location.pathname`. Login and SubmitForm are standalone routes outside the shell with their own entrance animations. `MotionConfig reducedMotion="user"` is set at the root to respect `prefers-reduced-motion`.

---

## 9. Things to Never Do

- ❌ Never paste secrets, passwords, or API keys in chat or commit messages
- ❌ Never use `DELETE` without a `WHERE` clause in pgAdmin
- ❌ Never edit the database schema directly in pgAdmin — all schema changes go through Alembic migrations (`alembic revision --autogenerate`, review, then `alembic upgrade head`). Manual `ALTER TABLE` statements are no longer used. See `docs/MIGRATIONS.md` for the full workflow.
- ❌ Never reintroduce the wide-format outreach log
- ❌ Never accept `visited_at`, `attempt_number`, `initials` (on visits), `created_by_uid`, or `entered_by_uid` from the client — these are set server-side from the authenticated user and/or the selected performer
- ❌ Never use React Native — we use PWA only
- ❌ Never suggest microservices, lambdas, or serverless rewrites
- ❌ Never store photos as base64 in the database — they go in the storage service
- ❌ Never bulk-format files without my approval — small focused edits only
- ❌ Never commit `.env`, `.env.local`, `venv\`, `node_modules\`, or `uploads\` to git
- ❌ Never try to use Firebase service account JSON key files — org policy blocks key creation. Use JWKS-based verification instead (already set up in `app/services/auth.py`).
- ❌ Never write design spec docs or implementation plan docs unless Hamza explicitly asks for them — he prefers to go straight to building.

---

## 10. Things to Always Do

- ✅ When adding a new model, update: model file, schema file, API route file, `lib/api.js` on the frontend, and `alembic/env.py` imports
- ✅ When adding a new field to a table, write an Alembic migration: `alembic revision --autogenerate -m "description"` then `alembic upgrade head`
- ✅ When something fails, check the uvicorn terminal first — the real error is there
- ✅ When testing POST endpoints, use Thunder Client (text fields) or Python `requests` (file uploads)
- ✅ When stuck, ask before guessing — wrong guesses cost more time than asking
- ✅ When the schema changes, update `PROGRESS.md` and `ROADMAP.md`
- ✅ When adding a new protected endpoint, apply `Depends(verify_firebase_token)` for any-auth or `Depends(require_role([...]))` for role-restricted access
- ✅ When creating a new router module in `app/api/`, add the `include_router` call to `main.py` in the same change, then confirm the endpoint appears at `http://127.0.0.1:8000/docs` before the work is considered done. An unmounted router returns a clean 404 with no log output — it fails silently.

**Dashboard metrics:**
Every number on the Overview dashboard must be clickable and must route to a filtered list whose row count matches the number on the card. If a dashboard aggregate query changes, the corresponding filter on `GET /api/properties/` must use identical logic so the counts always agree. The in-app dashboard does not replace the planned Phase 3.6 Metabase work.

**Git identity:**
Git commits are authored under the repository owner's identity, which is configured globally on the machine. Never run `git config user.name` or `git config user.email`, and never pass `--author` to a commit — leave git identity alone entirely.

**Timestamps:**
All server-set timestamps must be written as timezone-aware UTC (`datetime.now(timezone.utc)` in Python) and serialized to the frontend as ISO 8601 with an explicit offset so the browser can localize correctly. Never rely on `server_default=func.now()` for new writes — PostgreSQL's `NOW()` returns server-local time in TIMESTAMP WITHOUT TZ columns. The `_to_utc_datetime` helpers in `dashboard.py` and `users.py` treat naive timestamps as server-local (Eastern) and convert to UTC. TIMESTAMPTZ migration is pending — once applied, naive timestamps will no longer exist.

**Page resilience:**
Page loads that fetch multiple resources must degrade per-section rather than failing wholesale. Never combine independent API calls in a single `Promise.all` where one failure would blank an entire page. Each section should load, succeed, or show an inline error independently. The property header can gate the page (404 → "Property not found") but visits and outreach must not.

**Public endpoint validation:**
Any endpoint reachable without Firebase authentication (currently `POST /api/submissions/`) must validate its input server-side regardless of client-side checks. The portal endpoint takes input from the open internet — validate name length, contact format, required fields, and photo type/size on the backend.

**Write attribution:**
All data-modifying operations must be traceable to the authenticated user. `created_by_uid` is set from the user's Firebase UID on visits and outreach; `reviewed_by` is set from the user's Firebase UID on submission reviews; property PATCH writes per-field audit_log entries. Never accept attribution fields from the client.

**Role display names:**
Role display names come from a single mapping in `design-system.js` (`roleConfig` / `getRoleDisplay`). Never hardcode role labels anywhere else.

**Analytics filters:**
`GET /api/analytics/` returns all chart datasets in one response. Every filter (date range, material, verified status, outreach outcome) applies uniformly across every dataset — never let one chart respect a filter while another ignores it. Date range restricts property-level charts to properties with activity (visit or outreach) in the range, and restricts time-series charts to the date axis. Chart colors come from `ChartConfig` objects mapped from `design-system.js` material colors, not inline hex values.

**Analytics gaps:**
Replacement tracking and property priority are deferred — neither the data nor the data sources exist today. See `docs/ANALYTICS_GAPS.md` for the specification. Do not build placeholder charts; use an explanatory card instead.

**Shared metrics:**
Any metric that appears on more than one page must be computed in exactly one place on the backend. Both the overview dashboard and analytics page consume `compute_inventory_progress()` from `app/services/classification.py`, which returns both "material on record" (both sides have a real material from any source) and "field verified" (verified_status is Verified-Lead/Copper/Galvanized). Never duplicate this logic in a second endpoint or on the frontend.

**Constrained field validation:**
Compliance-critical fields with a defined set of valid values must validate server-side against that set. `PATCH /api/properties/` rejects invalid values for `verified_status` (against `VALID_VERIFIED_STATUSES`) and all four verification method columns (against `VALID_VERIFICATION_METHODS`), both defined in `app/services/classification.py`. Material columns (`hs_service`, `ss_service`) are not writable via API — they come from the CSV import, which normalizes via `clean_material()` in `import_data.py`.

**Data normalization:**
All text values in constrained columns use Title Case as canonical. The canonical sets for materials (`VALID_MATERIALS`) and verification methods (`VALID_VERIFICATION_METHODS`) live in `app/services/classification.py`. The import script normalizes via lookup maps (`_MATERIAL_CANONICAL`, `_VERIFICATION_METHOD_CANONICAL`) in `import_data.py`. Values not in the map pass through unchanged. Iron and Cast Iron are distinct materials — never merge them. If a re-import is needed, the import script handles normalization; manual SQL cleanup should not be necessary again.

---

## 11. Running the Project

**Backend (Terminal 1):**
```powershell
cd C:\lslp\backend
venv\Scripts\activate
uvicorn main:app --reload
```
API runs at `http://127.0.0.1:8000`. Interactive docs at `http://127.0.0.1:8000/docs`.

**Frontend (Terminal 2):**
```powershell
cd C:\lslp\frontend
npm run dev
```
Dashboard runs at `http://localhost:5173`.

Both must be running for the dashboard to work.

---

## 12. Reference Files

- `PROGRESS.md` — what's built, file by file
- `ROADMAP.md` — what's coming, phase by phase
- `requirements.txt` — Python dependencies
- `frontend/package.json` — Node dependencies
- `.env.example` — template for `.env` (create this if it doesn't exist)
