from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
from app.database import get_db
from app.models.user import User
from app.services.auth import verify_firebase_token

router = APIRouter()

_SERVER_TZ = ZoneInfo("America/New_York")


def _to_utc_datetime(val):
    """Normalize a timestamp to UTC-aware datetime for sorting and serialization.
    Naive timestamps are assumed to be in the server's local timezone (Eastern)."""
    if isinstance(val, datetime):
        if val.tzinfo:
            return val.astimezone(timezone.utc)
        return val.replace(tzinfo=_SERVER_TZ).astimezone(timezone.utc)
    if isinstance(val, date):
        return datetime(val.year, val.month, val.day, tzinfo=timezone.utc)
    return None


@router.get("/me/activity")
def get_my_activity(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(verify_firebase_token),
):
    uid = user.firebase_uid

    visit_count = db.execute(
        text("SELECT COUNT(*) FROM visits WHERE created_by_uid = :uid"),
        {"uid": uid},
    ).scalar()

    outreach_count = db.execute(
        text("SELECT COUNT(*) FROM outreach_log WHERE created_by_uid = :uid"),
        {"uid": uid},
    ).scalar()

    review_count = db.execute(
        text("SELECT COUNT(*) FROM customer_submissions WHERE reviewed_by = :uid"),
        {"uid": uid},
    ).scalar()

    property_update_count = db.execute(
        text("SELECT COUNT(*) FROM audit_log WHERE changed_by = :uid"),
        {"uid": uid},
    ).scalar()

    visits = db.execute(text("""
        SELECT 'visit' AS type, p.address, v.account_number,
               v.verification_outcome AS detail, v.visited_at AS occurred_at,
               CASE WHEN v.entered_by_uid IS NOT NULL AND v.entered_by_uid != v.created_by_uid
                    THEN (SELECT u.name FROM users u WHERE u.firebase_uid = v.entered_by_uid)
                    ELSE NULL END AS entered_by_name
        FROM visits v
        JOIN properties p ON p.account_number = v.account_number
        WHERE v.created_by_uid = :uid AND v.visited_at IS NOT NULL
    """), {"uid": uid}).mappings().all()

    outreach = db.execute(text("""
        SELECT 'outreach' AS type, p.address, o.account_number,
               o.method AS detail, o.outreach_date AS occurred_at
        FROM outreach_log o
        JOIN properties p ON p.account_number = o.account_number
        WHERE o.created_by_uid = :uid AND o.outreach_date IS NOT NULL
    """), {"uid": uid}).mappings().all()

    reviews = db.execute(text("""
        SELECT 'review' AS type, p.address, cs.account_number,
               cs.review_status AS detail, cs.reviewed_at AS occurred_at
        FROM customer_submissions cs
        JOIN properties p ON p.account_number = cs.account_number
        WHERE cs.reviewed_by = :uid AND cs.reviewed_at IS NOT NULL
    """), {"uid": uid}).mappings().all()

    property_updates = db.execute(text("""
        SELECT 'property_update' AS type, p.address, al.record_id AS account_number,
               al.field_changed || ': ' || COALESCE(al.old_value, '(none)') || ' → ' || COALESCE(al.new_value, '(none)') AS detail,
               al.changed_at AS occurred_at
        FROM audit_log al
        JOIN properties p ON p.account_number = al.record_id
        WHERE al.changed_by = :uid AND al.table_name = 'properties'
    """), {"uid": uid}).mappings().all()

    rows = []
    for source in [visits, outreach, reviews, property_updates]:
        for r in source:
            row = dict(r)
            row["occurred_at"] = _to_utc_datetime(row["occurred_at"])
            if row["occurred_at"]:
                rows.append(row)

    rows.sort(key=lambda x: x["occurred_at"], reverse=True)

    total = len(rows)
    start = (page - 1) * per_page
    page_rows = rows[start : start + per_page]

    for item in page_rows:
        item["occurred_at"] = item["occurred_at"].isoformat()

    return {
        "counts": {
            "visits": visit_count or 0,
            "outreach": outreach_count or 0,
            "reviews": review_count or 0,
            "property_updates": property_update_count or 0,
        },
        "activity": page_rows,
        "total": total,
        "page": page,
        "per_page": per_page,
    }
