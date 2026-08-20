from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import Optional
from app.database import get_db
from app.models.property import Property
from app.models.visit import Visit
from app.models.outreach import OutreachLog
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.property import PropertyResponse, PropertyUpdate
from app.services.auth import verify_firebase_token, require_role
from app.services.classification import compute_priority, PRIORITY_LABELS, MATERIAL_DETERMINATIONS

router = APIRouter()

@router.get("/", response_model=list[PropertyResponse])
def get_properties(
    skip: int = 0,
    limit: int = 100,
    verified_status: Optional[str] = Query(None),
    address: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    stalled: Optional[bool] = Query(None),
    untouched: Optional[bool] = Query(None),
    needs_return: Optional[bool] = Query(None),
    priority: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(verify_firebase_token),
):
    query = db.query(Property)

    if verified_status:
        query = query.filter(Property.verified_status == verified_status)
    if address:
        query = query.filter(Property.address.ilike(f"%{address}%"))

    if search:
        query = query.filter(
            Property.address.ilike(f"%{search}%") |
            Property.account_number.ilike(f"%{search}%")
        )

    if stalled:
        query = query.filter(
            Property.verified_status.in_(["Pending", "Unknown"]),
            db.query(func.count()).select_from(OutreachLog)
            .filter(OutreachLog.account_number == Property.account_number)
            .correlate(Property)
            .as_scalar() >= 4
        )

    if untouched:
        query = query.filter(
            ~Property.account_number.in_(
                db.query(Visit.account_number).distinct()
            ),
            ~Property.account_number.in_(
                db.query(OutreachLog.account_number).distinct()
            ),
        )

    if needs_return:
        return_accounts = db.query(Visit.account_number).filter(
            or_(
                Visit.needs_return.is_(True),
                and_(
                    Visit.access_granted == "Scheduled",
                    Visit.follow_up_date.isnot(None),
                ),
            )
        ).distinct()
        completed_accounts = db.query(Visit.account_number).filter(
            Visit.access_granted == "Yes",
            Visit.verification_outcome.in_(MATERIAL_DETERMINATIONS),
        ).distinct()
        query = query.filter(
            Property.account_number.in_(return_accounts),
            ~Property.account_number.in_(completed_accounts),
        )

    if priority is not None:
        hs_lead = Property.hs_service == 'Lead'
        ss_lead = Property.ss_service == 'Lead'
        hs_unk = or_(Property.hs_service == None, Property.hs_service.in_(['Unknown', '']))
        ss_unk = or_(Property.ss_service == None, Property.ss_service.in_(['Unknown', '']))
        hs_nl = and_(Property.hs_service != None, ~Property.hs_service.in_(['Lead', 'Unknown', '']))
        ss_nl = and_(Property.ss_service != None, ~Property.ss_service.in_(['Lead', 'Unknown', '']))
        tier_map = {
            1: and_(hs_lead, ss_lead),
            2: or_(and_(hs_lead, ss_nl), and_(hs_nl, ss_lead)),
            3: or_(and_(hs_lead, ss_unk), and_(hs_unk, ss_lead)),
            4: and_(hs_unk, ss_unk),
            5: or_(and_(hs_unk, ss_nl), and_(hs_nl, ss_unk)),
            6: and_(hs_nl, ss_nl),
        }
        if priority in tier_map:
            query = query.filter(tier_map[priority])

    results = query.offset(skip).limit(limit).all()
    for prop in results:
        tier = compute_priority(prop.hs_service, prop.ss_service)
        prop.priority = tier
        prop.priority_label = PRIORITY_LABELS.get(tier, '')
    return results


@router.get("/{account_number}", response_model=PropertyResponse)
def get_property(account_number: str, db: Session = Depends(get_db), _=Depends(verify_firebase_token)):
    prop = db.query(Property).filter(Property.account_number == account_number).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    tier = compute_priority(prop.hs_service, prop.ss_service)
    prop.priority = tier
    prop.priority_label = PRIORITY_LABELS.get(tier, '')
    return prop


@router.patch("/{account_number}", response_model=PropertyResponse)
def update_property(
    account_number: str,
    updates: PropertyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["office_staff", "supervisor", "admin"])),
):
    prop = db.query(Property).filter(Property.account_number == account_number).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        old_value = getattr(prop, field)
        if str(old_value) != str(value):
            db.add(AuditLog(
                table_name="properties",
                record_id=account_number,
                field_changed=field,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(value) if value is not None else None,
                changed_by=user.firebase_uid,
                changed_at=datetime.now(timezone.utc),
            ))
        setattr(prop, field, value)

    db.commit()
    db.refresh(prop)
    tier = compute_priority(prop.hs_service, prop.ss_service)
    prop.priority = tier
    prop.priority_label = PRIORITY_LABELS.get(tier, '')
    return prop