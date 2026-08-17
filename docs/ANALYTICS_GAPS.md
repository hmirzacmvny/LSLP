# Analytics Gaps — Deferred Metrics

Three metrics requested by the water department cannot be built today because the underlying data does not exist anywhere in the system or outside it. This document specifies what would need to exist for each, so whoever implements them later has a clear starting point.

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

## 2. Property Priority

The department asked for a priority filter on analytics.

Priority needs a definition before it can be implemented. Whether a property is "priority" could derive from:
- **Material classification**: all verified-Lead properties are priority
- **Property type**: multi-family or commercial properties serving more people
- **Proximity to sensitive locations**: schools, childcare facilities, hospitals
- **Age of construction**: pre-1986 buildings more likely to have lead
- **Combination**: a scoring model weighting several factors

The department should decide which definition they want. Once defined, priority can be stored as a column on `properties` (either a boolean `is_priority` or a numeric `priority_score`) and used as a filter across all analytics datasets.

If priority derives purely from existing data (e.g., "all Lead properties are priority"), it can be computed rather than stored. If it requires external data (school proximity, construction year), that data needs to be imported first.

---

## Implementation notes

- Neither replacements nor priority should block the analytics page. The page is useful today with the data it has.
- The replacement table should be created as part of Phase 3.3 (Brightly integration), not as a standalone migration.
- The placeholder cards on the analytics page reference this document. Remove them when the features ship.
