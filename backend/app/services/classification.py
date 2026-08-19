from sqlalchemy.orm import Session
from sqlalchemy import text

VALID_VERIFIED_STATUSES = frozenset({
    "Pending",
    "Verified-Lead",
    "Verified-Copper",
    "Verified-Galvanized",
    "Unknown",
})

VALID_MATERIALS = frozenset({
    "Lead", "Copper", "Galvanized", "Cast Iron", "Iron",
    "Brass", "Plastic", "Unknown",
})

VALID_VERIFICATION_METHODS = frozenset({
    "Customer ID with Photo or Other Verification",
    "Customer Identification",
    "Customer Identification with Photo or Other Verification",
    "Excavation",
    "Field Inspection",
    "Field Verification",
    "Not Verified",
    "Onsite Verification",
    "Other",
    "Pending Import",
    "Records",
})

_IS_REAL_MATERIAL = "LOWER({c}) NOT IN ('unknown', '') AND {c} IS NOT NULL"

PRIORITY_LABELS = {
    1: "Replace Both Sides – Lead Detected",
    2: "Replace One Side – Lead Detected",
    3: "Investigate – Lead and Unknown",
    4: "Verify – Both Unknown",
    5: "Verify – One Unknown and Non-Lead",
    6: "No Action – Both Non-Lead",
}

_PRIORITY_SQL = """CASE
    WHEN LOWER(p.hs_service) = 'lead' AND LOWER(p.ss_service) = 'lead'
        THEN 1
    WHEN (LOWER(p.hs_service) = 'lead'
          AND LOWER(p.ss_service) NOT IN ('lead','unknown','') AND p.ss_service IS NOT NULL)
      OR (LOWER(p.ss_service) = 'lead'
          AND LOWER(p.hs_service) NOT IN ('lead','unknown','') AND p.hs_service IS NOT NULL)
        THEN 2
    WHEN (LOWER(p.hs_service) = 'lead'
          AND (LOWER(p.ss_service) IN ('unknown','') OR p.ss_service IS NULL))
      OR (LOWER(p.ss_service) = 'lead'
          AND (LOWER(p.hs_service) IN ('unknown','') OR p.hs_service IS NULL))
        THEN 3
    WHEN (LOWER(p.hs_service) IN ('unknown','') OR p.hs_service IS NULL)
     AND (LOWER(p.ss_service) IN ('unknown','') OR p.ss_service IS NULL)
        THEN 4
    WHEN ((LOWER(p.hs_service) IN ('unknown','') OR p.hs_service IS NULL)
          AND LOWER(p.ss_service) NOT IN ('lead','unknown','') AND p.ss_service IS NOT NULL)
      OR ((LOWER(p.ss_service) IN ('unknown','') OR p.ss_service IS NULL)
          AND LOWER(p.hs_service) NOT IN ('lead','unknown','') AND p.hs_service IS NOT NULL)
        THEN 5
    ELSE 6
END"""


def compute_priority(hs_service, ss_service):
    def classify(mat):
        if not mat or mat.strip() == "" or mat.lower() == "unknown":
            return "unknown"
        return "lead" if mat.lower() == "lead" else "non-lead"

    hs, ss = classify(hs_service), classify(ss_service)
    if hs == "lead" and ss == "lead":
        return 1
    if (hs == "lead" and ss == "non-lead") or (hs == "non-lead" and ss == "lead"):
        return 2
    if (hs == "lead" and ss == "unknown") or (hs == "unknown" and ss == "lead"):
        return 3
    if hs == "unknown" and ss == "unknown":
        return 4
    if (hs == "unknown" and ss == "non-lead") or (hs == "non-lead" and ss == "unknown"):
        return 5
    return 6


def compute_inventory_progress(
    db: Session, prop_where: str = "1=1", params: dict | None = None,
):
    hs = _IS_REAL_MATERIAL.format(c="p.hs_service")
    ss = _IS_REAL_MATERIAL.format(c="p.ss_service")

    row = db.execute(
        text(
            f"SELECT COUNT(*) AS total,"
            f" SUM(CASE WHEN ({hs}) AND ({ss}) THEN 1 ELSE 0 END) AS verified"
            f" FROM properties p WHERE {prop_where}"
        ),
        params or {},
    ).fetchone()

    total = row.total or 0
    verified = row.verified or 0

    methods_hs = db.execute(
        text(
            f"SELECT COALESCE(p.hs_verification_method, 'None Recorded') AS method,"
            f" COUNT(*) AS count"
            f" FROM properties p WHERE {prop_where} AND ({hs}) AND ({ss})"
            f" GROUP BY 1 ORDER BY count DESC"
        ),
        params or {},
    ).fetchall()

    methods_ss = db.execute(
        text(
            f"SELECT COALESCE(p.ss_verification_method, 'None Recorded') AS method,"
            f" COUNT(*) AS count"
            f" FROM properties p WHERE {prop_where} AND ({hs}) AND ({ss})"
            f" GROUP BY 1 ORDER BY count DESC"
        ),
        params or {},
    ).fetchall()

    return {
        "total": total,
        "verified": verified,
        "verified_pct": round(verified / total * 100, 1) if total else 0,
        "method_breakdown": {
            "house_side": [{"method": r.method, "count": r.count} for r in methods_hs],
            "street_side": [{"method": r.method, "count": r.count} for r in methods_ss],
        },
    }
