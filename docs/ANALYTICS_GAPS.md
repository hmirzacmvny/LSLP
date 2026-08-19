# Analytics Gaps — Deferred Metrics

Metrics requested by the water department that cannot be built today because the underlying data does not exist. This document specifies what would need to exist for each, so whoever implements them later has a clear starting point.

> **Resolved:** Property priority classification (formerly §2) is now implemented — see `classification.py` and `docs/DEPARTMENT_DECISIONS.md` §8. The verification metric (formerly §4) has been reframed per department decision — see `docs/DEPARTMENT_DECISIONS.md` §1.

---

## 1. Replacement Tracking

The department asked for: lines replaced by public side, private side, and full service line, plus replacement progress over time.

### Why this is a new data structure, not a new status

A replacement is a distinct event from a verification. A property can be verified as Lead in January and replaced in June, and both facts must coexist in the record. If replacement were modeled as another `verified_status` value (e.g., "Replaced"), it would destroy the ability to answer the department's central operational question: **how many verified lead lines are still awaiting replacement?**

That question requires two independent facts per property: what is the material (verification), and has it been replaced (replacement). Collapsing them into a single column makes the question unanswerable without reconstructing history from the audit log.

### Recommended data model

A `replacements` table linked by `account_number`:

| Column | Type | Purpose |
|---|---|---|
| `id` | serial PK | |
| `account_number` | FK → properties | Which property |
| `side` | varchar | `public`, `private`, or `full` (full = both sides in one job) |
| `replaced_at` | timestamptz | When the replacement was completed |
| `work_order_id` | varchar | Brightly work order number, if sourced from Brightly |
| `source` | varchar | `brightly`, `manual`, etc. |
| `notes` | text | |
| `created_at` | timestamptz | Record creation |
| `created_by_uid` | varchar(128) | Who entered it |

A property can have multiple replacement records (public side replaced in June, private side in August). A full-service-line replacement is a single record with `side = 'full'`.

### Where the data should come from

Brightly holds work orders and is the probable source of truth for replacements. Replacement records should most likely flow from work order completion events rather than manual entry, connecting to the Brightly integration already planned for Phase 3.3. When a Brightly work order for a lead service line replacement is marked complete, the system should create a replacement record automatically.

A manual entry path should exist as a fallback for replacements that predate the integration or that happen outside Brightly's workflow, but it should not be the primary source.

### Charts this enables

Once replacement data exists:
- **Lines replaced by side**: bar chart grouped by `side` (public, private, full)
- **Replacement progress over time**: monthly series from `replaced_at`, filterable by side
- **Verified lead lines awaiting replacement**: properties where `verified_status` indicates Lead AND no replacement record exists — this is the operational headline number

---

## 2. Inbound Springbrook Reconciliation

The analytics page and overview dashboard both consume a one-time August 2026 snapshot of Springbrook data. There is no mechanism to pull Springbrook's current state, so every material classification, new connection, and address correction happening in Springbrook since that snapshot is invisible to this system. The local data diverges further every day.

### Why this is not just the reverse of the outbound export

Phase 3.2 plans a nightly outbound export: pushing locally-changed data to Springbrook. The inbound direction is harder because it requires a conflict policy. When a fresh Springbrook export says a property is Copper but this system's field crew verified it as Lead through excavation, the system must decide which value wins — and the wrong decision silently overwrites an auditable field verification.

### What blocks it

The conflict policy is a compliance decision, not a technical one. The plausible default is that physical verification outranks records regardless of date, but the water department must confirm this. Open questions documented in `ROADMAP.md` under Phase 3.2b: whether Springbrook has an API, export frequency, format stability, and precedence rules.

### Impact on analytics

Until reconciliation exists, material distribution and pairings matrix reflect the August snapshot only. Properties connected or reclassified in Springbrook since then are missing or stale. The total count (10,475) may no longer match Springbrook's live count.

---

## Implementation notes

- Replacement tracking should not block the analytics page. The page is useful today with the data it has.
- The replacement table should be created as part of Phase 3.3 (Brightly integration), not as a standalone migration.
- The replacement placeholder card on the analytics page references this document. Remove it when the feature ships.
