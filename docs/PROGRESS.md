# PROGRESS.md

Snapshot of what's built, file by file, as of the handoff to Claude Code.

---

## Overall Status

```
Phase 1 — Foundation              ✅ COMPLETE
Phase 2 — PWA + Customer Portal   🔨 IN PROGRESS (Dashboard done, PWA next)
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
| `users` | 0 | Phase 2 — Firebase Auth | ✅ Schema ready |
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
- **Alembic: NOT YET SET UP.** Schema was created via a one-shot SQL file (`lslp_schema.sql`) before Alembic was needed.
- **Next step on schema changes:** initialize Alembic before any further schema modifications.

---

## Backend — `C:\lslp\backend\`

### Top-level files
| File | Purpose | Status |
|---|---|---|
| `main.py` | FastAPI app, CORS, router registration | ✅ Complete |
| `.env` | DB creds + Firebase keys | ✅ Created (NOT committed) |
| `import_data.py` | One-time CSV → PostgreSQL import script | ✅ Executed successfully |
| `requirements.txt` | Python dependencies | ✅ Generated via `pip freeze` |
| `lslp_schema.sql` | Initial table creation SQL | ✅ Executed once via pgAdmin |

### Installed packages
```
fastapi, uvicorn, sqlalchemy, alembic, python-multipart,
psycopg2-binary, pandas, python-dotenv, numpy
```

### `app/database.py`
SQLAlchemy engine, `SessionLocal`, `Base`, `get_db()` dependency. ✅ Complete.

### `app/models/` — SQLAlchemy table definitions
| File | Class | Status | Notes |
|---|---|---|---|
| `property.py` | `Property` | ✅ Complete | Maps to `properties` table |
| `visit.py` | `Visit` | ✅ Complete | `access_granted` is `String` not `Boolean` |
| `outreach.py` | `OutreachLog` | ✅ Complete | Imported as `Outreach` in API via alias |

### `app/schemas/` — Pydantic schemas
| File | Schemas | Status | Notes |
|---|---|---|---|
| `property.py` | `PropertyBase`, `PropertyUpdate`, `PropertyResponse` | ✅ Complete | |
| `visit.py` | `VisitBase`, `VisitCreate`, `VisitResponse` | ✅ Complete | `model_config = {"from_attributes": True}` on `VisitBase` |
| `outreach.py` | `OutreachCreate`, `OutreachResponse` | ✅ Complete | `attempt_number` removed from `OutreachCreate` — calculated server-side |

### `app/api/` — Route handlers
| File | Endpoints | Status |
|---|---|---|
| `properties.py` | `GET /` (with `search`, `verified_status`, `address` filters), `GET /{id}`, `PATCH /{id}` | ✅ Complete |
| `visits.py` | `GET /` (filterable by `account_number`), `GET /{id}`, `POST /` (multipart with photo upload) | ✅ Complete |
| `outreach.py` | `GET /` (filterable), `GET /{id}`, `POST /` (auto-calculates `attempt_number`) | ✅ Complete |

### `app/services/`
| File | Purpose | Status |
|---|---|---|
| `storage.py` | Local file storage for photos (`save_photo`, `delete_photo`) — saves to `C:\lslp\backend\uploads\` | ✅ Complete |

### Bugs fixed during Phase 1 (don't reintroduce these)
1. **`access_granted` type mismatch** — was `Boolean`, but real data contains values like "No Answer" and "Scheduled". Changed column type to `String` in both model and Pydantic schema.
2. **`initials` null Pydantic validation** — moved `model_config = {"from_attributes": True}` from `VisitResponse` up to `VisitBase`.
3. **`attempt_number` "multiple values" TypeError** — `attempt_number` was in `OutreachBase`, which got unpacked along with the server-calculated value. Fixed by removing it from `OutreachCreate`.
4. **`OutreachLog` vs `Outreach` import error** — model class is `OutreachLog`; API uses `from app.models.outreach import OutreachLog as Outreach`.

---

## Frontend — `C:\lslp\frontend\`

### Stack
React 18 + Vite + Tailwind v4 (via `@tailwindcss/postcss`) + React Router DOM + Axios.

### Installed packages
```
axios, react-router-dom, @tanstack/react-query,
tailwindcss, @tailwindcss/postcss, autoprefixer, postcss
```

### Top-level
| File | Purpose | Status |
|---|---|---|
| `vite.config.js` | Vite config with React plugin | ✅ Default |
| `postcss.config.js` | Configures `@tailwindcss/postcss` and `autoprefixer` | ✅ Complete |
| `src/index.css` | Single line: `@import "tailwindcss";` | ✅ Complete |
| `src/main.jsx` | React root render | ✅ Default |
| `src/App.jsx` | Router setup, Navbar, routes for all 4 dashboard pages | ✅ Complete |

### `src/lib/`
| File | Purpose | Status |
|---|---|---|
| `api.js` | Axios instance + endpoint wrappers: `getProperties`, `getProperty`, `updateProperty`, `getVisits`, `getVisit`, `createVisit`, `getOutreach`, `createOutreach` | ✅ Complete |

### `src/components/`
| File | Purpose | Status |
|---|---|---|
| `Navbar.jsx` | Top navigation with logo, Properties / Log Visit / Log Outreach buttons | ✅ Complete |

### `src/pages/Dashboard/`
| File | Purpose | Status |
|---|---|---|
| `PropertiesList.jsx` | Search by address or account number, table of results, click row to navigate to detail | ✅ Complete |
| `PropertyDetail.jsx` | Property header, 4 service-line cards, Visits tab, Outreach tab, quick action buttons | ✅ Complete |
| `NewVisit.jsx` | Form to log a field visit. Pre-fills `account_number` if navigated from a property page. Supports photo upload. | ✅ Complete |
| `NewOutreach.jsx` | Form to log an outreach attempt. Pre-fills `account_number` if navigated from a property page. Toggleable customer-initiated section. | ✅ Complete |

### `src/pages/FieldApp/`
Empty — Phase 2 PWA work has not started.

### `src/pages/Portal/`
Empty — Phase 2 customer portal work has not started.

---

## External Services Configured

| Service | Status | Notes |
|---|---|---|
| **Firebase project** | ✅ Created (`lslp-platform`) | Web app registered, config keys in `.env` |
| **Firebase Auth** | ✅ Enabled | Email/password provider on, free tier |
| **Firebase Storage** | ❌ Not available | Requires paid plan — using local storage interim |
| **API key rotation** | ✅ Done | Original key was exposed in chat; rotated and replaced |

---

## Working Features — User-Facing Capabilities

A staff user can today, from the web dashboard:

1. Search the full 10,475-property list by address or account number
2. Click into any property and see its full classification, history of visits, and history of outreach
3. Log a new field visit (with optional photos uploaded to local storage)
4. Log a new outreach attempt (with automatic attempt-number sequencing)
5. From a property page, click **Log Visit** or **Log Outreach** and have the account number pre-filled

Photos uploaded during a visit are saved to:
```
C:\lslp\backend\uploads\field\<account_number>\<uuid>.jpg
```
and the path is stored in the `visits.photo_urls` JSONB column.

---

## Known Gaps (intentional — not bugs)

These are not broken — they just haven't been built yet:

- 🔲 **No authentication.** The API is wide open on localhost. Firebase Auth integration is Phase 2.
- 🔲 **No PWA manifest or Service Worker.** The dashboard works in a browser but isn't installable on iPad yet.
- 🔲 **No offline mode.** Field visits can't be saved without network. Dexie.js + IndexedDB is the Phase 2 fix.
- 🔲 **No customer portal.** Phase 2 will add `pages/Portal/`.
- 🔲 **No audit log triggers.** The `audit_log` table exists but nothing writes to it yet.
- 🔲 **No Springbrook sync, no Brightly auto-WO, no ArcGIS export endpoint.** All Phase 3.
- 🔲 **No Metabase.** Phase 3.
- 🔲 **No Alembic migrations.** Schema was bootstrapped via raw SQL. Initialize Alembic before any schema change.
- 🔲 **No tests.** Pytest setup is a Phase 3 nice-to-have, not blocking.

---

## Git Status

- ⚠️ **Git not yet initialized in this project.** Recommended first action under Claude Code: `git init`, add `.gitignore` for `venv/`, `node_modules/`, `.env`, `uploads/`, commit baseline.
