from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.outreach import OutreachLog as Outreach
from app.schemas.outreach import OutreachCreate, OutreachResponse

router = APIRouter()

# GET all outreach records — filterable by account_number
@router.get("/", response_model=List[OutreachResponse])
def get_outreach(
    account_number: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Outreach)
    if account_number:
        query = query.filter(Outreach.account_number == account_number)
    return query.order_by(Outreach.account_number, Outreach.attempt_number).all()


# GET single outreach record by id
@router.get("/{outreach_id}", response_model=OutreachResponse)
def get_single_outreach(outreach_id: int, db: Session = Depends(get_db)):
    record = db.query(Outreach).filter(Outreach.id == outreach_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Outreach record not found")
    return record


# POST create new outreach record
@router.post("/", response_model=OutreachResponse)
def create_outreach(payload: OutreachCreate, db: Session = Depends(get_db)):
    # Verify the property exists
    from app.models.property import Property
    prop = db.query(Property).filter(
        Property.account_number == payload.account_number
    ).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # Auto-calculate attempt number
    existing = db.query(Outreach).filter(
        Outreach.account_number == payload.account_number
    ).count()

    payload_dict = payload.model_dump()
    payload_dict.pop("attempted_number", None)  # Remove attempted_number from payload since it's already in the model
    new_record = Outreach(
        **payload_dict,
        attempt_number=existing + 1
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record