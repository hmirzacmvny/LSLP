-- ============================================================================
-- DATA NORMALIZATION — Run in pgAdmin, in this order
-- ============================================================================
-- Canonical form is Title Case throughout.
-- Iron ≠ Cast Iron — different materials; both are canonical.
-- Field Verification ≠ Field Inspection — may be distinct department methods;
--   both kept as canonical until the department confirms otherwise.
-- "string" across 5 columns is test data from property 006606-000
--   (81 BEECHWOOD AV). Nulled in method columns, set to Pending in status.
--
-- Each statement shows expected row count for sanity-check.
-- Run the verification queries at the end to confirm zero non-canonical
-- values remain.
--
-- Estimated rows affected:
--   properties: ~434 + ss_previously_lead variants (see section 4)
--   outreach_log: 1


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. MATERIAL COLUMNS                                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── hs_service (house / private side) ───────────────────────────────────

-- 232 rows (230 'copper' + 2 'COPPER')
UPDATE properties SET hs_service = 'Copper'
WHERE LOWER(hs_service) = 'copper' AND hs_service != 'Copper';

-- 63 rows (62 'lead' + 1 'LEAD')
UPDATE properties SET hs_service = 'Lead'
WHERE LOWER(hs_service) = 'lead' AND hs_service != 'Lead';

-- 17 rows (9 'cast iron' + 8 'Cast iron')
UPDATE properties SET hs_service = 'Cast Iron'
WHERE LOWER(hs_service) = 'cast iron' AND hs_service != 'Cast Iron';

-- 14 rows
UPDATE properties SET hs_service = 'Unknown'
WHERE LOWER(hs_service) = 'unknown' AND hs_service != 'Unknown';

-- 4 rows
UPDATE properties SET hs_service = 'Brass'
WHERE LOWER(hs_service) = 'brass' AND hs_service != 'Brass';


-- ── ss_service (street / public side) ───────────────────────────────────

-- 28 rows
UPDATE properties SET ss_service = 'Unknown'
WHERE LOWER(ss_service) = 'unknown' AND ss_service != 'Unknown';

-- 17 rows
UPDATE properties SET ss_service = 'Copper'
WHERE LOWER(ss_service) = 'copper' AND ss_service != 'Copper';

-- 5 rows
UPDATE properties SET ss_service = 'Lead'
WHERE LOWER(ss_service) = 'lead' AND ss_service != 'Lead';

-- 2 rows
UPDATE properties SET ss_service = 'Cast Iron'
WHERE LOWER(ss_service) = 'cast iron' AND ss_service != 'Cast Iron';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. VERIFICATION METHOD COLUMNS                                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── hs_verification_method ─────────────────────────────────────────────

-- 19 rows ('Field inspection')
UPDATE properties SET hs_verification_method = 'Field Inspection'
WHERE LOWER(hs_verification_method) = 'field inspection'
  AND hs_verification_method != 'Field Inspection';

-- 15 rows (13 'Onsite verification' + 2 'onsite verification')
UPDATE properties SET hs_verification_method = 'Onsite Verification'
WHERE LOWER(hs_verification_method) = 'onsite verification'
  AND hs_verification_method != 'Onsite Verification';

-- 8 rows (5 'Customer identification' + 3 'customer identification')
UPDATE properties SET hs_verification_method = 'Customer Identification'
WHERE LOWER(hs_verification_method) = 'customer identification'
  AND hs_verification_method != 'Customer Identification';

-- 1 row ('excavation')
UPDATE properties SET hs_verification_method = 'Excavation'
WHERE LOWER(hs_verification_method) = 'excavation'
  AND hs_verification_method != 'Excavation';

-- 1 row ('Field verification')
UPDATE properties SET hs_verification_method = 'Field Verification'
WHERE LOWER(hs_verification_method) = 'field verification'
  AND hs_verification_method != 'Field Verification';

-- ── ss_verification_method ─────────────────────────────────────────────

-- 1 row ('excavation')
UPDATE properties SET ss_verification_method = 'Excavation'
WHERE LOWER(ss_verification_method) = 'excavation'
  AND ss_verification_method != 'Excavation';

-- ── ub_mapped_public_method ────────────────────────────────────────────

-- 1 row ('excavation')
UPDATE properties SET ub_mapped_public_method = 'Excavation'
WHERE LOWER(ub_mapped_public_method) = 'excavation'
  AND ub_mapped_public_method != 'Excavation';

-- ── ub_mapped_private_method ───────────────────────────────────────────
-- No casing variants found — all values already canonical.


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. STRAY "string" VALUES (test data on property 006606-000)            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- All five columns affected on a single property:
--   account_number: 006606-000
--   address: 81 BEECHWOOD AV
--   hs_service: Unknown, ss_service: Copper

-- 1 row
UPDATE properties SET verified_status = 'Pending'
WHERE verified_status = 'string';

-- 1 row
UPDATE properties SET hs_verification_method = NULL
WHERE hs_verification_method = 'string';

-- 1 row
UPDATE properties SET ss_verification_method = NULL
WHERE ss_verification_method = 'string';

-- 1 row
UPDATE properties SET ub_mapped_private_method = NULL
WHERE ub_mapped_private_method = 'string';

-- 1 row
UPDATE properties SET ub_mapped_public_method = NULL
WHERE ub_mapped_public_method = 'string';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. ss_previously_lead (casing variants)                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Variants found: 'yes', 'Yes', 'YEs' (5,006 total rows).
-- 'Yes' dominates. Exact count of non-canonical variants unknown —
-- the UPDATE is safe regardless; verify the count it reports.

UPDATE properties SET ss_previously_lead = 'Yes'
WHERE LOWER(ss_previously_lead) = 'yes' AND ss_previously_lead != 'Yes';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. OUTREACH METHOD (spacing variant)                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1 row ('In person' → 'In-person' to match the 2,671 dominant form)
UPDATE outreach_log SET method = 'In-person'
WHERE method = 'In person';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  VERIFICATION — run after the updates to confirm                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1. Materials: should show only title-case canonical values, no duplicates.
SELECT 'hs_service' AS col, hs_service AS value, COUNT(*) AS cnt
FROM properties WHERE hs_service IS NOT NULL
GROUP BY hs_service ORDER BY cnt DESC;

SELECT 'ss_service' AS col, ss_service AS value, COUNT(*) AS cnt
FROM properties WHERE ss_service IS NOT NULL
GROUP BY ss_service ORDER BY cnt DESC;

-- 2. Verification methods: should show only canonical values, no 'string'.
SELECT 'hs_verification_method' AS col, hs_verification_method AS value, COUNT(*) AS cnt
FROM properties WHERE hs_verification_method IS NOT NULL
GROUP BY hs_verification_method ORDER BY cnt DESC;

SELECT 'ss_verification_method' AS col, ss_verification_method AS value, COUNT(*) AS cnt
FROM properties WHERE ss_verification_method IS NOT NULL
GROUP BY ss_verification_method ORDER BY cnt DESC;

SELECT 'ub_mapped_private_method' AS col, ub_mapped_private_method AS value, COUNT(*) AS cnt
FROM properties WHERE ub_mapped_private_method IS NOT NULL
GROUP BY ub_mapped_private_method ORDER BY cnt DESC;

SELECT 'ub_mapped_public_method' AS col, ub_mapped_public_method AS value, COUNT(*) AS cnt
FROM properties WHERE ub_mapped_public_method IS NOT NULL
GROUP BY ub_mapped_public_method ORDER BY cnt DESC;

-- 3. No 'string' values anywhere:
SELECT COUNT(*) AS string_rows FROM properties
WHERE 'string' IN (verified_status, hs_verification_method,
    ss_verification_method, ub_mapped_private_method, ub_mapped_public_method);

-- 4. ss_previously_lead: should show only 'Yes' (and possibly 'No' / NULL).
SELECT ss_previously_lead, COUNT(*) FROM properties
WHERE ss_previously_lead IS NOT NULL
GROUP BY ss_previously_lead ORDER BY COUNT(*) DESC;

-- 5. Outreach method: should show no 'In person' (only 'In-person').
SELECT method, COUNT(*) FROM outreach_log
WHERE method IS NOT NULL GROUP BY method ORDER BY COUNT(*) DESC;

-- 6. Pairings matrix cell count: should be 29 (down from 59).
SELECT COUNT(DISTINCT (hs_service, ss_service)) AS distinct_pairs
FROM properties
WHERE hs_service IS NOT NULL AND ss_service IS NOT NULL;
