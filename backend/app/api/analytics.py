from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.services.auth import require_role

router = APIRouter()

_MAT = """CASE
    WHEN LOWER({c}) = 'lead' THEN 'Lead'
    WHEN LOWER({c}) = 'copper' THEN 'Copper'
    WHEN LOWER({c}) = 'galvanized' THEN 'Galvanized'
    WHEN LOWER({c}) IN ('unknown', '') OR {c} IS NULL THEN 'Unknown'
    ELSE 'Other'
END"""

_OUT = """CASE
    WHEN {c} ILIKE 'Completed%' OR {c} ILIKE '%verified%' THEN 'Completed'
    WHEN {c} ILIKE '%No Contact%' OR {c} ILIKE '%No Answer%' THEN 'No Contact'
    WHEN {c} ILIKE 'Mailing%' THEN 'Mailing'
    WHEN {c} ILIKE 'Follow%' THEN 'Follow-up'
    ELSE 'Other'
END"""

MATERIAL_ORDER = ["Lead", "Copper", "Galvanized", "Unknown", "Other"]


def _month_range(start: date, end: date):
    result = []
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        result.append(date(y, m, 1))
        m += 1
        if m > 12:
            m = 1
            y += 1
    return result


def _build_filters(material, verified_status, outreach_outcome, date_from, date_to):
    conds = []
    params = {}

    if material:
        hs = _MAT.format(c="p.hs_service")
        ss = _MAT.format(c="p.ss_service")
        conds.append(f"({hs} = :material OR {ss} = :material)")
        params["material"] = material

    if verified_status:
        conds.append("p.verified_status = :verified_status")
        params["verified_status"] = verified_status

    if outreach_outcome:
        oc = _OUT.format(c="o_filt.outcome")
        conds.append(
            f"EXISTS (SELECT 1 FROM outreach_log o_filt "
            f"WHERE o_filt.account_number = p.account_number AND {oc} = :outreach_outcome)"
        )
        params["outreach_outcome"] = outreach_outcome

    if date_from:
        params["date_from"] = date_from
    if date_to:
        params["date_to"] = date_to

    if date_from or date_to:
        v_conds = ["v_dr.account_number = p.account_number"]
        o_conds = ["o_dr.account_number = p.account_number"]
        if date_from:
            v_conds.append("v_dr.visited_at >= CAST(:date_from AS timestamp)")
            o_conds.append("o_dr.outreach_date >= :date_from")
        if date_to:
            v_conds.append("v_dr.visited_at < (CAST(:date_to AS date) + interval '1 day')")
            o_conds.append("o_dr.outreach_date <= :date_to")
        conds.append(
            f"(EXISTS (SELECT 1 FROM visits v_dr WHERE {' AND '.join(v_conds)}) "
            f"OR EXISTS (SELECT 1 FROM outreach_log o_dr WHERE {' AND '.join(o_conds)}))"
        )

    return " AND ".join(conds) if conds else "1=1", params


@router.get("/")
def get_analytics(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    material: Optional[str] = Query(None),
    verified_status: Optional[str] = Query(None),
    outreach_outcome: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_role(["office_staff", "supervisor", "admin"])),
):
    prop_where, params = _build_filters(
        material, verified_status, outreach_outcome, date_from, date_to
    )

    visit_time = []
    if date_from:
        visit_time.append("v.visited_at >= CAST(:date_from AS timestamp)")
    if date_to:
        visit_time.append("v.visited_at < (CAST(:date_to AS date) + interval '1 day')")
    visit_time_where = " AND ".join(visit_time) if visit_time else "1=1"

    outreach_time = []
    if date_from:
        outreach_time.append("o.outreach_date >= :date_from")
    if date_to:
        outreach_time.append("o.outreach_date <= :date_to")
    outreach_time_where = " AND ".join(outreach_time) if outreach_time else "1=1"

    # --- Material Distribution ---
    hs_dist = db.execute(
        text(f"SELECT {_MAT.format(c='p.hs_service')} AS material, COUNT(*) as count "
             f"FROM properties p WHERE {prop_where} GROUP BY material ORDER BY count DESC"),
        params,
    ).fetchall()

    ss_dist = db.execute(
        text(f"SELECT {_MAT.format(c='p.ss_service')} AS material, COUNT(*) as count "
             f"FROM properties p WHERE {prop_where} GROUP BY material ORDER BY count DESC"),
        params,
    ).fetchall()

    # --- Material Pairings Matrix ---
    pairings_raw = db.execute(
        text(f"SELECT {_MAT.format(c='p.ss_service')} AS ss_mat, "
             f"{_MAT.format(c='p.hs_service')} AS hs_mat, COUNT(*) as count "
             f"FROM properties p WHERE {prop_where} GROUP BY ss_mat, hs_mat"),
        params,
    ).fetchall()

    ss_mats_present = set(r.ss_mat for r in pairings_raw)
    hs_mats_present = set(r.hs_mat for r in pairings_raw)
    ss_mats = [m for m in MATERIAL_ORDER if m in ss_mats_present]
    hs_mats = [m for m in MATERIAL_ORDER if m in hs_mats_present]
    pair_lookup = {(r.ss_mat, r.hs_mat): r.count for r in pairings_raw}
    matrix = [[pair_lookup.get((ss, hs), 0) for hs in hs_mats] for ss in ss_mats]

    # --- Classification Summary ---
    cls = db.execute(
        text(f"""SELECT COUNT(*) as total,
            SUM(CASE WHEN {_MAT.format(c='p.hs_service')} != 'Unknown'
                      AND {_MAT.format(c='p.ss_service')} != 'Unknown' THEN 1 ELSE 0 END) as classified,
            SUM(CASE WHEN {_MAT.format(c='p.hs_service')} = 'Unknown'
                       OR {_MAT.format(c='p.ss_service')} = 'Unknown' THEN 1 ELSE 0 END) as unknown_pending
            FROM properties p WHERE {prop_where}"""),
        params,
    ).fetchone()
    total = cls.total or 0
    classified = cls.classified or 0
    unknown_pending = cls.unknown_pending or 0

    # --- Time range for continuous series ---
    if date_from and date_to:
        series_from, series_to = date_from, date_to
    else:
        rng = db.execute(text(
            "SELECT LEAST((SELECT MIN(outreach_date) FROM outreach_log), "
            "              (SELECT MIN(visited_at::date) FROM visits)) AS mn, "
            "       GREATEST((SELECT MAX(outreach_date) FROM outreach_log), "
            "                 (SELECT MAX(visited_at::date) FROM visits)) AS mx"
        )).fetchone()
        series_from = date_from or (rng.mn if rng.mn else date.today())
        series_to = date_to or (rng.mx if rng.mx else date.today())

    months = _month_range(series_from, series_to) if series_from and series_to else []

    # --- Verification Over Time ---
    verif_rows = db.execute(
        text(f"SELECT date_trunc('month', v.visited_at)::date AS month, COUNT(*) AS count "
             f"FROM visits v JOIN properties p ON p.account_number = v.account_number "
             f"WHERE v.verification_outcome IN ('Lead', 'Copper', 'Galvanized') "
             f"AND {prop_where} AND {visit_time_where} GROUP BY 1"),
        params,
    ).fetchall()
    verif_lookup = {r.month: r.count for r in verif_rows}
    verification_over_time = [
        {"month": m.strftime("%Y-%m"), "count": verif_lookup.get(m, 0)} for m in months
    ]

    # --- Outreach Outcomes Over Time ---
    outcome_rows = db.execute(
        text(f"SELECT date_trunc('month', o.outreach_date::timestamp)::date AS month, "
             f"{_OUT.format(c='o.outcome')} AS grp, COUNT(*) AS count "
             f"FROM outreach_log o JOIN properties p ON p.account_number = o.account_number "
             f"WHERE {prop_where} AND {outreach_time_where} GROUP BY 1, 2"),
        params,
    ).fetchall()
    outcome_lookup = {}
    all_grps = set()
    for r in outcome_rows:
        outcome_lookup[(r.month, r.grp)] = r.count
        all_grps.add(r.grp)
    grps_sorted = sorted(all_grps)
    outreach_outcomes = [
        {"month": m.strftime("%Y-%m"), **{g: outcome_lookup.get((m, g), 0) for g in grps_sorted}}
        for m in months
    ]

    # --- Outreach Reach (distinct properties per month) ---
    reach_rows = db.execute(
        text(f"SELECT date_trunc('month', o.outreach_date::timestamp)::date AS month, "
             f"COUNT(DISTINCT o.account_number) AS properties_contacted, "
             f"COUNT(*) AS total_attempts "
             f"FROM outreach_log o JOIN properties p ON p.account_number = o.account_number "
             f"WHERE {prop_where} AND {outreach_time_where} GROUP BY 1"),
        params,
    ).fetchall()
    reach_lookup = {r.month: (r.properties_contacted, r.total_attempts) for r in reach_rows}
    outreach_reach = [
        {
            "month": m.strftime("%Y-%m"),
            "properties_contacted": reach_lookup.get(m, (0, 0))[0],
            "total_attempts": reach_lookup.get(m, (0, 0))[1],
        }
        for m in months
    ]

    return {
        "material_distribution": {
            "house_side": [{"material": r.material, "count": r.count} for r in hs_dist],
            "street_side": [{"material": r.material, "count": r.count} for r in ss_dist],
        },
        "material_pairings": {
            "row_axis": "Public side (street)",
            "col_axis": "Private side (house)",
            "rows": ss_mats,
            "cols": hs_mats,
            "matrix": matrix,
        },
        "classification_summary": {
            "total": total,
            "classified": classified,
            "unknown_pending": unknown_pending,
            "classified_pct": round(classified / total * 100, 1) if total else 0,
            "unknown_pending_pct": round(unknown_pending / total * 100, 1) if total else 0,
        },
        "verification_over_time": verification_over_time,
        "outreach_outcomes_over_time": {
            "series": grps_sorted,
            "data": outreach_outcomes,
        },
        "outreach_reach": outreach_reach,
        "filters_applied": {
            "date_from": str(date_from) if date_from else None,
            "date_to": str(date_to) if date_to else None,
            "material": material,
            "verified_status": verified_status,
            "outreach_outcome": outreach_outcome,
        },
    }
