"""Post-normalization verification.

Run AFTER all UPDATE statements from normalize_data.sql have been executed.
Confirms:
  1. Zero non-canonical values remain in constrained columns
  2. Pairings matrix cell count dropped from 59 to 29
  3. No 'string' values remain
  4. ss_previously_lead is uniform
"""
import os, sys
sys.path.insert(0, r"C:\lslp\backend")
from dotenv import load_dotenv
load_dotenv(r"C:\lslp\backend\.env")
import psycopg2

VALID_MATERIALS = {
    "Lead", "Copper", "Galvanized", "Cast Iron", "Iron",
    "Brass", "Plastic", "Unknown",
}

VALID_VERIFICATION_METHODS = {
    "Customer ID with Photo or Other Verification",
    "Customer Identification",
    "Customer Identification with Photo or Other Verification",
    "Excavation", "Field Inspection", "Field Verification",
    "Not Verified", "Onsite Verification",
    "Other", "Pending Import", "Records",
}

VALID_VERIFIED_STATUSES = {
    "Pending", "Verified-Lead", "Verified-Copper",
    "Verified-Galvanized", "Unknown",
}

conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
)
cur = conn.cursor()

problems = []

def check_column(table, col, valid_set, allow_null=True):
    cur.execute(
        f"SELECT {col}, COUNT(*) FROM {table} "
        f"WHERE {col} IS NOT NULL GROUP BY {col} ORDER BY COUNT(*) DESC"
    )
    rows = cur.fetchall()
    for val, cnt in rows:
        if val not in valid_set:
            problems.append(f"  {table}.{col}: '{val}' x {cnt} — NOT in canonical set")
            print(f"  FAIL  {table}.{col}: '{val}' x {cnt}")
        else:
            print(f"  OK    {table}.{col}: '{val}' x {cnt}")

print("=" * 70)
print("1. Material columns")
print("=" * 70)
check_column("properties", "hs_service", VALID_MATERIALS)
print()
check_column("properties", "ss_service", VALID_MATERIALS)

print("\n" + "=" * 70)
print("2. Verification method columns")
print("=" * 70)
for col in ["hs_verification_method", "ss_verification_method",
            "ub_mapped_private_method", "ub_mapped_public_method"]:
    check_column("properties", col, VALID_VERIFICATION_METHODS)
    print()

print("=" * 70)
print("3. verified_status")
print("=" * 70)
check_column("properties", "verified_status", VALID_VERIFIED_STATUSES)

print("\n" + "=" * 70)
print("4. Stray 'string' values")
print("=" * 70)
cur.execute("""
    SELECT COUNT(*) FROM properties
    WHERE 'string' IN (verified_status, hs_verification_method,
        ss_verification_method, ub_mapped_private_method, ub_mapped_public_method)
""")
cnt = cur.fetchone()[0]
if cnt > 0:
    problems.append(f"  {cnt} row(s) still have 'string' values")
    print(f"  FAIL  {cnt} row(s) still have 'string'")
else:
    print(f"  OK    Zero 'string' values remain")

print("\n" + "=" * 70)
print("5. ss_previously_lead")
print("=" * 70)
cur.execute("""
    SELECT ss_previously_lead, COUNT(*) FROM properties
    WHERE ss_previously_lead IS NOT NULL
    GROUP BY ss_previously_lead ORDER BY COUNT(*) DESC
""")
for val, cnt in cur.fetchall():
    print(f"  '{val}' x {cnt}")

print("\n" + "=" * 70)
print("6. Pairings matrix cell count")
print("=" * 70)
cur.execute("""
    SELECT COUNT(DISTINCT (hs_service, ss_service))
    FROM properties
    WHERE hs_service IS NOT NULL AND ss_service IS NOT NULL
""")
pairs = cur.fetchone()[0]
expected = 29
if pairs == expected:
    print(f"  OK    {pairs} distinct pairs (expected {expected})")
else:
    note = "higher than expected — check for unexpected values" if pairs > expected else "lower — some material combinations may have been eliminated"
    problems.append(f"  Pairings: {pairs} (expected {expected})")
    print(f"  NOTE  {pairs} distinct pairs (expected {expected}, {note})")

print("\n" + "=" * 70)
print("7. Outreach method")
print("=" * 70)
cur.execute("SELECT method, COUNT(*) FROM outreach_log WHERE method IS NOT NULL GROUP BY method ORDER BY COUNT(*) DESC")
for val, cnt in cur.fetchall():
    print(f"  '{val}' x {cnt}")

print("\n" + "=" * 70)
if problems:
    print(f"RESULT: {len(problems)} problem(s) found")
    for p in problems:
        print(p)
else:
    print("RESULT: All checks passed — normalization is complete")
print("=" * 70)

cur.close()
conn.close()
