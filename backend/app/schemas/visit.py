from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class VisitBase(BaseModel):
    model_config = {"from_attributes": True}

    account_number: str
    initials: Optional[str] = None
    access_granted: Optional[str] = None
    verification_outcome: Optional[str] = None
    property_type: Optional[str] = None
    notes: Optional[str] = None
    photo_urls: Optional[List[str]] = None
    gps_coordinates: Optional[dict] = None
    work_order_id: Optional[str] = None

class VisitCreate(VisitBase):
    pass

class VisitResponse(VisitBase):
    id: int
    visited_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    created_by_uid: Optional[str] = None
    created_by_email: Optional[str] = None