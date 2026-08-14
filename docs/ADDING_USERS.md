# Adding Field Crew Users

Field crew accounts require entries in two systems: Firebase Auth (for login) and the PostgreSQL `users` table (for role and profile data).

---

## Step 1 — Create the Firebase Auth account

1. Open the [Firebase Console](https://console.firebase.google.com/) and navigate to your project.
2. Go to **Authentication > Users**.
3. Click **Add user**.
4. Enter their **email** and a **temporary password** (they can reset it later).
5. Click **Add user**.
6. Copy the **User UID** from the user list — you'll need it for Step 2.

## Step 2 — Insert the user row in PostgreSQL

Open pgAdmin, connect to the `lslp` database, and run:

```sql
INSERT INTO users (firebase_uid, name, email, initials, role)
VALUES (
    '<firebase-uid-from-step-1>',
    'First Last',
    'their.email@example.com',
    'FL',
    'field_crew'
);
```

Replace the placeholder values. `initials` should be 1-5 characters (typically 2-3 letters).

### Available roles

| Role | Access |
|---|---|
| `field_crew` | Field visit form only |
| `office_staff` | Dashboard, submissions queue, all forms |
| `supervisor` | Same as office_staff |
| `admin` | Everything |

## Step 3 — Verify

1. Have the user sign in at the login page with their email and temporary password.
2. They should be redirected to `/field` (or whichever page they navigate to).
3. Have them submit a test visit and confirm the `created_by_uid` is populated in the database.

## Removing a user

To deactivate without deleting:

```sql
UPDATE users SET is_active = false WHERE email = 'their.email@example.com';
```

The user will get a 403 on their next API call. Optionally disable them in Firebase Console as well.
