-- ============================================================================
-- CHECK CONSTRAINTS — Run AFTER all normalization from normalize_data.sql
-- ============================================================================
-- These constraints enforce the canonical value sets defined in
-- backend/app/services/classification.py (VALID_MATERIALS,
-- VALID_VERIFIED_STATUSES, VALID_VERIFICATION_METHODS).
--
-- Each ALTER TABLE will FAIL if any existing row violates the constraint.
-- That failure is the useful outcome — it means normalization missed a value.
-- Do not run these until all UPDATE statements have been confirmed.


-- ── verified_status ────────────────────────────────────────────────────
-- Source: VALID_VERIFIED_STATUSES in classification.py
-- 5 canonical values. NULL not expected but allowed by schema.
ALTER TABLE properties
ADD CONSTRAINT chk_verified_status
CHECK (verified_status IN (
    'Pending', 'Verified-Lead', 'Verified-Copper',
    'Verified-Galvanized', 'Unknown'
));


-- ── hs_service (house / private side material) ────────────────────────
-- Source: VALID_MATERIALS in classification.py
-- 8 canonical values + NULL allowed.
ALTER TABLE properties
ADD CONSTRAINT chk_hs_service
CHECK (hs_service IS NULL OR hs_service IN (
    'Lead', 'Copper', 'Galvanized', 'Cast Iron', 'Iron',
    'Brass', 'Plastic', 'Unknown'
));


-- ── ss_service (street / public side material) ────────────────────────
-- Same canonical set as hs_service.
ALTER TABLE properties
ADD CONSTRAINT chk_ss_service
CHECK (ss_service IS NULL OR ss_service IN (
    'Lead', 'Copper', 'Galvanized', 'Cast Iron', 'Iron',
    'Brass', 'Plastic', 'Unknown'
));


-- ── hs_verification_method ────────────────────────────────────────────
-- Source: VALID_VERIFICATION_METHODS in classification.py
-- 11 canonical values + NULL allowed.
-- NOTE: Field Verification and Field Inspection are BOTH canonical.
-- The department should confirm whether these are distinct methods or
-- the same method recorded two ways. Collapsing a real distinction is
-- harder to undo than leaving a possible duplicate.
ALTER TABLE properties
ADD CONSTRAINT chk_hs_verification_method
CHECK (hs_verification_method IS NULL OR hs_verification_method IN (
    'Customer ID with Photo or Other Verification',
    'Customer Identification',
    'Customer Identification with Photo or Other Verification',
    'Excavation', 'Field Inspection', 'Field Verification',
    'Not Verified', 'Onsite Verification',
    'Other', 'Pending Import', 'Records'
));


-- ── ss_verification_method ────────────────────────────────────────────
-- Same canonical set.
ALTER TABLE properties
ADD CONSTRAINT chk_ss_verification_method
CHECK (ss_verification_method IS NULL OR ss_verification_method IN (
    'Customer ID with Photo or Other Verification',
    'Customer Identification',
    'Customer Identification with Photo or Other Verification',
    'Excavation', 'Field Inspection', 'Field Verification',
    'Not Verified', 'Onsite Verification',
    'Other', 'Pending Import', 'Records'
));


-- ── ub_mapped_private_method ──────────────────────────────────────────
-- Same canonical set.
ALTER TABLE properties
ADD CONSTRAINT chk_ub_mapped_private_method
CHECK (ub_mapped_private_method IS NULL OR ub_mapped_private_method IN (
    'Customer ID with Photo or Other Verification',
    'Customer Identification',
    'Customer Identification with Photo or Other Verification',
    'Excavation', 'Field Inspection', 'Field Verification',
    'Not Verified', 'Onsite Verification',
    'Other', 'Pending Import', 'Records'
));


-- ── ub_mapped_public_method ───────────────────────────────────────────
-- Same canonical set.
ALTER TABLE properties
ADD CONSTRAINT chk_ub_mapped_public_method
CHECK (ub_mapped_public_method IS NULL OR ub_mapped_public_method IN (
    'Customer ID with Photo or Other Verification',
    'Customer Identification',
    'Customer Identification with Photo or Other Verification',
    'Excavation', 'Field Inspection', 'Field Verification',
    'Not Verified', 'Onsite Verification',
    'Other', 'Pending Import', 'Records'
));
