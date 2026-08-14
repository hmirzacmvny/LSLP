from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SubmissionCreate(BaseModel):
    account_number: str
    submitter_name: str
    contact_info: str
    year_constructed: Optional[str] = None
    prior_line_work: Optional[bool] = None
    prior_line_notes: Optional[str] = None
    photo_urls: Optional[List[str]] = None


class SubmissionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    account_number: str
    address: Optional[str] = None
    submitter_name: str
    contact_info: str
    year_constructed: Optional[str] = None
    prior_line_work: Optional[bool] = None
    prior_line_notes: Optional[str] = None
    photo_urls: Optional[List[str]] = None
    submitted_at: Optional[datetime] = None
    review_status: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class SubmissionReview(BaseModel):
    review_status: str
    reviewed_by: str
    verified_material: Optional[str] = None
    notes: Optional[str] = None


class SubmissionCounts(BaseModel):
    pending: int
    approved: int
    rejected: int
