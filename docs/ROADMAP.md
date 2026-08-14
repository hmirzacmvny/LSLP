# ROADMAP.md

What's coming next, organized by phase. Each item is sized so a solo developer can finish it in a focused session or two.

---

## Immediate Next Actions (pick up here next session)

Phases 2.1–2.7 are complete. **Next: Phase 2.8 — Phase 2 Wrap-Up.**

**Pending action:** Run these in pgAdmin if not done yet:
```sql
ALTER TABLE visits ADD COLUMN gps_coordinates JSONB;
ALTER TABLE users ADD COLUMN initials VARCHAR(5);
ALTER TABLE visits ADD COLUMN created_by_uid VARCHAR(128);
```

Pre-phase hygiene tasks — all complete:

1. ~~**Initialize Git.**~~ ✅ Done — baseline committed on `main`.
2. ~~**Create `.env.example`.**~~ ✅ Done.
3. ~~**Initialize Alembic.**~~ ✅ Done — DB stamped at baseline `6069791d1b62`.
4. ~~**Test the login flow end-to-end.**~~ ✅ Done — unauthenticated requests return `{"detail": "Not authenticated"}` (401); role enforcement confirmed 2026-05-13.
5. **Add an `outreach_log` API edge case.** When a property already has 4 attempts and a 5th comes in, the `attempt_number` calculation should still work (we tested up to 4 because that's the imported data, but the new schema supports unlimited). Defer until Phase 2 wrap-up.

---

## Phase 2 — Field App + Customer Portal (Next ~5 weeks)

**Goal:** Get the dashboard onto iPads with offline support, and replace Plumsail with a real customer portal. Add login so we can stop running with the door wide open.

### 2.1 Firebase Auth Integration ✅ COMPLETE
- [x] Install `firebase` npm package in frontend
- [x] Create `src/lib/firebase.js` initializing the Firebase app from `VITE_*` env vars
- [x] Create `src/pages/Login.jsx` with email/password sign-in
- [x] Create `src/components/RequireAuth.jsx` — redirects unauthenticated users to `/login`
- [x] Wrap all Dashboard routes in `<RequireAuth>` in `App.jsx`
- [x] Install `firebase-admin` Python package
- [x] Create `app/services/auth.py` — JWT verification via public JWKS + `require_role` factory
- [x] Add auth dependencies to all protected endpoints per role matrix
- [x] Update `lib/api.js` to attach `Authorization: Bearer <token>` to every request
- [x] Admin account created in Firebase Auth + `users` table
- [x] **Test end-to-end:** login flow works, unauthenticated requests get `{"detail": "Not authenticated"}` (401), role enforcement confirmed 2026-05-13

> **Note:** Firebase service account key creation was blocked by org policy. Token verification uses Firebase's public JWKS endpoint via `PyJWKClient`. Only `FIREBASE_PROJECT_ID` is needed in `.env`.

### 2.2 PWA Setup ✅ COMPLETE (2026-05-13)
- [x] `npm install vite-plugin-pwa`
- [x] Update `vite.config.js` to register the plugin with manifest + Service Worker
- [x] Add app icons (192x192, 512x512) to `public/icons/` — solid #1A56A0 placeholders; replace with real artwork before production
- [x] Configure manifest: name "LSLP Platform", short_name "LSLP", display "standalone", theme_color #1A56A0
- [x] Configure Service Worker: app shell precached (11 entries); API routes use NetworkFirst with 10 s timeout + 24 h cache
- [ ] Test on an actual iPad: open dashboard URL in Safari, "Add to Home Screen", launch from home screen, verify standalone mode and offline load

### 2.3 Offline Mode for Field Visits ✅ COMPLETE (2026-05-13)
- [x] `npm install dexie`
- [x] Create `src/lib/db.js` — `lslpOfflineDB` with `pendingVisits` table
- [x] Update `NewVisit.jsx` — offline path saves to IndexedDB, shows "Saved Locally" screen
- [x] Create `src/lib/sync.js` — `online` listener drains pending visits; `getPendingCount()` exported
- [x] Add real-time sync indicator to Navbar — event-driven (no polling); orange pending / green success 3 s / red fail + Retry button
- [x] Fix: offline "Saved Locally" navigates to `/` instead of property detail (which requires API)
- [x] Fix: CORS preflight 400 — added `http://127.0.0.1:5173` to `allow_origins` in `main.py`
- [x] Fix: 403 on all endpoints — Firebase JWT UID field is `sub` not `uid` in `auth.py`
- [ ] Test on device: turn off WiFi, log a visit, reconnect, verify sync fires and badge clears

### 2.4 PWA-Specific Field Form ✅ COMPLETE (2026-05-20)
- [x] Build `src/pages/FieldApp/FieldVisitForm.jsx` — 2-step form: property search + visit logging
- [x] Camera capture via `<input type="file" accept="image/*" capture="environment">` (up to 3 photos)
- [x] GPS via `navigator.geolocation` — stored as `{ lat, lng }` JSONB; silent fail if denied
- [x] Property search autocomplete — 300 ms debounce, dropdown, confirmation card
- [x] Tap buttons for Access Granted and Verification Outcome (color-coded outcomes)
- [x] Add `gps_coordinates JSONB` to Visit model + schema + POST endpoint
- [x] Add route `/field` in `App.jsx` outside `<RequireAuth>` (auth for field crew is Phase 2.5+)
- [x] Add "📱 Field App" button to Navbar
- [ ] Run `ALTER TABLE visits ADD COLUMN gps_coordinates JSONB;` in pgAdmin
- [ ] Test on iPad: search property, log visit with photo + GPS, test offline flow

### 2.5 Customer Portal ✅ COMPLETE (2026-05-22)
- [x] `src/pages/Portal/SubmitForm.jsx` — 3-step public form (property search, contact info, photos)
- [x] `/submit` route in `App.jsx` — fully public, no Navbar, no RequireAuth
- [x] `app/api/submissions.py` — POST + GET + PATCH endpoints
- [x] `app/models/submission.py` + `app/schemas/submission.py`
- [x] `GET /api/submissions/property-search` — portal-key-gated property lookup (address only)
- [x] `PORTAL_API_KEY=lslp-portal-2026` — add to `backend/.env`; key checked via `X-Portal-API-Key` header

### 2.6 Customer Submission Review Queue ✅ COMPLETE (2026-08-14)
- [x] Build `src/pages/Dashboard/SubmissionsQueue.jsx` — filter tabs (Pending/Approved/Rejected) with counts, pagination
- [x] Build `src/pages/Dashboard/SubmissionDetail.jsx` — photo lightbox, customer info vs. property record, approve/reject dialogs
- [x] Backend: `GET /api/submissions/counts` — badge counts for queue tabs and Navbar
- [x] Backend: extended `PATCH /api/submissions/{id}/review` — accepts `verified_material`; on approval, updates property `verified_status` and writes `audit_log` entry
- [x] Backend: `app/models/audit_log.py` — SQLAlchemy model for the `audit_log` table
- [x] Backend: added `address` to `SubmissionResponse` (joined from properties)
- [x] Frontend: Navbar "Submissions" item with amber pending count badge
- [x] Frontend: sonner toast notifications on approve/reject actions
- [x] Approval flow: reviewer selects material (Lead/Copper/Galvanized/Unknown) → property `verified_status` updated → `audit_log` entry created
- [x] Rejection flow: optional reason stored in submission notes → property record untouched

### 2.7 Field Crew Authentication & Visit Attribution ✅ COMPLETE (2026-08-14)
- [x] Added `initials VARCHAR(5)` to `users` table and SQLAlchemy model
- [x] Added `created_by_uid VARCHAR(128)` to `visits` table and SQLAlchemy model
- [x] `POST /api/visits/` captures authenticated user — sets `initials` and `created_by_uid` from profile, ignores client values
- [x] `VisitResponse` extended with `created_by_uid` and `created_by_email` (joined from users; null for historical visits)
- [x] `/field` route moved inside `<RequireAuth>` — field crew must log in
- [x] Firebase persistence confirmed as `browserLocalPersistence` (default in web SDK v9+)
- [x] Initials text input replaced with read-only user identity card (initials + email)
- [x] PropertyDetail visits table shows submitting email beneath initials for attributed visits
- [x] `docs/ADDING_USERS.md` — procedure for provisioning field crew accounts
- [x] Updated `CLAUDE.md` — visit attribution rules, server-enforced fields, schema updates

### 2.8 Phase 2 Wrap-Up
- [ ] Run a full end-to-end test: customer submits → office reviews → field crew visits → all data persists
- [ ] Commit Phase 2 to git

---

## Phase 3 — Automation & Integrations (~5 weeks)

**Goal:** The system runs itself. Springbrook gets updated nightly, Brightly work orders auto-create, ArcGIS keeps getting clean data, and stakeholders have dashboards.

### 3.1 APScheduler Setup (2 days)
- [ ] Add APScheduler to `requirements.txt`
- [ ] Initialize scheduler in FastAPI startup event (`main.py`)
- [ ] Create `app/tasks/` folder
- [ ] First job: log a heartbeat every hour to confirm scheduler is running

### 3.2 Springbrook Nightly Export (1 week)
- [ ] Create `app/tasks/sync_springbrook.py`
- [ ] Job runs nightly at 2 AM
- [ ] Query: all properties where `springbrook_synced_at IS NULL` OR `updated_at > springbrook_synced_at`
- [ ] Generate CSV in Springbrook's required format
- [ ] Save to `uploads/exports/{date}/springbrook_sync.csv` (and later, to Firebase Storage)
- [ ] If Springbrook API exists: POST directly. Otherwise: leave the CSV in a network drop folder.
- [ ] Update `springbrook_synced_at` on every synced record
- [ ] Add a manual trigger endpoint: `POST /api/export/springbrook` (admin only)
- [ ] **First step: confirm with the program manager exactly what CSV format Springbrook accepts**

### 3.3 Brightly Auto Work Orders (1 week)
- [ ] Create `app/services/brightly.py` with `create_work_order(visit)` function
- [ ] After every successful `POST /api/visits/`, if `access_granted == "Yes"` and `verification_outcome != "Inaccessible"`, call `create_work_order`
- [ ] Wrap in try/except — never let a Brightly API failure block the visit save
- [ ] On Brightly failure: log to `audit_log` with `needs_manual_wo` flag
- [ ] Store returned `work_order_id` on the visit record
- [ ] Build a dashboard filter to surface visits with `needs_manual_wo` flagged
- [ ] **First step: get Brightly API credentials and docs**

### 3.4 ArcGIS Export Endpoint (3 days)
- [ ] Create `app/api/export.py` with `GET /api/v1/export/arcgis`
- [ ] Returns JSON: `account_number`, `address`, `verified_status`, `verified_at`, latitude/longitude (if available)
- [ ] **Versioned** — `/v1/` in the path. Never change the response shape without bumping to `/v2/`
- [ ] Add authentication: ArcGIS pipeline gets a dedicated API key (separate from portal key)
- [ ] Hand the endpoint URL + key to whoever maintains the existing ArcGIS integration

### 3.5 Audit Log Triggers (3 days)
- [ ] Write a PostgreSQL trigger function `log_changes()`
- [ ] Apply trigger `AFTER UPDATE` on `properties`, `visits`, `customer_submissions`
- [ ] Capture old vs new values for changed fields
- [ ] Test: change a property's `verified_status`, verify an `audit_log` row appears
- [ ] Build a simple `GET /api/audit/{table}/{record_id}` endpoint for spot-checks

### 3.6 Metabase Setup (3 days)
- [ ] Install Metabase locally (Docker is the simplest path)
- [ ] Create a read-only PostgreSQL user for Metabase
- [ ] Connect Metabase to the `lslp` database
- [ ] Build the 4 core dashboards:
  - **Classification Progress** — % of properties classified, by zone
  - **Outreach Completion Rate** — % of properties with 4 qualifying attempts
  - **Team Activity** — visits per week by initials
  - **Compliance Timeline** — projected completion based on current pace
- [ ] Enable public dashboard sharing for stakeholders
- [ ] Document the dashboard URLs in a new `DASHBOARDS.md` file

### 3.7 Phase 3 Wrap-Up
- [ ] Update `PROGRESS.md`
- [ ] Run a full end-to-end test: a visit is logged → Brightly WO is created → next morning Springbrook gets the update → ArcGIS pulls fresh data → Metabase reflects the new visit
- [ ] Commit Phase 3 to git

---

## UI Redesign Pass (1 week — scheduled between Phase 2 and Phase 3)

The current UI is functional but generic. Hamza has explicitly flagged that this is a **municipal-level project** and needs to look professional.

- [ ] Establish a design system: color palette, typography scale, spacing tokens, border radii, shadow scale
- [ ] Refactor the Navbar — proper branding, role-aware menu
- [ ] Refactor `PropertiesList` — better table design, pagination, sort, advanced filters
- [ ] Refactor `PropertyDetail` — proper page layout, breadcrumbs, action menu
- [ ] Refactor forms — consistent input styling, error states, success states
- [ ] Add an empty state for every list view
- [ ] Add a 404 page
- [ ] Test on iPad — the dashboard should look as good there as on desktop

This pass uses the **frontend-design** skill — load it at the start of the session.

---

## Phase 4 — ML Image Classifier (~5 weeks, OPTIONAL)

**Goal:** Photos from visits and customer submissions are automatically classified as Lead / Copper / Galvanized with a confidence score. Office staff use it as an assist, never a replacement for human judgment.

Do not start Phase 4 until Phases 1-3 are stable in production for at least 30 days.

- [ ] Export labeled training data from `visits` where `verification_outcome` is one of Lead, Copper, Galvanized
- [ ] Train a MobileNetV2 or EfficientNet-B0 classifier (transfer learning, Python, Google Colab free GPU)
- [ ] Target: >85% confidence threshold for production use
- [ ] Save the trained model to `backend/app/ml/`
- [ ] Add `POST /api/ml/classify` endpoint to FastAPI — accepts image, returns class probabilities
- [ ] Display ML confidence in the customer submission review queue as a soft hint
- [ ] Store ML predictions alongside visits but never overwrite a human classification

---

## Deployment (Phase 3 prerequisite)

When ready to move off `localhost`:

- [ ] Sign up for Railway or Render
- [ ] Provision PostgreSQL on the same platform
- [ ] Set environment variables from `.env`
- [ ] Deploy backend with a Dockerfile (or platform-native Python buildpack)
- [ ] Deploy frontend as a static site
- [ ] Configure CORS for the production frontend domain
- [ ] Set up automatic deploys from `main` branch (after git is initialized)
- [ ] Update DNS to point a custom domain at the deployment

---

## Out of Scope (don't propose these)

- React Native or any native mobile app
- Microservices / service mesh / Kubernetes
- A separate worker service (we use APScheduler inside the API)
- Redis or any caching layer (PostgreSQL is fast enough at our scale)
- GraphQL (REST is sufficient and easier to debug)
- Switching out PostgreSQL for anything else
- Switching out FastAPI for anything else
- Rebuilding the database from scratch

---

## Reference

- `CLAUDE.md` — how Claude Code should work on this project
- `PROGRESS.md` — what's currently built
- This file — what's next
