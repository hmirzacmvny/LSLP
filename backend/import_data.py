import pandas as pd
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

# ── Connect to PostgreSQL ─────────────────────────────────────────
conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD")
)
cursor = conn.cursor()
print("✅ Connected to PostgreSQL")

# ── Helper: clean a value (turn empty strings into None) ──────────
def clean(val):
    if pd.isna(val) or str(val).strip() == "":
        return None
    return str(val).strip()

# ── Canonical value sets for normalization on import ─────────────
_MATERIAL_CANONICAL = {
    "lead": "Lead", "copper": "Copper", "galvanized": "Galvanized",
    "cast iron": "Cast Iron", "iron": "Iron", "brass": "Brass",
    "plastic": "Plastic", "unknown": "Unknown",
}

_VERIFICATION_METHOD_CANONICAL = {
    "customer id with photo or other verification": "Customer ID with Photo or Other Verification",
    "customer identification": "Customer Identification",
    "customer identification with photo or other verification": "Customer Identification with Photo or Other Verification",
    "excavation": "Excavation",
    "field inspection": "Field Inspection",
    "field verification": "Field Verification",
    "not verified": "Not Verified",
    "onsite verification": "Onsite Verification",
    "other": "Other",
    "pending import": "Pending Import",
    "records": "Records",
}

def normalize(val, canonical_map):
    if val is None:
        return None
    key = val.strip().lower()
    return canonical_map.get(key, val.strip())

def clean_material(val):
    return normalize(clean(val), _MATERIAL_CANONICAL)

def clean_method(val):
    return normalize(clean(val), _VERIFICATION_METHOD_CANONICAL)

# ══════════════════════════════════════════════════════════════════
# 1. IMPORT PROPERTIES
# Source: SL Inventory tab
# ══════════════════════════════════════════════════════════════════
print("\n📥 Importing properties...")

df_props = pd.read_csv(
    r"C:\lslp\backend\data\SL_Inventory.csv",
    encoding="utf-8",
    dtype=str
)

# Drop the two empty/unnamed columns
df_props = df_props.loc[:, ~df_props.columns.str.startswith("Unnamed")]
df_props = df_props.dropna(subset=["UB Account Number"])

inserted = 0
skipped  = 0

for _, row in df_props.iterrows():
    try:
        cursor.execute("""
            INSERT INTO properties (
                account_number, service_file_number, acct_status,
                address, zip,
                hs_service, ss_service,
                ub_private_side, ub_utility_side, ub_sl_category, ub_account_type,
                ub_mapped_private_method, ub_mapped_public_method,
                hs_verification_method, ss_verification_method,
                ss_previously_lead
            ) VALUES (
                %s, %s, %s,
                %s, %s,
                %s, %s,
                %s, %s, %s, %s,
                %s, %s,
                %s, %s,
                %s
            )
            ON CONFLICT (account_number) DO NOTHING
        """, (
            clean(row.get("UB Account Number")),
            clean(row.get("Service File Number")),
            clean(row.get("Acct Status")),
            clean(row.get("UB Address")),
            clean(row.get("Zip (Lot)")),
            clean_material(row.get("H.S. Service")),
            clean_material(row.get("S.S. Service")),
            clean(row.get("UB Private Side")),
            clean(row.get("UB Utility Side")),
            clean(row.get("UB SL Category")),
            clean(row.get("UB Account Type")),
            clean_method(row.get("UB Mapped - Private Side Verification Method")),
            clean_method(row.get("UB Mapped - Public Side Verification Method")),
            clean_method(row.get("H.S. Verification Method")),
            clean_method(row.get("S.S. Verification Method")),
            clean(row.get("S.S. Previously Lead?")),
        ))
        inserted += 1
    except Exception as e:
        print(f"  ⚠️  Skipped row: {e}")
        skipped += 1

conn.commit()
print(f"  ✅ Properties: {inserted} inserted, {skipped} skipped")

# ══════════════════════════════════════════════════════════════════
# 2. IMPORT VISITS
# Source: D2D Jan 2026 tab
# ══════════════════════════════════════════════════════════════════
print("\n📥 Importing visits...")

df_d2d = pd.read_csv(
    r"C:\lslp\backend\data\D2D_Jan2026.csv",
    encoding="utf-8",
    dtype=str
)

df_d2d = df_d2d.dropna(subset=["UB Account Number"])

inserted = 0
skipped  = 0

for _, row in df_d2d.iterrows():
    account = clean(row.get("UB Account Number"))
    if not account:
        continue

    # Only import rows that have actual visit data
    has_visit_data = any([
        clean(row.get("Access Granted")),
        clean(row.get("Verification Outcome")),
        clean(row.get("Intials")),
    ])

    if not has_visit_data:
        skipped += 1
        continue

    try:
        cursor.execute("""
            INSERT INTO visits (
                account_number, initials,
                access_granted, verification_outcome,
                property_type, notes
            ) VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            account,
            clean(row.get("Intials")),
            clean(row.get("Access Granted")),
            clean(row.get("Verification Outcome")),
            clean(row.get("Property Type")),
            clean(row.get("Notes")),
        ))
        inserted += 1
    except Exception as e:
        print(f"  ⚠️  Skipped visit for {account}: {e}")
        skipped += 1

conn.commit()
print(f"  ✅ Visits: {inserted} inserted, {skipped} skipped (no visit data)")

# ══════════════════════════════════════════════════════════════════
# 3. IMPORT OUTREACH LOG
# Source: Outreach Log tab
# Converting from WIDE format (4 attempts per row)
# to LONG format (1 attempt per row)
# ══════════════════════════════════════════════════════════════════
print("\n📥 Importing outreach log...")

df_out = pd.read_csv(
    r"C:\lslp\backend\data\Outreach_Log.csv",
    encoding="utf-8",
    dtype=str
)

df_out = df_out.dropna(subset=["Account #"])

inserted = 0
skipped  = 0

for _, row in df_out.iterrows():
    account = clean(row.get("Account #"))
    if not account:
        continue

    # Each row has up to 4 attempts stored in columns:
    # Date 1 / Method 1 / Outcome / Initials  (attempt 1)
    # Date 2 / Method 2 / Outcome / Initials  (attempt 2)
    # etc.
    # We turn each non-empty attempt into its own row

    attempts = [
        (1, "Date 1",  "Method 1", 7,  8),   # col index for outcome/initials
        (2, "Date 2",  "Method 2", 12, 13),
        (3, "Date 3",  "Method 3", 17, 18),
        (4, "Date 4",  "Method 4", 22, 23),
    ]

    cols = list(df_out.columns)

    for attempt_num, date_col, method_col, outcome_idx, initials_idx in attempts:
        date    = clean(row.get(date_col))
        method  = clean(row.get(method_col))

        # Get outcome and initials by column position
        # (because pandas gives duplicate column names a suffix)
        try:
            outcome  = clean(row.iloc[outcome_idx])
            initials = clean(row.iloc[initials_idx])
        except:
            outcome  = None
            initials = None

        # Skip this attempt slot if there's no date AND no method
        if not date and not method:
            skipped += 1
            continue

        # Parse date string to proper date
        parsed_date = None
        if date:
            try:
                parsed_date = pd.to_datetime(date, errors="coerce")
                if pd.isna(parsed_date):
                    parsed_date = None
            except:
                parsed_date = None

        # Customer-initiated notes (last real column)
        customer_notes = clean(row.get("Customer-Initiated contact (Date and Outcome)"))

        try:
            cursor.execute("""
                INSERT INTO outreach_log (
                    account_number, attempt_number,
                    outreach_date, method, outcome,
                    initials, is_customer_initiated,
                    customer_initiated_notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                account,
                attempt_num,
                parsed_date,
                method,
                outcome,
                initials,
                False,
                customer_notes if attempt_num == 1 else None,
            ))
            inserted += 1
        except Exception as e:
            print(f"  ⚠️  Skipped outreach for {account} attempt {attempt_num}: {e}")
            skipped += 1

conn.commit()
print(f"  ✅ Outreach: {inserted} inserted, {skipped} skipped (empty attempts)")

# ── Done ──────────────────────────────────────────────────────────
cursor.close()
conn.close()
print("\n🎉 Import complete! Your database is loaded with real data.")
print("\nQuick summary query — run this in pgAdmin to verify:")
print("  SELECT 'properties' as tbl, COUNT(*) FROM properties")
print("  UNION ALL SELECT 'visits', COUNT(*) FROM visits")
print("  UNION ALL SELECT 'outreach_log', COUNT(*) FROM outreach_log;")
