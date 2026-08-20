# PROGRESS.md

Snapshot of what's built, file by file.

---

## Overall Status

```
Phase 1 — Foundation              ✅ COMPLETE
Phase 2 — PWA + Customer Portal   🔨 IN PROGRESS (2.1–2.8 ✅, TIMESTAMPTZ done, wrap-up next)
Phase 3 — Automation              ⏳ NOT STARTED
Phase 4 — ML Image Classifier     ⏳ FUTURE / OPTIONAL
```

---

## What's Running Right Now

| Service | URL | Status |
|---|---|---|
| FastAPI backend | `http://127.0.0.1:8000` | ✅ Running with `uvicorn main:app --reload` |
| Swagger docs | `http://127.0.0.1:8000/docs` | ✅ Auto-generated |
| React dashboard | `http://localhost:5173` | ✅ Running with `npm run dev` |
| PostgreSQL | `localhost:5432` | ✅ Running locally |
| pgAdmin | local | ✅ Installed and connected |

---

## Database

### Tables (all 6 created with indexes)

| Table | Rows | Source | Status |
|---|---|---|---|
| `properties` | 10,475 | `SL_Inventory.csv` | ✅ Imported |
| `visits` | 168 | `D2D_Jan2026.csv` | ✅ Imported |
| `outreach_log` | 9,485 | `Outreach_Log.csv` (wide→long converted) | ✅ Imported |
| `customer_submissions` | 0 | Phase 2 — customer portal | ✅ Schema ready |
| `users` | 1+ | Phase 2 — Firebase Auth | ✅ Admin + field crew accounts |
| `audit_log` | 0 | Auto-populated by triggers (later) | ✅ Schema ready |

### Indexes
- `idx_visits_account` on `visits.account_number`
- `idx_visits_visited_at` on `visits.visited_at`
- `idx_outreach_account` on `outreach_log.account_number`
- `idx_outreach_date` on `outreach_log.outreach_date`
- `idx_submissions_account` on `customer_submissions.account_number`
- `idx_properties_address` on `properties.address`
- `idx_properties_status` on `properties.verified_status`

### Migrations (Alembic)
- **Baseline:** `9cda6424c61a` — empty baseline, DB stamped (all models reconciled to match live schema first).
- **`99aa61d63ed4`** — adds `follow_up_date` (DATE, nullable) to `visits` and `outreach_log`.
- **`4b782110b6d1`** — adds `needs_return` (BOOLEAN, server_default false) to `visits`.
- **For any schema change:** run `alembic revision --autogenerate -m "description"` then `alembic upgrade head`.
- When adding new models, also import them in `alembic/env.py`.
- See `docs/MIGRATIONS.md` for the full workflow.

### TIMESTAMPTZ Migration (2026-08-17)
7 of 10 timestamp columns migrated from `TIMESTAMP WITHOUT TIME ZONE` to `TIMESTAMPTZ`:
- ✅ `visits.visited_at`, `visits.created_at`
- ✅ `outreach_log.created_at`
- ✅ `customer_submissions.submitted_at`, `customer_submissions.reviewed_at`
- ✅ `audit_log.changed_at`
- ✅ `users.created_at`
- 🔲 `properties.created_at`, `properties.updated_at`, `properties.springbrook_synced_at` — pending

Historical naive timestamps were stored as Eastern local time; PostgreSQL converted them correctly on migration (server timezone is `America/New_York`).

---

## Backend — `C:\lslp\backend\`

### Top-level files
| File | Purpose | Status |
|---|---|---|
| `main.py` | FastAPI app, CORS, router registration | ✅ Complete |
| `.env` | DB creds + Firebase project ID | ✅ Created (NOT committed) |
| `.env.example` | Template showing all required keys | ✅ Created |
| `import_data.py` | One-time CSV → PostgreSQL import script; normalizes materials + verification methods on import | ✅ Executed + updated |
| `requirements.txt` | Python dependencies | ✅ Updated (includes firebase-admin) |
| `lslp_schema.sql` | Initial table creation SQL | ✅ Executed once via pgAdmin |
| `alembic.ini` | Alembic config (DB URL set dynamically from .env) | ✅ Configured |

### Installed packages
```
fastapi, uvicorn, sqlalchemy, alembic, python-multipart,
psycopg2-binary, pandas, python-dotenv, numpy, firebase-admin,
pyjwt, cryptography, requests
```

### `app/database.py`
SQLAlchemy engine, `SessionLocal`, `Base`, `get_db()` dependency. ✅ Complete.

### `app/models/` — SQLAlchemy table definitions
| File | Class | Status | Notes |
|---|---|---|---|
| `property.py` | `Property` | ✅ Complete | Maps to `properties` table |
| `visit.py` | `Visit` | ✅ Complete | `access_granted` is `String` not `Boolean` |
| `outreach.py` | `OutreachLog` | ✅ Complete | Imported as `Outreach` in API via alias |
| `user.py` | `User` | ✅ Complete | Maps to `users` table; added Phase 2.1 |
| `submission.py` | `CustomerSubmission` | ✅ Complete | Maps to `customer_submissions` table; added Phase 2.5 |
| `audit_log.py` | `AuditLog` | ✅ Complete | Maps to `audit_log` table; added Phase 2.6 |

### `app/schemas/` — Pydantic schemas
| File | Schemas | Status | Notes |
|---|---|---|---|
| `property.py` | `PropertyBase`, `PropertyUpdate`, `PropertyResponse` | ✅ Updated | `PropertyUpdate` validates `verified_status` + 4 verification method columns against canonical sets |
| `visit.py` | `VisitBase`, `VisitCreate`, `VisitResponse` | ✅ Complete | `model_config = {"from_attributes": True}` on `VisitBase` |
| `outreach.py` | `OutreachCreate`, `OutreachResponse` | ✅ Updated | `initials` removed from Create (set server-side); `created_by_uid`/`created_by_email` added to Response |
| `submission.py` | `SubmissionCreate`, `SubmissionResponse`, `SubmissionReview`, `SubmissionCounts` | ✅ Updated | `reviewed_by` removed from `SubmissionReview` (set server-side); `reviewed_by_name` added to Response |

### `app/api/` — Route handlers
| File | Endpoints | Auth | Status |
|---|---|---|---|
| `analytics.py` | `GET /` | office_staff/supervisor/admin | ✅ New — all chart datasets in one response, uniform filter application |
| `auth.py` (routes) | `GET /me` | any auth | ✅ New (Phase 2.7b) |
| `users.py` | `GET /me/activity` | any auth | ✅ New — paginated activity trail for the authenticated user |
| `dashboard.py` | `GET /summary` | office_staff/supervisor/admin | ✅ New |
| `properties.py` | `GET /`, `GET /{id}`, `PATCH /{id}` | GET: any auth; PATCH: office_staff+ (writes audit_log per field change) | ✅ Updated |
| `visits.py` | `GET /`, `GET /{id}`, `GET /field-users`, `POST /` | GET: office_staff+; field-users: office_staff+; POST: any auth (sets `created_by_uid` from performer, `entered_by_uid` from authenticated user) | ✅ Updated |
| `outreach.py` | `GET /`, `GET /{id}`, `POST /` | all: office_staff+; POST sets `initials`+`created_by_uid` from user profile | ✅ Updated |
| `submissions.py` | `GET /property-search`, `POST /`, `GET /counts`, `GET /`, `GET /{id}`, `PATCH /{id}/review` | Portal: API key; Internal: office_staff+ (review sets `reviewed_by` from authenticated user) | ✅ Updated |

### `app/services/`
| File | Purpose | Status |
|---|---|---|
| `storage.py` | Local file storage for photos (`save_photo`, `delete_photo`) | ✅ Complete |
| `auth.py` | Firebase JWT verification via public JWKS + role enforcement | ✅ Complete (Phase 2.1) |
| `classification.py` | Shared inventory progress metrics (`compute_inventory_progress` with method breakdown), priority classification (`compute_priority`, `_PRIORITY_SQL`, `PRIORITY_LABELS`), canonical value sets (`VALID_MATERIALS`, `VALID_VERIFIED_STATUSES`, `VALID_VERIFICATION_METHODS`) | ✅ Updated |

### `alembic/`
| File | Purpose | Status |
|---|---|---|
| `alembic.ini` | Config — DB URL sourced from `.env` at runtime | ✅ Configured |
| `alembic/env.py` | Loads `.env`, imports all models, sets `target_metadata` | ✅ Configured |
| `alembic/versions/6069791d1b62_baseline.py` | Empty baseline — DB stamped here, no ops | ✅ Committed |

### Bugs fixed during performer/enterer implementation
10. **FastAPI route ordering** — `GET /api/visits/field-users` was registered after `GET /api/visits/{visit_id}`, causing FastAPI to try parsing "field-users" as an integer → 422. Fixed by moving `/field-users` before `/{visit_id}` in `visits.py`.

### Bugs fixed during Phase 2.3
7. **CORS preflight 400 on offline sync POST** — `main.py` only allowed `http://localhost:5173`. The browser sent the sync POST from `http://127.0.0.1:5173` (a different origin). Fixed by adding `http://127.0.0.1:5173` to `allow_origins`. Auth token is correctly attached by the shared Axios interceptor — no changes needed in `sync.js`.
8. **403 on all protected endpoints** — `auth.py` extracted the Firebase UID from `decoded.get("uid")` but Firebase JWTs store the user ID in `sub`, not `uid`. Changed to `decoded.get("sub")`. Token decoding was succeeding; only the DB lookup was failing.
9. **"Saved Locally" screen navigated to property detail while offline** — property detail makes an API call that fails when offline, showing "property not found." Fixed by navigating to `/` (home/search page) instead, which requires no API call. Online success path still navigates to the property page.

### Bugs fixed during Phase 1 (don't reintroduce these)
1. **`access_granted` type mismatch** — was `Boolean`, but real data contains values like "No Answer" and "Scheduled". Changed column type to `String` in both model and Pydantic schema.
2. **`initials` null Pydantic validation** — moved `model_config = {"from_attributes": True}` from `VisitResponse` up to `VisitBase`.
3. **`attempt_number` "multiple values" TypeError** — `attempt_number` was in `OutreachBase`, which got unpacked along with the server-calculated value. Fixed by removing it from `OutreachCreate`.
4. **`OutreachLog` vs `Outreach` import error** — model class is `OutreachLog`; API uses `from app.models.outreach import OutreachLog as Outreach`.

### Bugs/decisions from Phase 2.1
5. **Firebase service account key creation blocked by org policy** — switched to JWKS-based token verification using `PyJWKClient` against Firebase's public key endpoint. Only requires `FIREBASE_PROJECT_ID` in `.env`. No service account JSON needed.
6. **Firebase Admin SDK crashes at import if credentials missing** — wrapped initialization in try/except; error is surfaced at request time (500), not import time.

### Department Demo Feedback Changes (2026-08-20)

Five changes from the department's demo:

1. **Property search typeahead on office forms** — `NewVisit.jsx` and `NewOutreach.jsx` now use `PropertySearch` shared component instead of raw account number input. Prefill from PropertyDetail passes `account_number` + `address` via router state.
2. **Return-needed flag** — `needs_return` (Boolean) on visits. Prominent amber checkbox on both field and office forms. Properties with unresolved returns appear in a dashboard action card and filterable via `?needs_return=true`. Auto-resolves: a later successful visit (access=Yes, needs_return not true) removes the property from the queue without explicitly clearing the flag.
3. **Follow-up date on outreach** — `follow_up_date` (DATE) on `outreach_log`. Required when outcome is Scheduled or Follow-up, rejected otherwise. Validated on client and server.
4. **Follow-up date on visits** — `follow_up_date` (DATE) on `visits`. Required when access is Scheduled (labeled "Appointment Date" in UI), rejected otherwise. Validated on client and server.
5. **Photos required on customer portal** — "Skip photos and submit" removed. Submit button disabled until ≥1 photo uploaded. Server returns 422 if no photos attached.

Frontend files changed: `NewVisit.jsx`, `NewOutreach.jsx`, `FieldVisitForm.jsx`, `Overview.jsx`, `PropertyDetail.jsx`, `PropertiesList.jsx`, `SubmitForm.jsx`.
New shared component: `PropertySearch.jsx`.
Validation helpers added to `validation.js`: `isFollowUpPermitted`, `isOutreachFollowUpRequired`, `isOutreachFollowUpPermitted`.

### Phase 2.1 E2E — confirmed 2026-05-13
- Unauthenticated users are redirected to `/login`; after sign-in, redirect back to the intended page ✅
- Bearer token is attached to all API calls; backend accepts authenticated requests ✅
- Unauthenticated API requests return `{"detail": "Not authenticated"}` (401) ✅
- Role enforcement confirmed: `field_crew` cannot POST outreach (403), `admin` can ✅

---

## Frontend — `C:\lslp\frontend\`

### Stack
React 18 + Vite + Tailwind v4 (via `@tailwindcss/postcss`) + React Router DOM + Axios + Firebase JS SDK + shadcn/ui (Radix UI + Luma preset).

### Installed packages
```
axios, react-router-dom, @tanstack/react-query,
tailwindcss, @tailwindcss/postcss, autoprefixer, postcss,
firebase, vite-plugin-pwa, dexie,
radix-ui, class-variance-authority, clsx, tailwind-merge,
lucide-react, @fontsource-variable/inter, tw-animate-css,
recharts
```

### Top-level
| File | Purpose | Status |
|---|---|---|
| `vite.config.js` | Vite config — React plugin + VitePWA with manifest + Workbox Service Worker | ✅ Updated Phase 2.2 |
| `postcss.config.js` | Configures `@tailwindcss/postcss` and `autoprefixer` | ✅ Complete |
| `src/index.css` | Single line: `@import "tailwindcss";` | ✅ Complete |
| `src/main.jsx` | React root render + calls `initSync()` on app load | ✅ Updated Phase 2.3 |
| `src/App.jsx` | Router setup — `/login` public, `/` is Overview, `/properties` is search, all dashboard routes in `<RequireAuth allowedRoles>`, `UserProvider` wraps app | ✅ Updated Phase 2.7b |
| `.env.local` | Firebase web SDK keys (`VITE_*`) — NOT committed | ✅ Created |

### `src/lib/`
| File | Purpose | Status |
|---|---|---|
| `api.js` | Axios instance + endpoint wrappers + Bearer token interceptor + `getDashboardSummary` + `getCurrentUser` + `getUserActivity` | ✅ Updated |
| `firebase.js` | Firebase app init from `VITE_*` env vars, exports `auth` | ✅ New Phase 2.1 |
| `UserContext.jsx` | React context providing `firebaseUser`, `role`, `profile`, `loading` — fetches `/api/auth/me` once on login | ✅ New Phase 2.7b |
| `design.js` | Legacy design tokens (deprecated — use `design-system.js`) | ✅ Superseded |
| `design-system.js` | Civic Modern design system: colors, materialConfig, statusConfig, roleConfig, priorityConfig, getMaterial/getStatus/getPriority/getRoleDisplay helpers, typeScale, layout tokens | ✅ Updated |
| `utils.js` | shadcn `cn()` helper (clsx + tailwind-merge) | ✅ New (shadcn init) |

### `src/components/`
| File | Purpose | Status |
|---|---|---|
| `Navbar.jsx` | Top nav bar, role-filtered nav items, rebuilt user menu (avatar, name, email, role badge, Account link, Sign out) | ✅ Updated |
| `RequireAuth.jsx` | Auth gate + role gate — explicit role-based home redirects, error state for failed role fetch | ✅ Updated |
| `PropertySearch.jsx` | Shared property typeahead — debounced search, dropdown with address + account number + material indicator | ✅ New |
| `ui/*.jsx` | 20 shadcn/ui components: button, input, input-group, label, select, textarea, card, badge, table, tabs, separator, avatar, dropdown-menu, alert, skeleton, dialog, sheet, sonner, command, popover, chart | ✅ Installed |

### `src/pages/Dashboard/`
| File | Purpose | Status |
|---|---|---|
| `Overview.jsx` | Office staff landing page — inventory verified headline with method breakdown, verification status bar, action cards (submissions, stalled, untouched, needs return), upcoming follow-ups, activity feed, field trend | ✅ Updated |
| `PropertiesList.jsx` | Search with shadcn Input/Table/Badge/Skeleton, design tokens, URL filter params (`verified_status`, `stalled`, `untouched`, `priority`) with dismissible chips, priority column + filter dropdown | ✅ Updated |
| `PropertyDetail.jsx` | Card with blue accent border, 2x2 material grid with color-coded borders, shadcn Tabs/Table/Badge/Skeleton | ✅ Redesigned (shadcn) |
| `Analytics.jsx` | Compliance analytics page — inventory verified headline with method breakdown, priority distribution chart, material pairings heatmap, distribution bars, verification/outreach time series, CSV export, deferred replacement tracking placeholder | ✅ Updated |
| `NewVisit.jsx` | shadcn Card form, tap-button selectors for Access/Outcome, dashed photo upload area, validation + offline | ✅ Redesigned (shadcn) |
| `NewOutreach.jsx` | shadcn Card form, read-only identity card (replaces initials input), customer-initiated section, validation | ✅ Updated |

### `src/pages/`
| File | Purpose | Status |
|---|---|---|
| `Login.jsx` | Centered Card with MV seal; explicit post-login destination by role (field_crew → /field, others → /) | ✅ Updated |
| `Account.jsx` | Account page — identity block, contribution counts, paginated activity trail | ✅ New |

### Phase 2.2 — PWA Setup

| File | Purpose | Status |
|---|---|---|
| `vite.config.js` | Updated — VitePWA plugin registered with manifest + Workbox Service Worker | ✅ Complete |
| `public/icons/icon-192.png` | 192×192 placeholder app icon (solid #1A56A0) | ✅ Created |
| `public/icons/icon-512.png` | 512×512 placeholder app icon (solid #1A56A0) | ✅ Created |

**Manifest** (`dist/manifest.webmanifest` at build time):
- name: "LSLP Platform", short_name: "LSLP"
- display: standalone, start_url: "/"
- theme_color: #1A56A0

**Service Worker** (Workbox via `generateSW` mode):
- App shell (JS/CSS/HTML/images) precached on install — 11 entries, ~431 KB
- API routes (`/api/*`) use NetworkFirst with 10 s timeout, 24 h cache, 200-entry max
- `dist/sw.js` + `dist/workbox-*.js` generated on every build

### Phase 2.3 — Offline Mode

**New packages:**
- `dexie@4.4.2` — IndexedDB wrapper for offline visit storage

| File | Purpose | Status |
|---|---|---|
| `src/lib/db.js` | Dexie DB `lslpOfflineDB` — `pendingVisits` table (++id, syncStatus, savedAt indexed) | ✅ New |
| `src/lib/sync.js` | `initSync()` — registers `online` listener; `syncPendingVisits()` — drains pending visits, dispatches `lslp:sync-success` or `lslp:sync-failed`; `getPendingCount()` | ✅ New |
| `src/pages/Dashboard/NewVisit.jsx` | Offline path: saves to IndexedDB, dispatches `lslp:sync-pending`, shows "Saved Locally" screen, navigates to `/` after 2 s; online path unchanged | ✅ Updated |
| `src/components/Navbar.jsx` | Event-driven sync indicator — no polling; listens for `lslp:sync-*` events; shows orange pending / green success (3 s) / red fail + Retry | ✅ Updated |
| `src/main.jsx` | Calls `initSync()` on app load to register the `online` listener | ✅ Updated |

**Offline record shape** (stored in IndexedDB):
```
{ id (auto), formData (all visit fields), photos (File blobs), savedAt (ISO string), syncStatus ("pending" | "failed") }
```

**Sync behavior:**
- On reconnect: drains all `syncStatus = "pending"` records, POSTs each as `multipart/form-data`, deletes on success, marks `failed` on error
- Failures do not crash the sync loop — remaining records continue to sync
- `syncPendingVisits` is exported — called by `initSync` on `online` event and directly by Navbar retry button

**Real-time Navbar sync indicator (event-driven, no polling):**
- Offline save → `lslp:sync-pending` dispatched from `NewVisit.jsx` → badge appears immediately
- Sync success → `lslp:sync-success` dispatched → badge clears, green "✅ Synced" shows 3 s then hides
- Sync failure → `lslp:sync-failed` dispatched → red "⚠️ Sync failed — X records pending" + Retry button
- Retry button calls `syncPendingVisits()` directly and resets failure state
- No `setInterval` polling

### Phase 2.4 — PWA Field Visit Form

| File | Purpose | Status |
|---|---|---|
| `src/pages/FieldApp/FieldVisitForm.jsx` | Mobile-first field visit form — 2-step: property search → log visit | ✅ New |
| `src/App.jsx` | `/field` route added outside `<RequireAuth>`; imports `FieldVisitForm` | ✅ Updated |
| `src/components/Navbar.jsx` | "📱 Field App" button added | ✅ Updated |
| `backend/app/models/visit.py` | `gps_coordinates = Column(JSONB)` added | ✅ Updated |
| `backend/app/schemas/visit.py` | `gps_coordinates: Optional[dict] = None` added to `VisitBase` | ✅ Updated |
| `backend/app/api/visits.py` | `gps_coordinates: Optional[str] = Form(None)` param added; parsed with `json.loads()` before save | ✅ Updated |

**FieldVisitForm behavior:**

*Step 1 — Find Property*
- Search input fires after 3 chars (300 ms debounce) → `GET /api/properties/?search=...&limit=10`
- Dropdown shows address + account number for each match
- Selecting a result shows a confirmation card (address, account, hs/ss service, status)
- Crew can also type an account number directly — Continue button appears at 6+ chars
- "Looks right — Continue →" moves to Step 2

*Step 2 — Log Visit*
- Property address shown in header as context; tapping it returns to Step 1
- GPS: `navigator.geolocation.getCurrentPosition()` fires on mount; stored as `{ lat, lng }`, serialized to JSON string for FormData; shown as "📍 Location captured / unavailable"
- Access Granted: tap buttons (Yes / No / No Answer / Refused / Scheduled)
- Verification Outcome: tap buttons with color coding (Lead=red, Copper=green, Galvanized=orange)
- Property Type: dropdown
- Initials + Notes: standard inputs
- Photos: hidden `<input capture="environment">` triggered by "📷 Take Photo" button; up to 3; thumbnail previews with remove button
- Submit: online → POST to API; offline → IndexedDB + `lslp:sync-pending` event; success → 2 s confirmation then resets to Step 1 (no navigation — ready for next property)

**DB migration required — run this in pgAdmin before using GPS:**
```sql
ALTER TABLE visits ADD COLUMN gps_coordinates JSONB;
```

**Known limitation:** `/field` is outside `<RequireAuth>` but all API calls still require Firebase auth. Field crew must be logged in (prior session) for property search to work. Auth for field crew is Phase 2.5+.

### Phase 2.5 — Customer Portal

**New backend files:**

| File | Purpose | Status |
|---|---|---|
| `app/models/submission.py` | SQLAlchemy model for `customer_submissions` table | ✅ New |
| `app/schemas/submission.py` | `SubmissionCreate`, `SubmissionResponse`, `SubmissionReview` | ✅ New |
| `app/api/submissions.py` | All submission endpoints (see below) | ✅ New |
| `main.py` | Registered `submissions.router` at `/api/submissions` | ✅ Updated |
| `.env.example` | Added `PORTAL_API_KEY=` | ✅ Updated |

**Submissions API endpoints:**

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/submissions/property-search?search=...` | Portal API key | Public property search — address only, no internal fields |
| `POST /api/submissions/` | Portal API key | Create customer submission with optional photos |
| `GET /api/submissions/` | Firebase JWT + office_staff+ | List all; filter by `review_status` query param |
| `GET /api/submissions/{id}` | Firebase JWT + office_staff+ | Single submission |
| `PATCH /api/submissions/{id}/review` | Firebase JWT + office_staff+ | Set `review_status`, `reviewed_by`, `reviewed_at` |

Portal API key header: `X-Portal-API-Key: lslp-portal-2026` — add `PORTAL_API_KEY=lslp-portal-2026` to `backend/.env`.

**New frontend files:**

| File | Purpose | Status |
|---|---|---|
| `src/pages/Portal/SubmitForm.jsx` | 3-step public portal — no Navbar, no auth, standalone page | ✅ New |
| `src/App.jsx` | `/submit` route added outside `<RequireAuth>`, no Navbar wrapper | ✅ Updated |

**SubmitForm — 3-step flow:**
- Step 1: Address search (debounced, 3+ chars) → dropdown (address only, no account numbers shown to public) → "Is this your property?" confirmation with Yes/No
- Step 2: Full name (required), phone/email (required), year constructed (dropdown), prior line work (Yes/No/Not sure tap buttons), notes textarea if Yes
- Step 3: Up to 3 photos, "Skip photos and submit" option; POST with portal API key; success screen shows reference number (`#id`)
- All `fetch` calls use `X-Portal-API-Key` header directly — does not use the shared `api.js` Axios instance (no Firebase token needed)

**Configuration required:** Add `PORTAL_API_KEY=lslp-portal-2026` to `backend/.env`

### UI Redesign — shadcn/ui + Mount Vernon Seal

**Design system:** `src/lib/design-system.js` — centralized tokens: `colors` (civic blue, semantic material/status colors), `materialConfig` (per-material color/badge/border/dot classes), `statusConfig` (per-status badge classes), helper functions `getMaterial()` / `getStatus()`, `typeScale` (pageTitle, sectionTitle, body, caption, label, data), `layout` (page, narrowPage, cardGrid, stack). CSS custom properties added to `src/index.css` (`--civic`, `--civic-dark`, semantic colors) plus `tabular-nums` utility class.

**shadcn/ui setup:**
- Preset: Radix UI + Luma
- Icon library: lucide-react
- Font: Inter Variable (`@fontsource-variable/inter`)
- Base color: neutral, CSS variables enabled
- 19 components installed in `src/components/ui/` (added: command, popover, input-group)
- framer-motion installed for spring physics (step transitions, confirmation cards, tap feedback)

**Civic Modern redesign (second pass):**

1. **Navbar** — 68px height, two-tone gradient bg (`#1A56A0` → `#143F75`), border-b, bare seal (no white circle), vertical divider + stacked text, segmented control nav with white pill active state + lucide icons, user initials avatar with role Badge in dropdown, mobile hamburger below lg breakpoint
2. **Login** — gradient bg, centered Card, bare seal (h-20), font-semibold tracking-tight headings, civic blue button with hover state
3. **PropertiesList** — debounced typeahead (250ms at 2+ chars) with floating suggestion list (top 8, keyboard nav, escape/arrow/enter), client-side pagination (25/50/100 per page, Previous/Next + numbered pages with ellipsis, "Showing X–Y of Z"), bordered table (no shadow), tabular-nums on data columns
4. **PropertyDetail** — material value hierarchy with colored dots, verified/not-verified pills (ShieldCheck/ShieldQuestion icons), bordered tables, design-system tokens throughout
5. **NewVisit** — shadcn Select for property type (replacing native `<select>`), tabular-nums on account number, civic blue buttons
6. **NewOutreach** — shadcn Select with SelectGroup/SelectLabel for method and outcome (replacing native `<select>`), tabular-nums, civic blue theme
7. **FieldVisitForm** — single Input search with absolute dropdown (no duplicate input), no local header bar (global Navbar handles location), shadcn Select for property type, card-style back-nav in step 2, framer-motion spring transitions (AnimatePresence step slides, confirmation card scale-in, whileTap on tap buttons, spring-in success/offline screens), tabular-nums on account numbers
8. **SubmitForm** — warmer bg (`#FAFAF8`), stepper with green checkmarks for completed steps, single Input search with absolute dropdown (no duplicate input), shadcn Select for year constructed, framer-motion spring step transitions (AnimatePresence across all 3 steps + success), whileTap on prior-line-work buttons, spring-in confirmation card + success screen, tabular-nums reference number

**Global design tokens applied:**
- Page bg: `bg-slate-50`
- Titles: `text-2xl font-bold text-slate-800`
- Body: `text-slate-600` / `text-muted-foreground`
- Primary color: `#1A56A0` via inline style (not overriding shadcn CSS vars)
- All emojis replaced with lucide-react icons (CheckCircle, WifiOff, Search, Camera, MapPin, etc.)

### Visual System — Surface Depth, Page Reveals, Route Transitions

**Three-tier surface depth system** (CSS classes in `src/index.css`):

| Tier | Class | Treatment |
|---|---|---|
| Arrival | `.arrival-surface` | Radial light bloom + 48px white survey grid at 6% opacity over navy gradient |
| Canvas | `.canvas-surface` | 48px navy survey grid at 3% opacity over subtle slate gradient |
| Data | (none — flat white) | Cards/tables/panels: no gradients, no patterns, no texture |

**Page-load reveals** (`src/components/PageReveal.jsx`):
- `PageReveal` — framer-motion stagger container (`staggerChildren: 0.04`)
- `RevealItem` — spring-animated child (`stiffness: 380, damping: 30`, `y: 8` → `y: 0`)
- Applied to: PropertiesList (3 items), PropertyDetail (4 items), NewVisit (2 items), NewOutreach (2 items), SubmitForm (2 items)
- Table containers reveal as one unit; individual rows never animate
- Success/offline confirmation screens use standalone `motion.div` with spring scale-in

**App-shell route transitions** (`src/App.jsx`):
- `ShellRoutes` component: Navbar persists outside AnimatePresence; content area wrapped in `AnimatePresence mode="wait"` keyed on `location.pathname`
- `MotionConfig reducedMotion="user"` at root respects `prefers-reduced-motion`
- Login and SubmitForm are standalone routes outside the shell — own entrance animations
- All routes within the shell animate identically (spring opacity fade, `stiffness: 400, damping: 35`)

**Files changed:**
- `src/index.css` — added `.canvas-surface` and `.arrival-surface` CSS classes after `@layer utilities`
- `src/components/PageReveal.jsx` — new file
- `src/App.jsx` — full rewrite: `ShellRoutes` pattern with AnimatePresence
- `src/components/RequireAuth.jsx` — removed hardcoded bg, uses `calc(100dvh - 68px)` for loading centering
- `src/pages/Login.jsx` — uses `.arrival-surface`, framer-motion stagger entrance
- `src/pages/Dashboard/PropertiesList.jsx` — PageReveal wrapper (3 RevealItems)
- `src/pages/Dashboard/PropertyDetail.jsx` — PageReveal wrapper (4 RevealItems)
- `src/pages/Dashboard/NewVisit.jsx` — PageReveal wrapper + spring success/offline screens
- `src/pages/Dashboard/NewOutreach.jsx` — PageReveal wrapper + spring success screen
- `src/pages/FieldApp/FieldVisitForm.jsx` — removed own bg/min-h-screen, adjusted heights to `calc(100dvh - 68px)`
- `src/pages/Portal/SubmitForm.jsx` — canvas-surface bg, survey grid on portal header, PageReveal on stepper/card
- `docs/CLAUDE.md` — added "Visual system" section (§8)

### Phase 2.6 — Customer Submission Review Queue

**New backend files:**

| File | Purpose | Status |
|---|---|---|
| `app/models/audit_log.py` | SQLAlchemy model for `audit_log` table | ✅ New |
| `app/schemas/submission.py` | Added `SubmissionCounts`, `verified_material`/`notes` to `SubmissionReview`, `address` to `SubmissionResponse` | ✅ Updated |
| `app/api/submissions.py` | Added `GET /counts`, extended `PATCH /{id}/review` with material verification + audit logging, added pagination, address joining | ✅ Updated |
| `alembic/env.py` | Imported `AuditLog` and `CustomerSubmission` models | ✅ Updated |

**New/updated submission API endpoints:**

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/submissions/counts` | Firebase JWT + office_staff+ | Returns `{pending, approved, rejected}` for badge counts |
| `GET /api/submissions/?review_status=&skip=&limit=` | Firebase JWT + office_staff+ | Paginated list with optional status filter |
| `PATCH /api/submissions/{id}/review` | Firebase JWT + office_staff+ | Extended: accepts `verified_material` (Lead/Copper/Galvanized/Unknown); on approval with material, updates property `verified_status` and writes `audit_log` entry |

**Approval flow:**
- Reviewer selects material from photos → `verified_material` sent with review
- Property's `verified_status` updated to `Verified-Lead` / `Verified-Copper` / `Verified-Galvanized` / `Unknown`
- `audit_log` entry created: `table=properties`, `field=verified_status`, `old_value → new_value`, `changed_by` includes reviewer name and submission ID
- Rejection only updates the submission; property record is never touched

**New frontend files:**

| File | Purpose | Status |
|---|---|---|
| `src/pages/Dashboard/SubmissionsQueue.jsx` | Review queue with Pending/Approved/Rejected filter tabs, counts, pagination | ✅ New |
| `src/pages/Dashboard/SubmissionDetail.jsx` | Photo lightbox with keyboard nav, customer info vs. property record side-by-side, approve/reject dialogs | ✅ New |
| `src/App.jsx` | Added `/submissions` and `/submissions/:id` routes inside RequireAuth; added `<Toaster>` for sonner | ✅ Updated |
| `src/components/Navbar.jsx` | Added "Submissions" nav item with amber pending count badge | ✅ Updated |
| `src/components/ui/sonner.jsx` | Removed `next-themes` dependency (not a Next.js project) | ✅ Fixed |
| `src/lib/api.js` | Added `getSubmissions`, `getSubmission`, `getSubmissionCounts`, `reviewSubmission` wrappers | ✅ Updated |

---

## External Services Configured

| Service | Status | Notes |
|---|---|---|
| **Firebase project** | ✅ Created (`lslp-platform`) | Web app registered, config keys in `frontend/.env.local` |
| **Firebase Auth** | ✅ Active | Email/password provider on; admin account created |
| **Firebase Storage** | ❌ Not available | Requires paid plan — using local storage interim |
| **Firebase Admin SDK** | ✅ Not needed | Token verification uses public JWKS endpoint instead |

---

## Working Features — User-Facing Capabilities

A staff user can today, from the web dashboard:

1. **Sign in** with email/password via Firebase Auth — unauthenticated users are redirected to `/login`
2. **See the Overview dashboard** (`/`) — inventory verified headline (17.0%, 1,778 of 10,475) with classification method breakdown by side, actionable metric cards (pending submissions, stalled outreach, untouched properties), verification status bar, recent activity feed, field activity trend. Every number is clickable and routes to the filtered records it represents.
3. Search the full 10,475-property list by address or account number (now at `/properties`)
4. Click into any property and see its full classification, history of visits, and history of outreach
5. Log a new field visit (with optional photos uploaded to local storage)
6. Log a new outreach attempt (with automatic attempt-number sequencing)
7. From a property page, click **Log Visit** or **Log Outreach** and have the account number pre-filled
8. **Review customer submissions** — view pending submissions, inspect photos in a lightbox, approve with material classification (updates property record + audit log), or reject with optional reason
9. **Navbar shows pending submission count** — amber badge on the Submissions nav item
10. **View compliance analytics** (`/analytics`) — inventory verified headline with method breakdown (shared computation with dashboard), priority distribution chart (6 tiers from P1–P6), material pairings heatmap (public × private side), material distribution bars, verification over time, outreach outcomes over time (stacked area), outreach reach (distinct properties vs total attempts). Filters: date range, material, verification status, outreach outcome — applied uniformly across all datasets. CSV export of current filtered data including priority distribution. Deferred: replacement tracking (see `docs/ANALYTICS_GAPS.md`).

Role enforcement is active:
- `field_crew` — can access `/field` and `/account` only; can POST visits and search properties. Navbar shows only "Field App."
- `office_staff` — full access to all office routes except `/field`. Navbar hides "Field App."
- `supervisor` / `admin` — full access to all routes including `/field`
- Post-login destination is explicit per role: field_crew → /field, all others → /

Write attribution:
- Visits record two identities: `created_by_uid` (performer — who physically inspected) and `entered_by_uid` (enterer — who typed the record)
- On the field form, both are set to the authenticated user automatically
- On the office form, the logged-in user is the enterer; the performer is selected from a dropdown of active field_crew/supervisor/admin users. `initials` come from the performer's profile.
- `GET /api/visits/field-users` — lists active inspection-capable users for the performer selector (office_staff+ only)
- `reviewed_by` on submission reviews is set to the authenticated user's firebase_uid
- Property PATCH writes per-field audit_log entries with the authenticated user's firebase_uid
- Historical records have neither `created_by_uid` nor `entered_by_uid`; emails return null for those
- Where performer and enterer differ, "Entered by [email]" is shown visibly in the visits table and activity trail — not buried in a tooltip

Account page (`/account`):
- Available to all authenticated roles
- Shows identity block (name, email, role badge, join date) and contribution counts
- Paginated activity trail: visits, outreach, reviews, property changes — each linked to the property
- Only shows activity attributable to the requesting user; historical records with null `created_by_uid` never appear

Role display names (single source in `design-system.js`):
- field_crew → "Field Crew", office_staff → "Office Staff", supervisor → "Supervisor", admin → "Administrator"
- Used in Navbar user menu, account page, anywhere a role is rendered

### Fixes — Timestamp handling, field form validation, page resilience, portal validation

**Fix 1: Timezone-aware timestamps**
- All server-side timestamp writes now use `datetime.now(timezone.utc)` explicitly instead of relying on `server_default=func.now()` (which stores local time in TIMESTAMP WITHOUT TZ columns)
- `_to_utc_datetime` helper in `dashboard.py` and `users.py` fixed: naive timestamps are treated as server-local (Eastern) and converted to UTC, rather than being incorrectly labeled as UTC
- TIMESTAMPTZ migration applied 2026-08-17 (7/10 columns; 3 properties columns pending)
- Files changed: `visits.py`, `outreach.py`, `properties.py`, `submissions.py`, `dashboard.py`, `users.py`

**Fix 2: Field form validation**
- `FieldVisitForm.jsx`: `access_granted` is always required; `verification_outcome` required when access was granted (Yes); at least one photo required when access was granted; GPS never blocks
- Submit button disabled with first validation reason shown; same rules apply to offline save path
- Validation runs on every render (reactive), not just on submit

**Fix 3: PropertyDetail per-section degradation**
- `PropertyDetail.jsx`: split `Promise.all` into three independent loads (property, visits, outreach)
- Each section succeeds or fails independently; tab headers show `(!)` on failure; tab content shows "Could not load" message
- Property info still gates the page (404 → "Property not found")

**Fix 4: Portal validation audit + backend validation**
- Frontend (`SubmitForm.jsx`): name requires 2+ characters; contact validated as email or phone (7+ digits); `prior_line_work` is now required (was optional); photo type/size validation (JPEG/PNG/WebP/HEIC, 10 MB max); inline per-field error messages that clear on edit
- Backend (`submissions.py`): server-side validation mirrors frontend rules — name 2+ chars, contact format, prior_line_work required, photo type/size enforcement. Returns 422 with specific error messages. This endpoint is public (API key auth, no Firebase JWT) and takes input from the open internet.

### Phase 2.7 — Field Crew Authentication & Visit Attribution

**Backend changes:**

| File | Change | Status |
|---|---|---|
| `app/models/user.py` | Added `initials = Column(String(5))` | ✅ Updated |
| `app/models/visit.py` | Added `created_by_uid = Column(String(128))` | ✅ Updated |
| `app/schemas/visit.py` | Added `created_by_uid` and `created_by_email` to `VisitResponse` | ✅ Updated |
| `app/api/visits.py` | POST now captures authenticated user — sets `initials` and `created_by_uid` from profile, ignores client values; GET endpoints join user email | ✅ Updated |

**Frontend changes:**

| File | Change | Status |
|---|---|---|
| `src/App.jsx` | `/field` route wrapped in `<RequireAuth>` | ✅ Updated |
| `src/pages/FieldApp/FieldVisitForm.jsx` | Removed initials text input; added read-only user identity card (initials + email from Firebase auth) | ✅ Updated |
| `src/pages/Dashboard/PropertyDetail.jsx` | Visits table shows submitting email beneath initials for attributed visits; title tooltip on hover | ✅ Updated |

**New files:**

| File | Purpose | Status |
|---|---|---|
| `docs/ADDING_USERS.md` | Procedure for provisioning field crew accounts (Firebase Console + pgAdmin) | ✅ New |

**DB migration required — run in pgAdmin:**
```sql
ALTER TABLE users ADD COLUMN initials VARCHAR(5);
ALTER TABLE visits ADD COLUMN created_by_uid VARCHAR(128);
```

**Key decisions:**
- Visit attribution is account-based: `initials` and `created_by_uid` are set server-side from the authenticated user's profile — never from client input
- Historical visits (168 imported rows) have no `created_by_uid` and return `null` for `created_by_email`
- Firebase web SDK v9+ defaults to `browserLocalPersistence` (IndexedDB) — sessions survive browser restarts and device sleep
- Field crew use the existing login page; no separate auth flow

---

## Known Gaps (intentional — not bugs)

- ✅ **PWA manifest and Service Worker.** Phase 2.2 complete. Icons are placeholders — replace with real artwork before production.
- ✅ **Offline mode.** Phase 2.3 complete. `pendingVisits` stored in IndexedDB; sync fires on reconnect; Navbar badge shows pending count.
- ✅ **Field-optimized form.** Phase 2.4 complete. `/field` route, 2-step form, GPS capture, camera, offline-aware. Run `ALTER TABLE visits ADD COLUMN gps_coordinates JSONB;` in pgAdmin.
- ✅ **Customer portal.** Phase 2.5 complete. `/submit` public 3-step form; portal API key auth; submissions stored in `customer_submissions`.
- ✅ **Customer submission review queue.** Phase 2.6 complete. Approve/reject workflow with material classification, property updates, and audit logging.
- ✅ **Field crew authentication.** Phase 2.7 complete. `/field` requires login; visit attribution from authenticated account; `docs/ADDING_USERS.md` for provisioning.
- 🔲 **No audit log triggers.** The `audit_log` table exists and is written to by submission reviews, but no PostgreSQL triggers for automatic change tracking yet.
- 🔲 **No Springbrook sync, no Brightly auto-WO, no ArcGIS export endpoint.** All Phase 3.
- 🔲 **No Metabase.** Phase 3.
- 🔲 **No tests.** Phase 3 nice-to-have.
- 🔲 **outreach_log attempt_number edge case** — untested beyond 4 attempts (imported data max). Should work fine but worth a manual test before relying on it.
- 🔲 **Data normalization SQL** — casing variants in `hs_service`, `ss_service`, verification method columns, plus stray "string" values in 5 columns. UPDATE statements ready in `scratchpad/normalize_data.sql` (~432 property rows + 1 outreach row). CHECK constraints ready in `scratchpad/check_constraints.sql` — run after normalization. Import script (`import_data.py`) already normalizes on import; PATCH endpoint (`property.py`) validates against canonical sets.
- 🔲 **3 remaining TIMESTAMPTZ columns** — `properties.created_at`, `properties.updated_at`, `properties.springbrook_synced_at` still need `ALTER TABLE`.

---

## Git Status

- ✅ Git initialized at `C:\lslp\`. Branch: `main`.
- `.gitignore` covers `venv/`, `node_modules/`, `.env`, `.env.local`, `uploads/`, `__pycache__/`.
- All work through Phase 2.7 + UI redesign committed to `main`.
