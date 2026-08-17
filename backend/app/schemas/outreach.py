from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class OutreachCreate(BaseModel):
    account_number: str
    outreach_date: Optional[date] = None
    method: Optional[str] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None
    is_customer_initiated: Optional[bool] = False
    customer_initiated_notes: Optional[str] = None

class OutreachResponse(BaseModel):
    id: int
    account_number: str
    attempt_number: Optional[int] = None
    outreach_date: Optional[date] = None
    method: Optional[str] = None
    outcome: Optional[str] = None
    initials: Optional[str] = None
    notes: Optional[str] = None
    is_customer_initiated: Optional[bool] = False
    customer_initiated_notes: Optional[str] = None
    created_by_uid: Optional[str] = None
    created_by_email: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
