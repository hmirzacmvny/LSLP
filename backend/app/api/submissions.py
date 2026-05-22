import os
from datetime import datetime, timezone
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.property import Property
from app.models.submission import CustomerSubmission
from app.schemas.submission import SubmissionResponse, SubmissionReview
from app.services.auth import require_role
from app.services.storage import save_photo

load_dotenv()

router = APIRouter()


def _verify_portal_key(x_portal_api_key: Optional[str] = Header(None)):
    """API key auth for public portal endpoints — separate from Firebase JWT."""
    portal_key = os.getenv("PORTAL_API_KEY")
    if not portal_key or not x_portal_api_key or x_portal_api_key != portal_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )


# ── Public endpoints (portal API key) ────────────────────────────────────────

@router.get("/property-search")
def portal_property_search(
    search: str = Query(..., min_length=3),
    db: Session = Depends(get_db),
    _=Depends(_verify_portal_key),
):
    """Property search for portal customers — returns address only, no internal fields."""
    results = (
        db.query(Property)
        .filter(
            Property.address.ilike(f"%{search}%")
            | Property.account_number.ilike(f"%{search}%")
        )
        .limit(10)
        .all()
    )
    return [{"account_number": r.account_number, "address": r.address} for r in results]


@router.post("/", response_model=SubmissionResponse)
def create_submission(
    account_number: str = Form(...),
    submitter_name: str = Form(...),
    contact_info: str = Form(...),
    year_constructed: Optional[str] = Form(None),
    prior_line_work: Optional[bool] = Form(None),
    prior_line_notes: Optional[str] = Form(None),
    photos: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    _=Depends(_verify_portal_key),
):
    prop = db.query(Property).filter(Property.account_number == account_number).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    photo_urls = []
    if photos:
        for photo in photos:
            if photo.filename:
                path = save_photo(photo, "customer", account_number)
                photo_urls.append(path)

    submission = CustomerSubmission(
        account_number=account_number,
        submitter_name=submitter_name,
        contact_info=contact_info,
        year_constructed=year_constructed,
        prior_line_work=prior_line_work,
        prior_line_notes=prior_line_notes if prior_line_work else None,
        photo_urls=photo_urls,
        review_status="Pending",
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


# ── Internal endpoints (Firebase JWT + role) ──────────────────────────────────

@router.get("/", response_model=List[SubmissionResponse])
def get_submissions(
    review_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_role(["office_staff", "supervisor", "admin"])),
):
    query = db.query(CustomerSubmission)
    if review_status:
        query = query.filter(CustomerSubmission.review_status == review_status)
    return query.order_by(CustomerSubmission.submitted_at.desc()).all()


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["office_staff", "supervisor", "admin"])),
):
    s = db.query(CustomerSubmission).filter(CustomerSubmission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")
    return s


@router.patch("/{submission_id}/review", response_model=SubmissionResponse)
def review_submission(
    submission_id: int,
    body: SubmissionReview,
    db: Session = Depends(get_db),
    _=Depends(require_role(["office_staff", "supervisor", "admin"])),
):
    s = db.query(CustomerSubmission).filter(CustomerSubmission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")
    s.review_status = body.review_status
    s.reviewed_by = body.reviewed_by
    s.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(s)
    return s
