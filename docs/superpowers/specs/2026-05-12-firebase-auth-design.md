# Firebase Auth Integration — Design Spec
**Date:** 2026-05-12
**Phase:** 2.1
**Status:** Approved

---

## Overview

Add authentication and role-based access control to the LSLP platform. Firebase Auth handles identity (email/password). The backend validates JWTs on every protected request and enforces roles using the `users` table. Customer-facing routes remain open.

---

## Architecture

1. Unauthenticated user hits any dashboard route → redirected to `/login`
2. User signs in with email/password → Firebase SDK returns a JWT (ID token)
3. Frontend attaches the token as `Authorization: Bearer <token>` on every API call
4. Backend decodes the JWT via `firebase-admin`, looks up `firebase_uid` in `users` table, attaches the user object (including role) to the request
5. Endpoint-level role check passes or returns `403 Forbidden`
6. Token refresh is automatic — `api.js` calls `getIdToken()` (not a cached string) before every request so tokens are always fresh

Customer portal routes (`/submit`, Phase 2.5) stay outside `<RequireAuth>` on the frontend and use a separate API key on the backend — untouched by this work.

---

## Frontend

### `src/lib/firebase.js` (new)
- Initializes the Firebase app from `VITE_*` env vars (`import.meta.env.VITE_FIREBASE_*`)
- Exports `auth` (Firebase Auth instance)
- Nothing else lives here

### `src/pages/Login.jsx` (new)
- Email/password sign-in form
- On submit: calls `signInWithEmailAndPassword(auth, email, password)`
- On success: navigates to `/` or back to `location.state.from` if the user was redirected
- On failure: shows inline error message
- No registration form — accounts are created manually by admin

### `src/components/RequireAuth.jsx` (new)
- Uses `onAuthStateChanged` to track auth state
- While Firebase is initializing: renders a loading state (prevents flash-redirect to `/login`)
- Authenticated: renders children
- Unauthenticated: `<Navigate to="/login" state={{ from: location }} />`

### `src/lib/api.js` (modified)
- Axios request interceptor added to the existing instance
- Before every request: calls `auth.currentUser.getIdToken()` and injects result as `Authorization: Bearer <token>`
- No changes to individual endpoint wrapper functions

### `src/App.jsx` (modified)
- All current Dashboard routes wrapped in `<RequireAuth>`
- `/login` route stays outside `<RequireAuth>`
- `/submit` (Phase 2.5) will also be outside `<RequireAuth>` when built

---

## Backend

### `app/services/auth.py` (new)
Two exports:

**`verify_firebase_token` — FastAPI dependency**
- Reads `Authorization: Bearer <token>` header
- Decodes token via `firebase_admin.auth.verify_id_token()`
- Queries `users` table for matching `firebase_uid` where `is_active = True`
- Returns the user row (includes `role`)
- Raises `401` if token is missing, expired, or invalid
- Raises `403` if `firebase_uid` not found in `users` or `is_active = False`

**`require_role(allowed_roles: list[str])` — dependency factory**
- Returns a FastAPI dependency
- Calls `verify_firebase_token` internally
- Raises `403` if `current_user.role` is not in `allowed_roles`
- Usage: `dependencies=[Depends(require_role(["office_staff", "supervisor", "admin"]))]`

**Firebase Admin SDK initialization**
- Initialized on module import using credentials from `.env`
- Credentials: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`

### Role Matrix

| Endpoint | Minimum role required |
|---|---|
| `GET /api/properties/` | any authenticated |
| `GET /api/properties/{id}` | any authenticated |
| `PATCH /api/properties/{id}` | `office_staff`, `supervisor`, `admin` |
| `GET /api/visits/` | any authenticated |
| `GET /api/visits/{id}` | any authenticated |
| `POST /api/visits/` | any authenticated |
| `GET /api/outreach/` | any authenticated |
| `GET /api/outreach/{id}` | any authenticated |
| `POST /api/outreach/` | `office_staff`, `supervisor`, `admin` |

Roles in order of privilege: `field_crew` < `office_staff` < `supervisor` < `admin`.

### Existing route files modified
- `app/api/properties.py` — add `verify_firebase_token` to GET endpoints, `require_role` to PATCH
- `app/api/visits.py` — add `verify_firebase_token` to all endpoints
- `app/api/outreach.py` — add `verify_firebase_token` to GET endpoints, `require_role` to POST

---

## User Seeding

Two-step manual process per user:

**Step 1 — Firebase Console**
Authentication → Users → Add user (email + password). Copy the assigned `uid`.

**Step 2 — PostgreSQL**
```sql
INSERT INTO users (firebase_uid, name, email, role)
VALUES ('paste-uid-here', 'Name', 'email@domain.com', 'role');
```

**Initial accounts:**
- Admin: Hamza Mirza
- 1–2 office staff
- 1–2 field crew

No self-registration. A valid Firebase account with no matching `users` row gets `403` — controlled access by design.

---

## Dependencies

**Frontend (npm):**
- `firebase` — Firebase JS SDK (Auth)

**Backend (pip):**
- `firebase-admin` — Firebase Admin SDK (JWT verification)

---

## Out of Scope

- Admin UI for user management (Phase 3+)
- Role-based UI differences (e.g., hiding buttons for field_crew) — Phase 3
- Customer portal auth (separate API key, Phase 2.5)
- Password reset flow — Firebase Console handles this for now
