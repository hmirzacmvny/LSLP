from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.outreach import OutreachLog as Outreach
from app.models.user import User
from app.schemas.outreach import OutreachCreate, OutreachResponse
from app.services.auth import verify_firebase_token, require_role

router = APIRouter()


def _attach_email(record, db: Session):
    if record.created_by_uid:
        user = db.query(User.email).filter(User.firebase_uid == record.created_by_uid).first()
        record.created_by_email = user[0] if user else None
    else:
        record.created_by_email = None
    return record


@router.get("/", response_model=List[OutreachResponse])
def get_outreach(
    account_number: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(["office_staff", "supervisor", "admin"])),
):
    query = db.query(Outreach)
    if account_number:
        query = query.filter(Outreach.account_number == account_number)
    records = query.order_by(Outreach.account_number, Outreach.attempt_number).all()
    for r in records:
        _attach_email(r, db)
    return records


@router.get("/{outreach_id}", response_model=OutreachResponse)
def get_single_outreach(outreach_id: int, db: Session = Depends(get_db), _=Depends(require_role(["office_staff", "supervisor", "admin"]))):
    record = db.query(Outreach).filter(Outreach.id == outreach_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Outreach record not found")
    return _attach_email(record, db)


@router.post("/", response_model=OutreachResponse)
def create_outreach(
    payload: OutreachCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["office_staff", "supervisor", "admin"])),
):
    from app.models.property import Property
    prop = db.query(Property).filter(
        Property.account_number == payload.account_number
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    existing = db.query(Outreach).filter(
        Outreach.account_number == payload.account_number
    ).count()

    FOLLOW_UP_OUTCOMES = {"Scheduled", "Follow-up"}
    if payload.outcome in FOLLOW_UP_OUTCOMES and not payload.follow_up_date:
        raise HTTPException(
            status_code=422,
            detail=f"Follow-up date is required when outcome is {payload.outcome}",
        )
    if payload.outcome and payload.outcome not in FOLLOW_UP_OUTCOMES and payload.follow_up_date:
        raise HTTPException(
            status_code=422,
            detail="Follow-up date is not permitted for this outcome",
        )

    payload_dict = payload.model_dump()
    new_record = Outreach(
        **payload_dict,
        attempt_number=existing + 1,
        initials=user.initials,
        created_by_uid=user.firebase_uid,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return _attach_email(new_record, db)
