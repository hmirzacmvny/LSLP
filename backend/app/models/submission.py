from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base


class CustomerSubmission(Base):
    __tablename__ = "customer_submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_number = Column(String(20))
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    submitter_name = Column(String(100))
    contact_info = Column(String(100))
    year_constructed = Column(String(10))
    prior_line_work = Column(Boolean)
    prior_line_notes = Column(Text)
    photo_urls = Column(JSONB)
    review_status = Column(String(20), default="Pending")
    reviewed_by = Column(String(50))
    reviewed_at = Column(DateTime(timezone=True))
