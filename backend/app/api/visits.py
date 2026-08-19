import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.visit import Visit
from app.models.user import User
from app.models.property import Property
from app.schemas.visit import VisitCreate, VisitResponse
from app.services.storage import save_photo
from app.services.auth import verify_firebase_token, require_role

router = APIRouter()


INSPECTION_ROLES = {"field_crew", "supervisor", "admin"}


def _attach_emails(visit, db: Session):
    """Attach performer and enterer emails to a visit for the response."""
    if visit.created_by_uid:
        user = db.query(User.email).filter(User.firebase_uid == visit.created_by_uid).first()
        visit.created_by_email = user[0] if user else None
    else:
        visit.created_by_email = None
    if visit.entered_by_uid and visit.entered_by_uid != visit.created_by_uid:
        user = db.query(User.email).filter(User.firebase_uid == visit.entered_by_uid).first()
        visit.entered_by_email = user[0] if user else None
    else:
        visit.entered_by_email = None
    return visit


@router.get("/", response_model=List[VisitResponse])
def get_visits(
    account_number: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_role(["office_staff", "supervisor", "admin"])),
):
    query = db.query(Visit)
    if account_number:
        query = query.filter(Visit.account_number == account_number)
    visits = query.order_by(Visit.visited_at.desc()).all()
    for v in visits:
        _attach_emails(v, db)
    return visits


@router.get("/field-users")
def get_field_users(
    db: Session = Depends(get_db),
    _=Depends(require_role(["office_staff", "supervisor", "admin"])),
):
    """List active users with inspection-capable roles for the performer selector."""
    users = (
        db.query(User)
        .filter(User.role.in_(INSPECTION_ROLES), User.is_active.is_(True))
        .order_by(User.name)
        .all()
    )
    return [
        {
            "firebase_uid": u.firebase_uid,
            "name": u.name,
            "initials": u.initials,
            "role": u.role,
        }
        for u in users
    ]


@router.get("/{visit_id}", response_model=VisitResponse)
def get_single_visit(visit_id: int, db: Session = Depends(get_db), _=Depends(require_role(["office_staff", "supervisor", "admin"]))):
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return _attach_emails(visit, db)


@router.post("/", response_model=VisitResponse)
def create_visit(
    account_number: str = Form(...),
    initials: Optional[str] = Form(None),
    performed_by_uid: Optional[str] = Form(None),
    access_granted: Optional[str] = Form(None),
    verification_outcome: Optional[str] = Form(None),
    property_type: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    gps_coordinates: Optional[str] = Form(None),
    photos: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(verify_firebase_token),
):
    prop = db.query(Property).filter(
        Property.account_number == account_number
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    if access_granted == "Yes" and not verification_outcome:
        raise HTTPException(
            status_code=422,
            detail="Verification outcome is required when access was granted",
        )
    if access_granted and access_granted != "Yes" and verification_outcome:
        raise HTTPException(
            status_code=422,
            detail="Verification outcome is not permitted when access was not granted",
        )

    if performed_by_uid:
        performer = db.query(User).filter(
            User.firebase_uid == performed_by_uid,
            User.is_active.is_(True),
            User.role.in_(INSPECTION_ROLES),
        ).first()
        if not performer:
            raise HTTPException(status_code=422, detail="Performer must be an active user with an inspection-capable role")
        performer_uid = performer.firebase_uid
        performer_initials = performer.initials
    else:
        performer_uid = user.firebase_uid
        performer_initials = user.initials

    photo_urls = []
    if photos:
        for photo in photos:
            if photo.filename:
                path = save_photo(photo, "field", account_number)
                photo_urls.append(path)

    gps = None
    if gps_coordinates:
        try:
            gps = json.loads(gps_coordinates)
        except (json.JSONDecodeError, ValueError):
            pass

    now = datetime.now(timezone.utc)
    visit = Visit(
        account_number=account_number,
        initials=performer_initials,
        created_by_uid=performer_uid,
        entered_by_uid=user.firebase_uid,
        visited_at=now,
        access_granted=access_granted,
        verification_outcome=verification_outcome,
        property_type=property_type,
        notes=notes,
        photo_urls=photo_urls,
        gps_coordinates=gps,
        created_at=now,
    )

    db.add(visit)
    db.commit()
    db.refresh(visit)
    return _attach_emails(visit, db)
