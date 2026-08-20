from sqlalchemy import Column, ForeignKey, Index, Integer, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base


class CustomerSubmission(Base):
    __tablename__ = "customer_submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_number = Column(String(20), ForeignKey("properties.account_number"))
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    submitter_name = Column(String(100))
    contact_info = Column(String(100))
    year_constructed = Column(String(20))
    prior_line_work = Column(Boolean)
    prior_line_notes = Column(Text)
    photo_urls = Column(JSONB, server_default="'[]'")
    review_status = Column(String(20), server_default="'Pending'")
    reviewed_by = Column(String(50))
    reviewed_at = Column(DateTime(timezone=True))

    __table_args__ = (
        Index("idx_submissions_account", "account_number"),
    )
