from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.database import get_db
from app.models.property import Property
from app.models.visit import Visit
from app.models.outreach import OutreachLog
from app.schemas.property import PropertyResponse, PropertyUpdate
from app.services.auth import verify_firebase_token, require_role

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

    return query.offset(skip).limit(limit).all()


@router.get("/{account_number}", response_model=PropertyResponse)
def get_property(account_number: str, db: Session = Depends(get_db), _=Depends(verify_firebase_token)):
    prop = db.query(Property).filter(Property.account_number == account_number).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop


@router.patch("/{account_number}", response_model=PropertyResponse)
def update_property(
    account_number: str,
    updates: PropertyUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["office_staff", "supervisor", "admin"])),
):
    prop = db.query(Property).filter(Property.account_number == account_number).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(prop, field, value)

    db.commit()
    db.refresh(prop)
    return prop