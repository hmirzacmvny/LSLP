from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.visit import Visit
from app.models.property import Property
from app.schemas.visit import VisitCreate, VisitResponse
from app.services.storage import save_photo

router = APIRouter()


# GET all visits — filterable by account_number
@router.get("/", response_model=List[VisitResponse])
def get_visits(
    account_number: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Visit)
    if account_number:
        query = query.filter(Visit.account_number == account_number)
    return query.order_by(Visit.visited_at.desc()).all()


# GET single visit by id
@router.get("/{visit_id}", response_model=VisitResponse)
def get_single_visit(visit_id: int, db: Session = Depends(get_db)):
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return visit


# POST create new visit with optional photo uploads
@router.post("/", response_model=VisitResponse)
def create_visit(
    account_number: str = Form(...),
    initials: Optional[str] = Form(None),
    access_granted: Optional[str] = Form(None),
    verification_outcome: Optional[str] = Form(None),
    property_type: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    photos: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db)
):
    # Verify property exists
    prop = db.query(Property).filter(
        Property.account_number == account_number
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # Save photos if any were uploaded
    photo_urls = []
    if photos:
        for photo in photos:
            if photo.filename:
                path = save_photo(photo, "field", account_number)
                photo_urls.append(path)

    # Create the visit record
    visit = Visit(
        account_number=account_number,
        initials=initials,
        access_granted=access_granted,
        verification_outcome=verification_outcome,
        property_type=property_type,
        notes=notes,
        photo_urls=photo_urls
    )

    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit