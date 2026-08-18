from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from app.database import get_db
from app.models.property import Property
from app.models.visit import Visit
from app.models.outreach import OutreachLog
from app.models.submission import CustomerSubmission
from app.services.auth import require_role
from app.services.classification import compute_inventory_progress

router = APIRouter()


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    _=Depends(require_role(["office_staff", "supervisor", "admin"])),
):
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)

    classification = dict(
        db.query(Property.verified_status, func.count())
        .group_by(Property.verified_status)
        .all()
    )
    total_properties = sum(classification.values())

    pending_submissions = (
        db.query(func.count())
        .select_from(CustomerSubmission)
        .filter(CustomerSubmission.review_status == "Pending")
        .scalar()
    )

    visits_last_7 = (
        db.query(func.count())
        .select_from(Visit)
        .filter(Visit.visited_at >= seven_days_ago)
        .scalar()
    )
    visits_prior_7 = (
        db.query(func.count())
        .select_from(Visit)
        .filter(Visit.visited_at >= fourteen_days_ago, Visit.visited_at < seven_days_ago)
        .scalar()
    )

    stalled_outreach = db.execute(text("""
        SELECT COUNT(DISTINCT p.account_number)
        FROM properties p
        WHERE p.verified_status IN ('Pending', 'Unknown')
          AND (SELECT COUNT(*) FROM outreach_log o WHERE o.account_number = p.account_number) >= 4
    """)).scalar()

    never_touched = db.execute(text("""
        SELECT COUNT(*)
        FROM properties p
        WHERE NOT EXISTS (SELECT 1 FROM visits v WHERE v.account_number = p.account_number)
          AND NOT EXISTS (SELECT 1 FROM outreach_log o WHERE o.account_number = p.account_number)
    """)).scalar()

    recent_visits = db.execute(text("""
        SELECT 'visit' AS type, p.address, v.account_number, v.initials AS who, v.visited_at AS occurred_at,
               CASE WHEN v.entered_by_uid IS NOT NULL AND v.entered_by_uid != v.created_by_uid
                    THEN (SELECT u.name FROM users u WHERE u.firebase_uid = v.entered_by_uid)
                    ELSE NULL END AS entered_by_name
        FROM visits v
        JOIN properties p ON p.account_number = v.account_number
        WHERE v.visited_at IS NOT NULL
        ORDER BY v.visited_at DESC
        LIMIT 8
    """)).mappings().all()

    recent_outreach = db.execute(text("""
        SELECT 'outreach' AS type, p.address, o.account_number, o.initials AS who, o.outreach_date AS occurred_at
        FROM outreach_log o
        JOIN properties p ON p.account_number = o.account_number
        WHERE o.outreach_date IS NOT NULL
        ORDER BY o.outreach_date DESC
        LIMIT 8
    """)).mappings().all()

    _server_tz = ZoneInfo("America/New_York")

    def _to_utc_datetime(val):
        if isinstance(val, datetime):
            if val.tzinfo:
                return val.astimezone(timezone.utc)
            return val.replace(tzinfo=_server_tz).astimezone(timezone.utc)
        if isinstance(val, date):
            return datetime(val.year, val.month, val.day, tzinfo=timezone.utc)
        return None

    rows = []
    for r in recent_visits:
        row = dict(r)
        row["occurred_at"] = _to_utc_datetime(row["occurred_at"])
        if row["occurred_at"]:
            rows.append(row)
    for r in recent_outreach:
        row = dict(r)
        row["occurred_at"] = _to_utc_datetime(row["occurred_at"])
        if row["occurred_at"]:
            rows.append(row)

    combined = sorted(rows, key=lambda x: x["occurred_at"], reverse=True)[:8]

    for item in combined:
        item["occurred_at"] = item["occurred_at"].isoformat()

    inventory_progress = compute_inventory_progress(db)

    return {
        "classification": classification,
        "total_properties": total_properties,
        "inventory_progress": inventory_progress,
        "pending_submissions": pending_submissions,
        "visits_last_7": visits_last_7,
        "visits_prior_7": visits_prior_7,
        "stalled_outreach": stalled_outreach,
        "never_touched": never_touched,
        "recent_activity": combined,
    }
