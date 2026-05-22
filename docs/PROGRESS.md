# PROGRESS.md

Snapshot of what's built, file by file.

---

## Overall Status

```
Phase 1 — Foundation              ✅ COMPLETE
Phase 2 — PWA + Customer Portal   🔨 IN PROGRESS (2.1–2.5 ✅, review queue next)
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
| `users` | 1 | Phase 2 — Firebase Auth | ✅ Admin account created |
| `audit_log` | 0 | Auto-populated by triggers (later) | ✅ Schema ready |

### Indexes
- `idx_visits_account` on `visits.account_number`
- `idx_visits_visited_at` on `visits.visited_at`
- `idx_outreach_account` on `outreach_log.account_number`
- `idx_outreach_date` on `outreach_log.outreach_date`
- `idx_submissions_account` on `customer_submissions.account_number`
- `idx_properties_address` on `properties.address`
- `idx_properties_status` on `properties.verified_status`

### Migrations
- **Alembic: initialized.** Empty baseline migration committed and DB stamped at `6069791d1b62`.
- **For any schema change:** run `alembic revision --autogenerate -m "description"` then `alembic upgrade head`.
- When adding new models, also import them in `alembic/env.py`.

---

## Backend — `C:\lslp\backend\`

### Top-level files
| File | Purpose | Status |
|---|---|---|
| `main.py` | FastAPI app, CORS, router registration | ✅ Complete |
| `.env` | DB creds + Firebase project ID | ✅ Created (NOT committed) |
| `.env.example` | Template showing all required keys | ✅ Created |
| `import_data.py` | One-time CSV → PostgreSQL import script | ✅ Executed successfully |
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

### `app/schemas/` — Pydantic schemas
| File | Schemas | Status | Notes |
|---|---|---|---|
| `property.py` | `PropertyBase`, `PropertyUpdate`, `PropertyResponse` | ✅ Complete | |
| `visit.py` | `VisitBase`, `VisitCreate`, `VisitResponse` | ✅ Complete | `model_config = {"from_attributes": True}` on `VisitBase` |
| `outreach.py` | `OutreachCreate`, `OutreachResponse` | ✅ Complete | `attempt_number` removed from `OutreachCreate` — calculated server-side |

### `app/api/` — Route handlers
| File | Endpoints | Auth | Status |
|---|---|---|---|
| `properties.py` | `GET /`, `GET /{id}`, `PATCH /{id}` | GET: any auth; PATCH: office_staff+ | ✅ Complete |
| `visits.py` | `GET /`, `GET /{id}`, `POST /` | all: any auth | ✅ Complete |
| `outreach.py` | `GET /`, `GET /{id}`, `POST /` | GET: any auth; POST: office_staff+ | ✅ Complete |

### `app/services/`
| File | Purpose | Status |
|---|---|---|
| `storage.py` | Local file storage for photos (`save_photo`, `delete_photo`) | ✅ Complete |
| `auth.py` | Firebase JWT verification via public JWKS + role enforcement | ✅ Complete (Phase 2.1) |

### `alembic/`
| File | Purpose | Status |
|---|---|---|
| `alembic.ini` | Config — DB URL sourced from `.env` at runtime | ✅ Configured |
| `alembic/env.py` | Loads `.env`, imports all models, sets `target_metadata` | ✅ Configured |
| `alembic/versions/6069791d1b62_baseline.py` | Empty baseline — DB stamped here, no ops | ✅ Committed |

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

### Phase 2.1 E2E — confirmed 2026-05-13
- Unauthenticated users are redirected to `/login`; after sign-in, redirect back to the intended page ✅
- Bearer token is attached to all API calls; backend accepts authenticated requests ✅
- Unauthenticated API requests return `{"detail": "Not authenticated"}` (401) ✅
- Role enforcement confirmed: `field_crew` cannot POST outreach (403), `admin` can ✅

---

## Frontend — `C:\lslp\frontend\`

### Stack
React 18 + Vite + Tailwind v4 (via `@tailwindcss/postcss`) + React Router DOM + Axios + Firebase JS SDK.

### Installed packages
```
axios, react-router-dom, @tanstack/react-query,
tailwindcss, @tailwindcss/postcss, autoprefixer, postcss,
firebase, vite-plugin-pwa, dexie
```

### Top-level
| File | Purpose | Status |
|---|---|---|
| `vite.config.js` | Vite config — React plugin + VitePWA with manifest + Workbox Service Worker | ✅ Updated Phase 2.2 |
| `postcss.config.js` | Configures `@tailwindcss/postcss` and `autoprefixer` | ✅ Complete |
| `src/index.css` | Single line: `@import "tailwindcss";` | ✅ Complete |
| `src/main.jsx` | React root render + calls `initSync()` on app load | ✅ Updated Phase 2.3 |
| `src/App.jsx` | Router setup — `/login` public, all other routes wrapped in `<RequireAuth>` | ✅ Updated Phase 2.1 |
| `.env.local` | Firebase web SDK keys (`VITE_*`) — NOT committed | ✅ Created |

### `src/lib/`
| File | Purpose | Status |
|---|---|---|
| `api.js` | Axios instance + endpoint wrappers + Bearer token interceptor | ✅ Updated Phase 2.1 |
| `firebase.js` | Firebase app init from `VITE_*` env vars, exports `auth` | ✅ New Phase 2.1 |

### `src/components/`
| File | Purpose | Status |
|---|---|---|
| `Navbar.jsx` | Top nav + real-time sync indicator (event-driven: orange pending, green success 3 s, red fail + Retry button) | ✅ Updated Phase 2.3 |
| `RequireAuth.jsx` | Auth gate — loading state during Firebase init, redirect to `/login` if unauthed | ✅ New Phase 2.1 |

### `src/pages/Dashboard/`
| File | Purpose | Status |
|---|---|---|
| `PropertiesList.jsx` | Search by address or account number, table of results | ✅ Complete |
| `PropertyDetail.jsx` | Property header, service-line cards, Visits tab, Outreach tab | ✅ Complete |
| `NewVisit.jsx` | Form to log a field visit with optional photo upload | ✅ Complete |
| `NewOutreach.jsx` | Form to log an outreach attempt | ✅ Complete |

### `src/pages/`
| File | Purpose | Status |
|---|---|---|
| `Login.jsx` | Email/password sign-in form, redirects to intended page on success | ✅ New Phase 2.1 |

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
2. Search the full 10,475-property list by address or account number
3. Click into any property and see its full classification, history of visits, and history of outreach
4. Log a new field visit (with optional photos uploaded to local storage)
5. Log a new outreach attempt (with automatic attempt-number sequencing)
6. From a property page, click **Log Visit** or **Log Outreach** and have the account number pre-filled

Role enforcement is active:
- `field_crew` — can read everything, POST visits
- `office_staff` / `supervisor` / `admin` — all of the above + PATCH properties + POST outreach

---

## Known Gaps (intentional — not bugs)

- ✅ **PWA manifest and Service Worker.** Phase 2.2 complete. Icons are placeholders — replace with real artwork before production.
- ✅ **Offline mode.** Phase 2.3 complete. `pendingVisits` stored in IndexedDB; sync fires on reconnect; Navbar badge shows pending count.
- ✅ **Field-optimized form.** Phase 2.4 complete. `/field` route, 2-step form, GPS capture, camera, offline-aware. Run `ALTER TABLE visits ADD COLUMN gps_coordinates JSONB;` in pgAdmin.
- ✅ **Customer portal.** Phase 2.5 complete. `/submit` public 3-step form; portal API key auth; submissions stored in `customer_submissions`.
- 🔲 **No customer submission review queue.** Phase 2.6.
- 🔲 **No audit log triggers.** The `audit_log` table exists but nothing writes to it yet.
- 🔲 **No Springbrook sync, no Brightly auto-WO, no ArcGIS export endpoint.** All Phase 3.
- 🔲 **No Metabase.** Phase 3.
- 🔲 **No tests.** Phase 3 nice-to-have.
- 🔲 **outreach_log attempt_number edge case** — untested beyond 4 attempts (imported data max). Should work fine but worth a manual test before relying on it.

---

## Git Status

- ✅ Git initialized at `C:\lslp\`. Branch: `main`.
- `.gitignore` covers `venv/`, `node_modules/`, `.env`, `.env.local`, `uploads/`, `__pycache__/`.
- All work through Phase 2.3 (including bug fixes) committed to `main`.
