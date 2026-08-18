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

_FIELD_VERIFIED_STATUSES = "('Verified-Lead', 'Verified-Copper', 'Verified-Galvanized')"


def compute_inventory_progress(
    db: Session, prop_where: str = "1=1", params: dict | None = None,
):
    hs = _IS_REAL_MATERIAL.format(c="p.hs_service")
    ss = _IS_REAL_MATERIAL.format(c="p.ss_service")

    row = db.execute(
        text(
            f"SELECT COUNT(*) AS total,"
            f" SUM(CASE WHEN ({hs}) AND ({ss}) THEN 1 ELSE 0 END) AS material_on_record,"
            f" SUM(CASE WHEN p.verified_status IN {_FIELD_VERIFIED_STATUSES}"
            f"     THEN 1 ELSE 0 END) AS field_verified"
            f" FROM properties p WHERE {prop_where}"
        ),
        params or {},
    ).fetchone()

    total = row.total or 0
    mor = row.material_on_record or 0
    fv = row.field_verified or 0

    return {
        "total": total,
        "material_on_record": mor,
        "material_on_record_pct": round(mor / total * 100, 1) if total else 0,
        "field_verified": fv,
        "field_verified_pct": round(fv / total * 100, 1) if total else 0,
    }
