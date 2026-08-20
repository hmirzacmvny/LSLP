# Department Decisions

Design decisions from the Mount Vernon water department. These are the reference for all implementation work going forward. Each entry records what was decided, its implications for the system, and any open questions that remain.

---

## 1. Verification Definition

**Decision:** A service line is verified once its material is identified on both sides. Records-based classification counts as verified. The verification method (records, field inspection, excavation, customer identification) is a separate attribute tracked alongside the material, not a precondition for verification.

**Implication:** The existing "material on record" count (1,778 properties with identified material on both sides) is the compliance verification figure. The prior UI framing of "Material on Record" vs "Verified by Field Inspection" presented records-based classification as somehow less than verified, which contradicts the department's position. The metric has been reframed: "Inventory Verified" is the headline, and the verification method breakdown is shown separately to indicate how those classifications were established.

**Supersedes:** The earlier two-metric design (material on record vs. field verified) that treated `verified_status` as the primary verification indicator. `verified_status` remains in the schema for future use by this application's own field verification workflow, but it is not the compliance verification measure.

---

## 2. Field Visits and Side Attribution

**Decision:** Field visits currently determine the house side only. Street-side results come from Superintendent John in a monthly report. The department has asked for a street-side verification field on the visit form, anticipating a future where both sides can be verified and replaced in one visit.

**Implication:** The `visits` table currently has a single `verification_outcome` column with no side attribution. To support street-side verification, this needs to become side-aware — likely `hs_verification_outcome` and `ss_verification_outcome`, or a `side` column. This is a schema change with migration requirements.

**Status:** Recorded. Not implemented — requires schema design and migration. See Phase 3 planning.

---

## 3. Field Visit Review Workflow

**Decision:** Today a data entry clerk enters visit data into Springbrook after field crews return. With LSLP, field crews enter data directly via the app. Either the clerk or the department manager reviews and accepts before the record is final.

**Implication:** This is a new approval queue parallel to the customer submission review queue. A submitted visit becomes pending review rather than immediately final. This changes the field app's data flow and requires a `review_status` column on visits, a review endpoint, and a review UI. Visit data should not update property classifications until approved.

**Status:** Recorded. Not implemented — new workflow, new schema, new UI. See Phase 3 planning.

---

## 4. Field Inspection vs Field Verification

**Decision:** These are the same activity. The distinction was a data entry inconsistency in Springbrook, which maps both to Field Inspection.

**Implication:** `Field Verification` (5 rows in `hs_verification_method`) should be merged into `Field Inspection`. This requires:
- UPDATE statement: `SET hs_verification_method = 'Field Inspection' WHERE hs_verification_method = 'Field Verification'`
- Remove `Field Verification` from `VALID_VERIFICATION_METHODS` in `classification.py`
- Update the `chk_hs_verification_method` CHECK constraint
- The import script's `_VERIFICATION_METHOD_CANONICAL` map should map `field verification` → `Field Inspection`

**Status:** Recorded. Not yet applied — the SQL merge and constraint update should be done together in a single maintenance window. Only 5 rows affected.

---

## 5. SS Previously Lead

**Decision:** `ss_previously_lead` records whether a street-side line was formerly lead and later replaced. This history must be retained.

**Classification consequence:** If the house side is galvanized and the street side is now copper but was previously lead, the galvanized section is classified as requiring replacement because it was historically downstream of lead.

**Open question:** This downstream-of-lead rule is not captured by the current priority classification scheme (see Decision 8). The interaction between `ss_previously_lead = 'Yes'` and the priority tiers needs clarifying with the department. Specifically: should a property with hs_service='Galvanized', ss_service='Copper', ss_previously_lead='Yes' be escalated from Priority 6 (Both Non-Lead) to a higher tier? And does this rule apply to any house-side material downstream of former lead, or only galvanized?

**Status:** Recorded. The `ss_previously_lead` column exists and is normalized. The classification rule needs department confirmation before implementation.

---

## 6. SL Category (State Baseline Classification)

**Decision:** SL Category is the state's baseline classification derived from both sides. Examples provided:
- Copper + Unknown = Unknown
- Lead + Copper = Lead
- Lead + Unknown = Lead
- Copper + Copper = Non-Lead

**Open question:** The examples are incomplete. They do not cover galvanized, brass, cast iron, iron, or plastic. The full mapping needs confirming. The underlying logic appears to be: if either side is Lead, the category is Lead; if either side is Unknown, the category is Unknown; otherwise Non-Lead. But this needs verification against the state's actual classification rules.

**Status:** Recorded. Not implemented — the full mapping must be confirmed with the department and cross-referenced against state EPA reporting requirements before it can be computed.

---

## 7. Springbrook Integration

**Decision:** Springbrook remains the system of record because changes are traceable to who entered them and when. The department wants:
- An automated daily import at approximately 4:00 PM
- A manual trigger for on-demand imports
- App entries to flow back to Springbrook to avoid double entry

**Unresolved tension:** Bidirectional sync is requested, but write access to Springbrook is controlled by one person (Dior), who grants field-level access. The outbound direction (LSLP → Springbrook) requires either API access or a format Dior can import. The inbound direction (Springbrook → LSLP) requires the conflict policy documented in `ROADMAP.md` Phase 3.2b. Neither direction can be automated without resolving access and policy questions.

**Status:** Recorded. This must be settled before Phase 3 automation is designed. The questions documented in `ROADMAP.md` Phase 3.2b remain open.

---

## 8. Priority Classification

**Decision:** Priority derives from `hs_service` and `ss_service`:

| Tier | Condition | Label |
|---|---|---|
| 1 | Both Lead | Replace Both Sides - Lead Detected |
| 2 | One Lead, One Non-Lead | Replace One Side - Lead Detected |
| 3 | Lead + Unknown | Investigate - Lead and Unknown |
| 4 | Both Unknown | Verify - Both Unknown |
| 5 | One Unknown, One Non-Lead | Verify - One Unknown and Non-Lead |
| 6 | Both Non-Lead | No Action - Both Non-Lead |

Non-Lead means any identified material that is not Lead: Copper, Brass, Plastic, Cast Iron, Iron, Galvanized. Unknown means Unknown, empty, or null.

**Confirmed:** The tier numbering (1 = most urgent) is confirmed by the department.

**Needs checking:** The class labels (action + finding pairs) are inferred from the department's naming convention. The exact wording should be confirmed with them.

**Not accounted for:** The galvanized-downstream-of-lead rule from Decision 5. A property with hs_service='Galvanized' and ss_previously_lead='Yes' may need escalation from its tier 6 assignment. The interaction needs clarifying.

**Status:** Implemented. Priority is computed from materials and surfaced on the properties list, as a filter, and as a distribution chart on analytics. See `classification.py` for the shared implementation.

---

## 9. Replacements

**Decision:** Replacements are completed outside LSLP, tracked in Brightly, and reported monthly via the Mayor's Monthly Report. The department wants the app to track replacements.

**Implication:** This connects to the Brightly integration planned for Phase 3.3. The data model specified in `docs/ANALYTICS_GAPS.md` (a `replacements` table linked by `account_number`) aligns with this requirement.

**Status:** Recorded. Blocked on Brightly API access. See `ROADMAP.md` Phase 3.3.

---

## 10. Return-Needed Flag (Demo Feedback, 2026-08-20)

**Decision:** Field crews need a way to flag properties that could not be completed and require a return visit. This must be prominent on the field form — not buried in notes.

**Conditional display rule:** The flag is offered whenever the visit has not produced a material determination. This means:
- **No access** (No, No Answer, Refused): checkbox available — outcome field is empty.
- **Access with non-determination** (Unknown, Inaccessible, Inconclusive): checkbox available — the crew got in but could not identify the material.
- **Access with material identified** (Lead, Copper, Galvanized, Brass, Cast Iron, Iron, Plastic): checkbox hidden and cleared — the work is done.
- **Scheduled**: checkbox hidden and cleared — the appointment date is the return commitment, not the flag.

The determination set is defined as `MATERIAL_DETERMINATIONS` in `classification.py` (backend) and `validation.js` (frontend). Any outcome not in the set keeps the checkbox available, which is the safe default for unknown imported values.

**Imported D2D outcomes classified:**
- Copper, Lead → material determinations (hide checkbox)
- Awaiting Customer Call → not a determination — still trying to reach the homeowner
- Follow-Up → not a determination — requires another interaction
- Inconclusive → not a determination — could not identify the material
- Completed - Private & Public Verified → material determination — both sides verified, work is done (not present in current data but included for future imports)

**Scheduled visits as a return source:** When access is Scheduled and a follow_up_date is set, the property enters the return queue via the appointment, not the flag. The flag is hidden because the date is a stronger commitment. If the appointment date passes with no follow-up visit recorded, the property stays in the queue — a missed appointment is not resolved by the passage of time.

**Server-side enforcement:** POST rejects with 422 when `needs_return=true` alongside a material determination outcome, or when `needs_return=true` and access is Scheduled. Catches records queued offline before these rules existed.

**Not confirmed with the department.** This rule was decided internally based on what makes operational sense. Worth checking with the department whether there are edge cases (e.g. "material identified on one side but need to return for the other side" once side-aware visits exist per Decision 2).

**Implementation:** A `needs_return` Boolean on `visits`, defaulting to false. The return queue is a computed view with two sources: (1) properties with any visit where `needs_return = true`, and (2) properties with any Scheduled visit that has a `follow_up_date`. Both are resolved by a later visit where `access_granted = 'Yes'` and `verification_outcome` is a material determination. The original visit's flag stays true as a historical record; a later successful visit removes the property from the queue without mutating the flag.

**Visual treatment:** Neutral (slate) — not amber, which conflicts with the orange used for galvanized material throughout the interface. The icon (RotateCcw) and label carry the meaning. Consistent across both visit forms, property detail, properties list, and the dashboard action card.

**Implication:** Dashboard shows a "Needs return visit" action card linking to `/properties?needs_return=true`. The same filter logic is used in both the dashboard count and the properties list query to ensure agreement.

**Status:** Implemented. Alembic migration `4b782110b6d1`. UI on both field and office forms. Conditional display via shared `isNeedsReturnPermitted()` and `MATERIAL_DETERMINATIONS` in `validation.js` and `classification.py`.

---

## 11. Follow-Up Dates (Demo Feedback, 2026-08-20)

**Decision:** The department wants to track follow-up dates on both outreach and visits, with conditional validation:

- **Outreach:** `follow_up_date` required when outcome is "Scheduled" or "Follow-up", rejected otherwise.
- **Visits:** `follow_up_date` required when access is "Scheduled" (labeled "Appointment Date" in UI), rejected otherwise.

**Implementation:** Nullable DATE columns on both tables. Validated on client (fields only appear when the condition is met) and server (422 if rules violated). Combined follow-ups from both sources appear in an "Upcoming Follow-ups" section on the Overview dashboard.

**Status:** Implemented. Alembic migration `99aa61d63ed4`. Validation on both client and server.

---

## 12. Photo Requirement on Customer Portal (Demo Feedback, 2026-08-20)

**Decision:** Photos are no longer optional on the customer portal. The "Skip photos and submit" option was removed. At least one photo is required.

**Implementation:** Frontend: submit button disabled until ≥1 photo uploaded; skip link removed; heading changed from "optional" to required. Backend: server returns 422 with "At least one photo is required" if no photos are attached.

**Status:** Implemented. Both client and server enforce the requirement.

---

## 13. Property Search Typeahead on Office Forms (Demo Feedback, 2026-08-20)

**Decision:** The office forms for logging visits and outreach should use a property search typeahead instead of requiring the user to know and type an account number.

**Implementation:** Shared `PropertySearch` component (debounced search, dropdown with address + account number + material indicator) replaces the raw account number input on `NewVisit.jsx` and `NewOutreach.jsx`. When navigating from a property detail page, the account number and address are pre-filled via router state, and the search is replaced with a read-only property display.

**Status:** Implemented.
